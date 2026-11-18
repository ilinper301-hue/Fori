#!/usr/bin/env node
/* Prueba rápida de Fori: arranca la app, dibuja, abre todas las herramientas y comprueba que no hay errores.
   Uso: node tools/test.js (FORI_SOLO=fondos para correr solo las pruebas de fondos)   (necesita Playwright; primero genera index.html con python3 tools/build.py) */
const http=require('http'),fs=require('fs'),path=require('path');
const {chromium}=require('playwright');
const ROOT=path.resolve(__dirname,'..');
const TYPES={'.html':'text/html','.js':'text/javascript','.css':'text/css','.svg':'image/svg+xml','.png':'image/png','.woff':'font/woff','.webmanifest':'application/manifest+json'};
const server=http.createServer((req,res)=>{
  let f=path.join(ROOT,decodeURIComponent(req.url.split('?')[0]));
  if(f.endsWith('/'))f+='index.html';
  fs.readFile(f,(e,d)=>{if(e){res.writeHead(404);res.end();return}res.writeHead(200,{'Content-Type':TYPES[path.extname(f)]||'application/octet-stream'});res.end(d)});
});
// Lee la pizarra guardada (índice 'board2' + un registro por página) con la forma {cur,ids,old,pages}
const readBoard=p=>p.evaluate(()=>new Promise(r=>{const q=indexedDB.open('fori',1);q.onsuccess=()=>{
  const st=q.result.transaction('kv').objectStore('kv'),g=st.get('board2');
  g.onsuccess=()=>{const d=g.result;if(!d||!d.ids.length)return r(null);const out={cur:d.cur,ids:d.ids,old:d.old,w:d.w,n:d.n,pages:[]};let n=d.ids.length;
    d.ids.forEach((id,i)=>{const pg=st.get('page:'+id);pg.onsuccess=()=>{out.pages[i]=pg.result||null;if(!--n)r(out)}})}}}));
const same=(a,b)=>JSON.stringify(a)===JSON.stringify(b);
const fails=[];const ok=(c,m)=>{if(!c)fails.push(m);console.log((c?'  ✓ ':'  ✗ ')+m)};
/* Pruebas de la pizarra: lienzo lógico (nada se encoge ni se mueve al cambiar de tamaño) y borrado real */
async function pizarra(b,url){
  console.log('\nPizarra');
  const ctx=await b.newContext({viewport:{width:1920,height:1080}});
  const p=await ctx.newPage();
  const errs=[];p.on('pageerror',e=>errs.push(e.message));
  p.on('dialog',d=>d.accept());
  await p.goto(url);await p.waitForTimeout(800);
  const kv=k=>p.evaluate(k=>new Promise(r=>{const q=indexedDB.open('fori',1);q.onsuccess=()=>{const g=q.result.transaction('kv').objectStore('kv').get(k);g.onsuccess=()=>r(g.result)}}),k);
  const board=async()=>{await p.waitForTimeout(900);return readBoard(p)};
  const ends=s=>s.pts?[s.pts[0],s.pts[s.pts.length-1]]:[s.a,s.b];
  const near=(a,b,tol=.05)=>Math.abs(a.x-b.x)<=tol&&Math.abs(a.y-b.y)<=tol;
  const logical=(q,v)=>({x:(q.x-v.ox)/v.k,y:(q.y-v.oy)/v.k});
  const drag=async(x0,y0,x1,y1,steps=12)=>{await p.mouse.move(x0,y0);await p.mouse.down();await p.mouse.move(x1,y1,{steps});await p.mouse.up()};
  const tool=t=>p.click(`#left [data-tool=${t}]`);
  const view=async name=>{await p.click((await p.isVisible('#btnView'))?'#btnView':'#mini [data-pop=view]');await p.click(`#pop >> text=${name}`);await p.waitForTimeout(250)};
  const ink=(x,y)=>p.evaluate(([x,y])=>{const c=document.querySelector('#draw'),r=c.getBoundingClientRect(),d=window.devicePixelRatio||1;return c.getContext('2d').getImageData(Math.round((x-r.left)*d),Math.round((y-r.top)*d),1,1).data[3]},[x,y]);

  // 1. Cambiar de modo de pantalla muchas veces no encoge ni mueve lo dibujado
  await drag(1000,600,1400,800);
  let d=await board();const s0=d.pages[0].strokes[0],e0=ends(s0),L0=d.pages[0].size;
  await view('Mínima');
  d=await board();let pg=d.pages[0];
  ok(pg.size.w===L0.w&&pg.size.h===L0.h,'la página conserva su tamaño lógico al cambiar de modo');
  ok(near(logical(ends(pg.strokes[0])[0],pg.v),e0[0])&&near(logical(ends(pg.strokes[0])[1],pg.v),e0[1]),'en modo Mínima el trazo sigue en el mismo punto de la página');
  await view('Completa');
  for(let i=0;i<5;i++){await view('Mínima');await view('Completa')}
  d=await board();pg=d.pages[0];const e1=ends(pg.strokes[0]);
  ok(near(e1[0],e0[0])&&near(e1[1],e0[1])&&Math.abs(pg.strokes[0].size-s0.size)<.001,`tras 6 idas y vueltas el trazo está igual (${e1[0].x.toFixed(2)},${e1[0].y.toFixed(2)})`);
  // deshacer después de cambiar de tamaño devuelve las cosas a su sitio
  await tool('select');await drag(1200,700,1300,760,6);
  await view('Mínima');await p.click('#mini [aria-label=Deshacer]');await view('Completa');
  d=await board();ok(near(ends(d.pages[0].strokes[0])[0],e0[0],.1),'deshacer un movimiento después de cambiar de modo lo deja en su sitio');

  // 2. Borrado real: corta el trazo y no deja trazos «borrador»
  await p.click('#pageLbl');await p.click('#pop >> text=Página nueva');
  await tool('pen');await drag(600,300,1200,300,20);
  await tool('eraser');await drag(900,200,900,400,10);
  d=await board();let st=d.pages[1].strokes;
  ok(st.length===2&&st.every(s=>s.tool==='pen'),'el borrador parte el trazo en dos y no añade nada');
  const xs=st.map(s=>s.pts.map(q=>q.x)),izq=Math.max(...(Math.min(...xs[0])<Math.min(...xs[1])?xs[0]:xs[1])),der=Math.min(...(Math.min(...xs[0])<Math.min(...xs[1])?xs[1]:xs[0]));
  ok(der-izq>20&&der-izq<50,`el hueco mide lo que el borrador (${(der-izq).toFixed(1)} px)`);
  ok(await ink(900,300)===0&&await ink(700,300)>0&&await ink(1100,300)>0,'en pantalla falta justo el trozo borrado');
  await p.click('#btnUndo');d=await board();ok(d.pages[1].strokes.length===1,'deshacer recupera el trazo entero');
  await p.click('#btnRedo');d=await board();ok(d.pages[1].strokes.length===2,'rehacer vuelve a borrarlo');
  // mover uno de los trozos: lo borrado no se queda atrás tapando
  await tool('select');await drag(700,300,700,500,6);
  ok(await ink(700,500)>0&&await ink(700,300)===0,'al mover un trozo, se mueve entero');
  // pasar el borrador por un sitio vacío no cambia nada
  await tool('eraser');await drag(300,800,500,800,5);
  d=await board();ok(d.pages[1].strokes.length===2,'borrar en vacío no cambia la página');
  // formas: sin relleno se cortan; con relleno se borran enteras
  await p.click('#left [data-tool=shape]');await p.click('#pop [aria-label=Rectángulo]');await drag(1300,500,1600,700,6);
  await tool('eraser');await drag(1450,450,1450,560,8);
  d=await board();st=d.pages[1].strokes;
  ok(st.length===3&&st.every(s=>s.type==='free'),'una forma sin relleno se corta por donde pasa el borrador');
  ok(await ink(1450,500)===0&&await ink(1450,700)>0&&await ink(1300,600)>0,'el resto del rectángulo sigue dibujado');
  await p.click('#left [data-tool=shape]');await p.click('#pop >> text=Sin relleno');await p.click('#pop [aria-label=Círculo]');await drag(300,500,500,700,6);
  d=await board();ok(d.pages[1].strokes.length===4,'se dibuja un círculo con relleno');
  await tool('eraser');await drag(380,590,420,610,4);
  d=await board();ok(d.pages[1].strokes.length===3,'una forma con relleno se borra entera');
  await p.click('#left [data-tool=shape]');await p.click('#pop >> text=Con relleno');await p.mouse.click(1000,900);
  // texto: se borra entero
  await tool('text');await p.mouse.click(300,850);await p.keyboard.type('Hola');await tool('pen');
  d=await board();ok(d.pages[1].strokes.some(s=>s.type==='text'),'se escribe un texto');
  await tool('eraser');await drag(310,870,360,870,4);
  d=await board();ok(!d.pages[1].strokes.some(s=>s.type==='text'),'el texto se borra entero');

  // 3. Lección guardada en otro modo de pantalla: coordenadas lógicas, y al abrirla todo está en su sitio
  await p.click('#dock [aria-label="Página anterior"]');await view('Mínima');
  await p.click('#mini [data-pop=view]');await p.click('#pop >> text=Libre');await p.waitForTimeout(250);
  await p.keyboard.press('Escape');await p.waitForTimeout(250); // Escape en modo Libre vuelve a Completa
  await view('Mínima');
  // se guarda estando en Mínima (la vista no es 1:1): el menú Página no está, se usa el atajo del panel de lecciones al volver
  await view('Completa');
  await p.click('#pageLbl');await p.click('#pop >> text=Guardar como lección');await p.waitForTimeout(600);
  const les=await kv('lessons');const lp=les&&les[0]&&await kv('lesson:'+les[0].id);
  ok(!!lp&&lp.length===2&&near(ends(lp[0].strokes[0])[0],e0[0],.1)&&lp[0].v===undefined,'la lección guarda las coordenadas de la página, sin vista');

  // 4. Datos del formato anterior (sin vista), hechos en otra pantalla: se ven enteros, centrados y sin deformar
  await p.evaluate(()=>new Promise(r=>{__fori.BD.ready=false;const q=indexedDB.open('fori',1);q.onsuccess=()=>{const t=q.result.transaction('kv','readwrite');
    t.objectStore('kv').clear();t.objectStore('kv').put({cur:0,pages:[{bg:'grid',img:null,size:{w:1000,h:500},strokes:[{type:'free',tool:'pen',color:'ink',size:6,pts:[{x:100,y:100},{x:900,y:400}]}]}]},'board');t.oncomplete=()=>r()}}));
  await p.reload();await p.waitForTimeout(900);
  d=await board();pg=d.pages[0];
  const W=await p.evaluate(()=>document.querySelector('#stage').clientWidth),H=await p.evaluate(()=>document.querySelector('#stage').clientHeight),k=Math.min(W/1000,H/500);
  ok(pg.size.w===1000&&Math.abs(pg.v.k-k)<1e-6&&near(ends(pg.strokes[0])[0],{x:100*k+(W-1000*k)/2,y:100*k+(H-500*k)/2},.01),'una página hecha en otra pantalla se adapta centrada');
  ok(Math.abs(pg.strokes[0].size-6*k)<.01,'el grosor acompaña a la escala');
  await p.reload();await p.waitForTimeout(900);
  const d2=await board();
  ok(near(ends(d2.pages[0].strokes[0])[1],ends(pg.strokes[0])[1],.001),'recargar no mueve nada');

  // 5. Dos dedos a la vez: terminar un trazo no hace desaparecer el que otro sigue dibujando
  const cdp=await ctx.newCDPSession(p);
  const touch=(type,pts)=>cdp.send('Input.dispatchTouchEvent',{type,touchPoints:pts.map(([id,x,y])=>({id,x,y}))});
  await p.click('#pageLbl');await p.click('#pop >> text=Página nueva');await tool('pen');
  await touch('touchStart',[[1,400,300]]);await touch('touchMove',[[1,500,300]]);await touch('touchMove',[[1,600,300]]);
  await touch('touchStart',[[1,600,300],[2,1200,600]]);await touch('touchMove',[[1,600,300],[2,1300,600]]);
  await touch('touchEnd',[[1,600,300]]);await p.waitForTimeout(100);
  ok(await ink(1250,600)>0,'el trazo del otro dedo sigue en pantalla');
  await touch('touchEnd',[]);
  ok(errs.length===0,'sin errores en la pizarra'+(errs.length?': '+errs.join(' | '):''));
  await ctx.close();
}
/* Pruebas del guardado: una página por registro, imágenes aparte, paso desde el formato anterior sin perder nada */
async function guardado(b,url){
  console.log('\nGuardado por página');
  const ctx=await b.newContext({viewport:{width:1920,height:1080}});
  const p=await ctx.newPage();
  const errs=[];p.on('pageerror',e=>errs.push(e.message));
  p.on('dialog',d=>d.accept());
  await p.goto(url);await p.waitForTimeout(800);
  const drag=async(x0,y0,x1,y1,steps=8,pg=p)=>{await pg.mouse.move(x0,y0);await pg.mouse.down();await pg.mouse.move(x1,y1,{steps});await pg.mouse.up()};
  const board=async(pg=p)=>{await pg.waitForTimeout(900);return readBoard(pg)};
  const menu=async t=>{await p.click('#pageLbl');await p.click(`#pop >> text=${t}`);await p.waitForTimeout(150)};
  // lo que hay en el almacén: clave -> tipo ('blob:image/png', 'text', 'obj')
  const store=(pg=p)=>pg.evaluate(()=>new Promise(r=>{const q=indexedDB.open('fori',1);q.onsuccess=()=>{const st=q.result.transaction('kv').objectStore('kv'),a=st.getAllKeys(),v=st.getAll();
    v.onsuccess=()=>r(Object.fromEntries(a.result.map((k,i)=>[k,v.result[i] instanceof Blob?'blob:'+v.result[i].type:typeof v.result[i]==='string'?'text':'obj'])))}}));
  const put=(k,v,pg=p)=>pg.evaluate(([k,v])=>new Promise(r=>{const q=indexedDB.open('fori',1);q.onsuccess=()=>{const t=q.result.transaction('kv','readwrite');v===null?t.objectStore('kv').delete(k):t.objectStore('kv').put(v,k);t.oncomplete=()=>r()}}),[k,v]);
  const mem=(pg=p)=>pg.evaluate(()=>({cur:__fori.cur,pages:__fori.pages.map(q=>({id:q.id,strokes:q.strokes,bg:q.bg,img:q.img,size:q.size,v:q.v,ch:q.ch}))}));
  const imgs=o=>Object.keys(o).filter(k=>k.startsWith('img:'));
  const same=(a,b)=>JSON.stringify(a)===JSON.stringify(b);
  // imágenes de prueba (con ruido, para que pesen): PNG y JPEG
  const pic=type=>p.evaluate(type=>{const c=document.createElement('canvas');c.width=c.height=160;const x=c.getContext('2d'),d=x.createImageData(160,160);
    for(let i=0;i<d.data.length;i++)d.data[i]=i%4===3?255:Math.random()*256;x.putImageData(d,0,0);return c.toDataURL(type,.8)},type);
  const png=await pic('image/png'),jpg=await pic('image/jpeg');

  // 1. Cada página en su registro y la imagen aparte, como Blob
  await drag(600,400,900,500);
  await p.setInputFiles('input[type=file][accept="image/*"]:not([capture]):not(#bgFile)',{name:'foto.png',mimeType:'image/png',buffer:Buffer.from(png.split(',')[1],'base64')});
  await p.waitForTimeout(400);
  await menu('Página nueva');await p.click('#left [data-tool=pen]');await drag(500,300,700,350);
  let d=await board(),s=await store(),m0=await mem();
  const cmp=m=>m.pages.map(q=>[q.strokes,q.bg,q.img,q.size]);
  ok(d&&d.ids.length===2&&d.pages.every(Boolean)&&d.cur===1,'el índice tiene dos páginas, cada una con su registro');
  const im=d.pages[0].strokes.find(q=>q.type==='img');
  ok(!!im&&/^img:/.test(im.src)&&s[im.src]==='blob:image/png'&&imgs(s).length===1,'la imagen se guarda aparte, como Blob, y la página solo lleva la referencia');
  ok(!('board' in s),'no se escribe la clave del formato anterior');
  ok(m0.pages[0].strokes.find(q=>q.type==='img').src.startsWith('data:image/png;base64,'),'en memoria la imagen sigue siendo la de siempre');
  // escribir en la página 2 no reescribe la 1 ni la imagen
  await put('page:'+d.ids[0],{...d.pages[0],marca:1});
  await drag(500,500,700,550);
  d=await board();s=await store();
  ok(d.pages[0].marca===1&&d.pages[1].strokes.length===2&&imgs(s).length===1,'escribir en una página no reescribe las demás ni las imágenes');
  // recargar: todo vuelve igual, y la imagen es exactamente la misma
  m0=await mem();
  await p.reload();await p.waitForTimeout(900);
  const m1=await mem();
  ok(same(cmp(m1),cmp(m0))&&m1.pages[0].strokes.some(q=>q.type==='img'&&q.src.startsWith('data:image/png;base64,'))&&m1.cur===1,'al recargar la pizarra vuelve igual (páginas, trazos, imagen y página en la que se estaba)');
  // duplicar la página de la imagen no guarda la imagen otra vez
  await p.click('#dock [aria-label="Página anterior"]');await menu('Duplicar esta página');
  d=await board();s=await store();
  ok(d.ids.length===3&&imgs(s).length===1&&d.pages[1].strokes.some(q=>q.type==='img'&&q.src===im.src),'una imagen repetida se guarda una sola vez');
  // borrar la página quita su registro; deshacer lo vuelve a poner
  const gone=d.ids[1];
  await menu('Borrar esta página');d=await board();s=await store();
  ok(d.ids.length===2&&!('page:'+gone in s),'borrar una página borra su registro');
  await p.click('#toast button');d=await board();s=await store();
  ok(d.ids.length===3&&('page:'+gone in s)&&d.pages[1].strokes.some(q=>q.type==='img'),'deshacer el borrado la vuelve a guardar');

  // 2. Lecciones: mismo formato de siempre (imagen dentro), y al abrirlas la pizarra se guarda bien
  await menu('Guardar como lección');await p.waitForTimeout(600);
  const kv=k=>p.evaluate(k=>new Promise(r=>{const q=indexedDB.open('fori',1);q.onsuccess=()=>{const g=q.result.transaction('kv').objectStore('kv').get(k);g.onsuccess=()=>r(g.result)}}),k);
  const les=await kv('lessons'),lp=les&&les[0]&&await kv('lesson:'+les[0].id);
  ok(!!lp&&lp.length===3&&lp[0].strokes.find(q=>q.type==='img').src===m0.pages[0].strokes.find(q=>q.type==='img').src&&lp[0].id===undefined,'la lección se guarda como antes, con la imagen dentro');

  // abrir la lección: páginas nuevas, la misma imagen (no se guarda otra vez) y al recargar sigue todo
  await menu('Mis lecciones');await p.click('.les-item >> text=Abrir');
  d=await board();s=await store();
  ok(d.ids.length===3&&!d.ids.includes(gone)&&imgs(s).length===1&&d.pages[0].strokes.some(q=>q.type==='img'&&q.src===im.src),'abrir una lección guarda sus páginas sin repetir la imagen');
  await p.reload();await p.waitForTimeout(900);
  ok(same(cmp(await mem()).map(q=>q[0].length),lp.map(q=>q.strokes.length)),'y al recargar la lección abierta sigue ahí');

  // 3. Paso desde el formato anterior: imagen de fondo, imagen insertada, ficha de Charta e imagen que no es base64
  const [W,H]=await p.evaluate(()=>[document.querySelector('#stage').clientWidth,document.querySelector('#stage').clientHeight]);
  const chCss=(k,n)=>k>=n?'':'.cs{visibility:hidden}'+(k>0?Array.from({length:k},(_,i)=>'.p'+i).join(',')+'{visibility:visible}':'');
  const chImg=ch=>'data:image/svg+xml;charset=utf-8,'+encodeURIComponent(ch.svg.replace('/*PASOS*/',chCss(ch.k,ch.n))).replace(/[()']/g,c=>'%'+c.charCodeAt(0).toString(16).toUpperCase());
  const ch={svg:'<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 400 200"><style>/*PASOS*/</style><text x="10" y="40">2 + 3 =</text><text class="cs p0" x="150" y="40">5</text><text class="cs p1" x="10" y="90">(bien)</text>'+'<!--'+'x'.repeat(3000)+'-->'+'</svg>',n:2,k:1};
  const svgBg='data:image/svg+xml;charset=utf-8,'+encodeURIComponent('<svg xmlns="http://www.w3.org/2000/svg" width="40" height="40"><circle cx="20" cy="20" r="18" fill="red"/><!--'+'y'.repeat(3000)+'--></svg>');
  const trazo={type:'free',tool:'pen',color:'#e03131',size:6,pts:[{x:100,y:100},{x:400,y:300}]};
  const foto={type:'img',src:png,x:500,y:200,w:160,h:160};
  const viejo={cur:1,pages:[
    {bg:'grid',img:jpg,size:{w:W,h:H},v:{k:1,ox:0,oy:0},ch:null,strokes:[foto,trazo]},
    {bg:'plain',img:chImg(ch),size:{w:W,h:H},v:{k:1,ox:0,oy:0},ch,strokes:[trazo]},
    {bg:'dots',img:svgBg,size:{w:W,h:H},v:{k:1,ox:0,oy:0},ch:null,strokes:[{...foto,x:50},{type:'text',x:300,y:300,text:'Hola',fs:48,color:'ink'}]}]};
  const limpio=m=>m.pages.map(q=>({bg:q.bg,img:q.img,size:q.size,v:q.v,ch:q.ch,strokes:q.strokes}));
  await p.evaluate(v=>new Promise(r=>{__fori.BD.ready=false;const q=indexedDB.open('fori',1);q.onsuccess=()=>{const t=q.result.transaction('kv','readwrite');
    t.objectStore('kv').clear();t.objectStore('kv').put(v,'board');t.oncomplete=()=>r()}}),viejo);
  await p.reload();await p.waitForTimeout(900);
  let m=await mem();
  ok(same(limpio(m),viejo.pages)&&m.cur===1,'la pizarra del formato anterior se abre igual, sin perder nada');
  d=await board();s=await store();
  ok(d&&d.ids.length===3&&d.pages.every(Boolean)&&typeof d.old==='number','se pasa al formato nuevo en el primer guardado');
  ok(s.board==='obj','la pizarra antigua se conserva de momento como copia de seguridad');
  ok(/^img:/.test(d.pages[0].img)&&s[d.pages[0].img]==='blob:image/jpeg'&&imgs(s).length===2&&d.pages[0].strokes[0].src===d.pages[2].strokes[0].src,'el fondo y la imagen pasan a Blob (la imagen repetida, una sola vez)');
  ok(d.pages[1].img==='ch:'&&d.pages[1].ch.k===1,'la ficha de Charta no se guarda dos veces: se regenera a partir de sus datos');
  ok(d.pages[2].img===svgBg,'una imagen que no es base64 se queda tal cual dentro de la página');
  await p.reload();await p.waitForTimeout(900);m=await mem();
  ok(same(limpio(m),viejo.pages)&&m.cur===1,'al recargar ya desde el formato nuevo todo sigue igual');
  // la barra Solución sigue funcionando y se guarda el paso
  await p.click('#chbar [aria-label="Mostrar el paso siguiente"]');
  d=await board();ok(d.pages[1].ch.k===2&&d.pages[1].img==='ch:','el paso de la solución se guarda');
  await p.reload();await p.waitForTimeout(900);m=await mem();
  ok(m.pages[1].img===chImg({...ch,k:2})&&same(limpio(m)[0],viejo.pages[0]),'y al recargar la ficha sale con ese paso');

  // 4. Limpieza al arrancar: lo que ya no usa nadie se borra; lo demás, no. La copia antigua se borra pasada una semana
  d=await board();
  await p.evaluate(()=>{__fori.BD.ready=false});
  await put('page:huerfana',{strokes:[],bg:'plain'});await put('img:huerfana','data:image/png;base64,AAAA');
  await p.reload();await p.waitForTimeout(6500);s=await store();
  ok(!('page:huerfana' in s)&&!('img:huerfana' in s)&&imgs(s).length===2&&d.ids.every(id=>'page:'+id in s)&&s.board==='obj','la limpieza borra solo lo que no se usa');
  await p.evaluate(()=>{__fori.BD.ready=false});
  d=await board();
  await p.evaluate(()=>new Promise(r=>{const q=indexedDB.open('fori',1);q.onsuccess=()=>{const t=q.result.transaction('kv','readwrite'),st=t.objectStore('kv'),g=st.get('board2');
    g.onsuccess=()=>st.put({...g.result,old:Date.now()-8*864e5},'board2');t.oncomplete=()=>r()}}));
  await p.reload();await p.waitForTimeout(6500);s=await store();d=await board();
  ok(!('board' in s)&&d.old===null&&d.ids.length===3&&imgs(s).length===2,'pasada una semana se borra la copia antigua y nada más');
  await p.reload();await p.waitForTimeout(900);m=await mem();
  ok(same(limpio(m)[0],viejo.pages[0])&&same(limpio(m)[2],viejo.pages[2]),'después de la limpieza la pizarra sigue entera');

  // 5. Dos ventanas de Fori a la vez: vale lo de la última que guarda, entero (páginas e imágenes)
  const p2=await ctx.newPage();p2.on('pageerror',e=>errs.push(e.message));
  await p2.goto(url);await p2.waitForTimeout(900);
  await p2.click('#pageLbl');await p2.click('#pop >> text=Borrar esta página');await p2.waitForTimeout(1000); // la otra ventana borra la ficha
  const d2=await board(p2);
  await put(d.pages[0].img,null); // como si la otra ventana hubiera limpiado una imagen que esta todavía usa
  await p.bringToFront();await p.click('#dock [aria-label="Página siguiente"]');await p.click('#left [data-tool=pen]');await drag(900,600,1100,700);
  d=await board();s=await store();
  ok(d2.ids.length===2&&d.ids.length===3&&d.pages.every(Boolean)&&d.pages[0].img in s&&d.pages[0].strokes[0].src in s,'si otra ventana ha guardado, esta lo vuelve a escribir todo');
  await p2.close();
  await p.reload();await p.waitForTimeout(900);m=await mem();
  ok(same(limpio(m)[0],viejo.pages[0])&&m.pages.length===3&&m.pages[2].strokes.length===3,'y al recargar está todo, con la imagen');

  // 6. Si un guardado falla, no se pierde nada: lo guardado queda como estaba y se reintenta
  d=await board();
  await p.evaluate(()=>{const o=IDBObjectStore.prototype.put;let n=0;IDBObjectStore.prototype.put=function(...a){if(n++<1)throw new DOMException('lleno','QuotaExceededError');return o.apply(this,a)}});
  await drag(900,800,1100,850);
  let mid=await board();
  ok(same(mid,d),'tras un guardado fallido, lo guardado sigue como estaba');
  await p.waitForTimeout(3500);d=await board();
  ok(d.pages[2].strokes.length===4&&await p.evaluate(()=>__fori.BD.fails===0&&!__fori.BD.pend),'el reintento lo guarda');
  // fallo al terminar la transacción (por ejemplo, almacenamiento lleno): se cancela entera y el reintento lo escribe todo
  await p.evaluate(()=>{const o=IDBDatabase.prototype.transaction;let n=0;IDBDatabase.prototype.transaction=function(...a){const t=o.apply(this,a);
    if(a[1]==='readwrite'&&n++<1){const q=t.objectStore('kv').get('nada');q.onsuccess=()=>t.abort()}return t}});
  await drag(900,900,1100,950);
  mid=await board();
  ok(same(mid,d),'si la transacción se cancela, no queda nada a medias');
  await p.waitForTimeout(3500);d=await board();s=await store();
  ok(d.pages[2].strokes.length===5&&d.pages.every(Boolean)&&await p.evaluate(()=>__fori.BD.fails===0&&!__fori.BD.pend),'el reintento lo vuelve a escribir todo');
  ok(s[d.pages[0].img]==='text','en ese reintento las imágenes van como texto, por si el navegador no admite Blob');
  await p.reload();await p.waitForTimeout(900);m=await mem();
  ok(same(limpio(m)[0],viejo.pages[0])&&m.pages[2].strokes.length===5,'y se leen igual de bien');
  ok(errs.length===0,'sin errores en el guardado'+(errs.length?': '+errs.join(' | '):''));
  await ctx.close();
}
/* Registro de herramientas: la barra derecha, el menú Matemáticas, la bandeja y «Reiniciar» salen del registro (REG.tools) */
async function registro(b,url){
  console.log('\nRegistro de herramientas');
  const ctx=await b.newContext({viewport:{width:1920,height:1080}});
  const p=await ctx.newPage();
  const errs=[];p.on('pageerror',e=>errs.push(e.message));
  await p.goto(url);await p.waitForTimeout(800);
  const MATES={'Regla':'ruler','Transportador':'prot','Base 10':'b10','Reloj':'clock'};
  const mates=async l=>{await p.click('#btnTools');await p.click(`#pop [data-tid=${MATES[l]}]`);await p.waitForTimeout(80)};
  const wc=()=>p.evaluate(()=>[...document.querySelectorAll('.win')].pop().style.getPropertyValue('--wc'));
  const n=sel=>p.locator(sel).count();

  // 1. Lo que hay apuntado está completo
  const reg=await p.evaluate(()=>__fori.REG.tools.map(t=>({id:t.id,group:t.group,icon:t.icon,label:t.label,hidden:!!t.hidden,hace:typeof(t.build||t.run),ico:!!t.hidden||!!document.querySelector('#i-'+t.icon)})));
  ok(reg.length>=24&&new Set(reg.map(t=>t.id)).size===reg.length,`hay ${reg.length} herramientas apuntadas y ninguna repetida`);
  ok(reg.every(t=>t.id&&['aula','apoyo','mates'].includes(t.group)&&t.hace==='function'&&(t.hidden||(t.icon&&t.label))),'cada una tiene id, grupo, icono, texto y algo que hacer');
  ok(reg.every(t=>t.ico),'todos sus iconos existen'+(reg.every(t=>t.ico)?'':': '+reg.filter(t=>!t.ico).map(t=>t.id).join()));

  // 2. Quien usa la pizarra ve lo de siempre: mismos botones, mismo orden
  const rail=await p.$$eval('#right > *',es=>es.map(e=>e.className==='sep'?'|':(e.dataset.win||'-')+':'+e.textContent.trim()).join(' '));
  ok(rail==='picker:Elegir groups:Grupos roles:Encargados sched:Horario asam:Asamblea sema:Semáforo timer:Tiempo noise:Ruido score:Puntos | spot:Foco -:Nota -:Herramientas','la barra derecha tiene los botones de siempre, en su orden, y al final el del cajón');
  await p.click('#btnTools');
  const menu=await p.$$eval('#pop .popsep.grp, #pop .tile',es=>es.map(e=>e.classList.contains('tile')?e.textContent.trim():'['+e.textContent.trim()+']').join(', '));await p.mouse.click(600,600);
  ok(menu==='[Aula], Elegir, Grupos, Encargados, Horario, Asamblea, Semáforo, Tiempo, Ruido, Puntos, [Apoyo], Foco, Nota, [Matemáticas], Base 10, Reloj, Regla, Dinero, Regletas, Tangram, Transportador, Recta numérica, Fracciones, Tabla del 100, Dados, Geoplano','el cajón tiene todas las herramientas por grupos, en su orden');

  // 3. El color de la ventana sale del grupo
  await p.click('#right [data-win=timer]');const cAula=await wc();await p.click('#right [data-win=timer]');
  await mates('Reloj');const cMates=await wc();await mates('Reloj');
  await p.click('#pageLbl');await p.click('#pop >> text=Mis lecciones');const cOtra=await wc();await p.click('.win .x[aria-label=Cerrar]');
  ok(cAula==='var(--yellow)'&&cMates==='var(--coral)'&&cOtra==='var(--teal)','ventanas del aula en amarillo, de matemáticas en coral y el resto en verde');

  // 4. Los pictogramas sustituyen a encargados y horario sin duplicar el botón
  await p.click('#right [data-win=roles]');const conP=await n('.win .rrow.p');await p.click('#right [data-win=roles]');
  ok(conP>0&&reg.filter(t=>t.id==='roles'||t.id==='sched').length===2,'encargados se abre en su versión con pictogramas');

  // 5. Bandeja: regla y transportador se esconden y vuelven; una ventana se minimiza
  await mates('Regla');await mates('Transportador');await mates('Base 10');
  ok(await n('#tray button')===3&&await n('.ruler')===1&&await n('.prot')===1,'la bandeja muestra las tres herramientas de matemáticas abiertas');
  ok((await p.$$eval('#tray button',bs=>bs.map(b=>b.textContent.trim()).join())==='Base 10,Regla,Transportador'),'en el orden del menú');
  await p.locator('#tray button',{hasText:'Regla'}).click();
  ok(await p.isHidden('.ruler')&&await p.isVisible('.prot'),'un toque en la bandeja esconde la regla');
  await p.locator('#tray button',{hasText:'Regla'}).click();
  await p.locator('#tray button',{hasText:'Base 10'}).click();
  ok(await p.isVisible('.ruler')&&await p.isHidden('.win'),'otro toque la devuelve; y la ventana de Base 10 se minimiza');
  await p.locator('#tray button',{hasText:'Base 10'}).click();
  await p.click('.ruler [aria-label="Ajustes de la regla"]');
  ok(await wc()==='var(--coral)'&&await n('#tray button')===3,'los ajustes de la regla son una ventana de matemáticas sin botón propio');

  // 6. «Reiniciar» quita todo lo que cada herramienta ha puesto
  await p.locator('#right button',{hasText:'Nota'}).click();await p.locator('#right button',{hasText:'Nota'}).click();
  await p.click('#right [data-win=picker]');await p.click('#right [data-win=spot]');
  ok(await n('.note')===2&&await p.isVisible('#spot')&&await p.evaluate(()=>document.querySelector('#right [data-win=spot]').classList.contains('on')),'notas y foco puestos (el botón del foco queda marcado)');
  await p.locator('#dock button',{hasText:'Reiniciar'}).dispatchEvent('click');await p.waitForTimeout(150);
  ok(await n('.win')===0&&await n('.ruler')===0&&await n('.prot')===0&&await n('.note')===0&&await p.isHidden('#spot')&&await p.isHidden('#tray')&&await n('[data-win].on')===0,'«Reiniciar» lo quita todo: ventanas, regla, transportador, notas y foco');

  // 7. Lo que depende de la página se actualiza al cambiar de página (sin parchear updatePageUI)
  await p.click('#dock [data-pop=bg]');await p.click('#pop >> text=Cuadrícula');
  await p.click('#pageLbl');await p.click('#pop >> text=Página nueva');
  await p.click('#dock [data-pop=bg]');await p.click('#pop >> text=Puntos');
  const b2=await p.textContent('#bgBtn');
  await p.click('#dock [aria-label="Página anterior"]');
  ok(/Puntos/.test(b2)&&/Cuadrícula/.test(await p.textContent('#bgBtn'))&&(await p.textContent('#pageLbl')).includes('1/2'),'la etiqueta del fondo sigue a la página');
  ok(await p.isHidden('#chbar'),'la barra Solución no aparece en páginas que no son de Charta');
  // cambiar de clase vuelve a abrir las ventanas que dependen de los alumnos
  await p.evaluate(()=>{const k='fori-v1',s=JSON.parse(localStorage.getItem(k));s.classes=[{name:'A',students:['Ana','Luis'],roles:['Luz'],offset:0},{name:'B',students:['Eva','Hugo'],roles:['Agua'],offset:0}];s.cls=0;s.students=s.classes[0].students;s.roles=s.classes[0].roles;localStorage.setItem(k,JSON.stringify(s))});
  await p.reload();await p.waitForTimeout(800);
  await p.click('#right [data-win=roles]');await p.click('#clsChip');await p.click('#pop >> text=B');await p.waitForTimeout(100);
  ok(await n('.win')===1&&(await p.textContent('.win .body')).includes('Agua')&&(await p.textContent('.win .body')).includes('Eva'),'al cambiar de clase, la ventana de encargados se vuelve a abrir con la clase nueva');
  ok(errs.length===0,'sin errores en el registro'+(errs.length?': '+errs.join(' | '):''));
  await ctx.close();
}
/* Pantallas pequeñas y cajón de herramientas: en ningún tamaño se corta nada, y las favoritas se eligen con pulsación larga */
async function pantallas(b,url){
  console.log('\nPantallas pequeñas y cajón');
  const errs=[];
  // abre Fori en una pantalla de w×h; «ini» son ajustes guardados de antes (solo se ponen la primera vez, no al recargar)
  const abrir=async(w,h,ini)=>{
    const ctx=await b.newContext({viewport:{width:w,height:h}});const p=await ctx.newPage();p.on('pageerror',e=>errs.push(`${w}x${h}: ${e.message}`));
    if(ini)await p.addInitScript(x=>{if(!sessionStorage.getItem('ini')){sessionStorage.setItem('ini','1');localStorage.setItem('fori-v1',JSON.stringify(x))}},ini);
    await p.goto(url);await p.waitForTimeout(700);return p};
  // cómo ha quedado colocada la interfaz: qué botones se salen de su barra o de la pantalla, favoritas a la vista, tamaño de la pizarra
  const est=p=>p.evaluate(()=>{const q=s=>document.querySelector(s),R=e=>e.getBoundingClientRect(),st=R(q('#stage'));const sj=q('#subject');sj.style.display='inline-block';sj.textContent='Ahora: Conocimiento del Medio'; /* peor caso: con clase en curso la barra de arriba lleva también la asignatura */
    const cut=sel=>{const c=q(sel);if(getComputedStyle(c).display==='none')return null;const cr=R(c);
      return [...c.querySelectorAll('button,.sw')].filter(e=>{const r=R(e);return r.width&&r.height&&(r.right>Math.min(innerWidth,cr.right)+1||r.bottom>Math.min(innerHeight,cr.bottom)+1||r.left<cr.left-1||r.top<cr.top-1)}).map(e=>e.textContent.trim()||e.getAttribute('aria-label')||e.title||e.className)};
    const vis=s=>[...document.querySelectorAll(s)].filter(e=>e.getBoundingClientRect().width>0);
    return {lay:document.body.dataset.lay,w:Math.round(st.width),h:Math.round(st.height),izq:cut('#left'),der:cut('#right'),abajo:cut('#dock'),arriba:cut('#top'),
      favs:vis('#right [data-fav]').map(e=>e.dataset.fav),sz:vis('#left .sz').length,szc:vis('#left .szc').length,rec:vis('#recent .sw').length,rot:vis('#left .tool small').length,
      stage:[st.left,st.top,st.right,st.bottom].map(Math.round),leftTop:Math.round(R(q('#left')).top)}});
  const entero=e=>['izq','der','abajo','arriba'].every(k=>e[k]===null||e[k].length===0);
  const cortes=e=>['izq','der','abajo','arriba'].filter(k=>e[k]&&e[k].length).map(k=>k+': '+e[k].join(', ')).join(' · ');
  const cajon=async p=>{if(await p.isHidden('#pop'))await p.locator('[data-pop=tools]:visible').first().click();await p.waitForTimeout(120)};
  const dentro=(p,sel)=>p.evaluate(s=>{const r=document.querySelector(s).getBoundingClientRect();return r.left>=0&&r.top>=0&&r.right<=innerWidth+.5&&r.bottom<=innerHeight+.5},sel);
  const larga=async(p,id)=>{await cajon(p);await p.hover(`#pop [data-tid=${id}]`);await p.mouse.down();await p.waitForTimeout(800);await p.mouse.up();await p.waitForTimeout(120)};
  const guardadas=p=>p.evaluate(()=>JSON.parse(localStorage.getItem('fori-v1')||'{}').favs);
  const aviso=p=>p.textContent('#toast');
  const DE_SIEMPRE=['picker','groups','roles','sched','asam','sema','timer','noise','score','spot','note'];

  // 1. PDI (1920×1080): todo como estaba, salvo que Matemáticas ya no está abajo y hay un botón «Herramientas»
  let p=await abrir(1920,1080),e=await est(p);
  ok(e.lay==='d0'&&entero(e)&&e.sz===3&&e.szc===0&&e.rec===6,'PDI: las barras salen enteras, con los tres grosores y los seis colores recientes');
  ok(e.favs.join()===DE_SIEMPRE.join(),'PDI: sin tocar nada, en la barra derecha están las once herramientas de siempre');
  ok(await p.locator('[data-pop=math]').count()===0&&await p.isVisible('#btnTools')&&await p.isHidden('#dock .d-tools'),'PDI: «Matemáticas» ya no está abajo; el cajón se abre desde la barra derecha');
  // accesos a las otras apps, arriba: Lectori, Barri, Calculi y Lexi (con su icono, que se carga y está en la caché sin conexión)
  const apps=await p.$$eval('#top a.appbtn',as=>as.map(a=>[a.title,a.href,a.querySelector('img').naturalWidth]));
  ok(apps.map(x=>x[0]).join()==='Abrir Lectori,Abrir Barri,Abrir Calculi,Abrir Lexi'&&/\/Calculi\/$/.test(apps[2][1])&&/\/Lexi\/$/.test(apps[3][1])&&apps.every(x=>x[2]>0),'arriba están los accesos a Lectori, Barri, Calculi y Lexi, con su icono');
  ok(['calculi','lexi'].every(n=>require('fs').readFileSync(ROOT+'/sw.js','utf8').includes("'./apps/"+n+".png'")),'los iconos de Calculi y Lexi están en la caché sin conexión');
  await cajon(p);
  ok(await p.locator('#pop .tile').count()===23&&await p.locator('#pop .tile.fav').count()===11&&await dentro(p,'#pop'),'el cajón enseña las 23 herramientas y marca con estrella las once de la barra');
  // un toque abre la herramienta y cierra el cajón; al volver a abrirlo, sale marcada
  await p.click('#pop [data-tid=ruler]');
  ok(await p.locator('.ruler').count()===1&&await p.isHidden('#pop'),'un toque en el cajón pone la regla y lo cierra');
  await cajon(p);ok(await p.locator('#pop [data-tid=ruler].on').count()===1&&(await guardadas(p))===undefined,'en el cajón la regla sale como puesta, y un toque no cambia las favoritas');
  await p.click('#pop [data-tid=ruler]');ok(await p.locator('.ruler').count()===0,'otro toque la quita');
  // pulsación larga: pasa a la barra (sin abrirse), se guarda y sigue ahí al recargar
  await larga(p,'ruler');e=await est(p);
  ok(e.favs.join()===[...DE_SIEMPRE,'ruler'].join()&&await p.locator('.ruler').count()===0&&await p.isVisible('#pop')&&await p.locator('#pop [data-tid=ruler].fav').count()===1,'pulsación larga: la regla pasa a la barra derecha (y no se abre)');
  ok(/puesta en la barra/.test(await aviso(p))&&(await guardadas(p)).join()===[...DE_SIEMPRE,'ruler'].join(),'se avisa y queda guardado en los ajustes');
  ok(await p.$$eval('#right > *',es=>es.map(x=>x.className==='sep'?'|':x.dataset.fav||'·').join(''))==='pickergroupsrolesschedasamsematimernoisescore|spotnote|ruler·','en la barra, cada grupo va tras su raya');
  await p.mouse.click(600,600);await p.click('#right [data-fav=ruler]');
  ok(await p.locator('.ruler').count()===1&&await p.locator('#right [data-fav=ruler].on').count()===1,'el botón nuevo de la barra pone la regla y queda marcado');
  await p.click('#right [data-fav=ruler]');
  await p.reload();await p.waitForTimeout(700);e=await est(p);
  ok(e.favs.includes('ruler')&&e.favs.length===12&&entero(e),'al recargar, la regla sigue en la barra');
  await larga(p,'noise');e=await est(p);
  ok(!e.favs.includes('noise')&&/quitada de la barra/.test(await aviso(p))&&!(await guardadas(p)).includes('noise')&&await p.locator('#pop [data-tid=noise].fav').count()===0,'otra pulsación larga quita una herramienta de la barra');
  await p.context().close();
  // con el dedo (pantalla táctil): la pulsación larga marca favorita y el toque corto abre
  {const ctx=await b.newContext({viewport:{width:1920,height:1080},hasTouch:true});p=await ctx.newPage();p.on('pageerror',x=>errs.push('táctil: '+x.message));
    await p.goto(url);await p.waitForTimeout(700);
    const cdp=await ctx.newCDPSession(p),bb=await (async()=>{await p.tap('#btnTools');await p.waitForTimeout(150);return p.locator('#pop [data-tid=geo]').boundingBox()})();
    await cdp.send('Input.dispatchTouchEvent',{type:'touchStart',touchPoints:[{x:bb.x+bb.width/2,y:bb.y+bb.height/2}]});await p.waitForTimeout(900);
    await cdp.send('Input.dispatchTouchEvent',{type:'touchEnd',touchPoints:[]});await p.waitForTimeout(200);
    ok(await p.locator('#right [data-fav=geo]').count()===1&&await p.locator('.win').count()===0&&await p.isVisible('#pop'),'con el dedo: mantener pulsado pone la herramienta en la barra y no la abre');
    await p.tap('#pop [data-tid=clock]');await p.waitForTimeout(150);
    ok(await p.locator('.win').count()===1&&(await guardadas(p)).length===12,'con el dedo: un toque corto la abre y no toca las favoritas');
    await ctx.close()}
  // favoritas guardadas con una herramienta que ya no existe: se ignora
  p=await abrir(1920,1080,{favs:['timer','ya-no-existe','geo']});e=await est(p);
  ok(e.favs.join()==='timer,geo'&&entero(e),'una favorita guardada que ya no existe se ignora sin romper nada');
  await p.context().close();

  // 2. Resolución de portátil (1366×768): antes se cortaban grosores, Foco y Nota
  p=await abrir(1366,768);e=await est(p);
  ok(/^d[123]$/.test(e.lay)&&entero(e),'1366×768: no se corta nada'+(entero(e)?'':' → '+cortes(e)));
  ok(e.sz===0&&e.szc===1&&e.rot>0,'1366×768: los grosores van en un solo botón y los rótulos se mantienen');
  const gros=()=>p.evaluate(()=>document.querySelector('#left .sz.on').dataset.s);
  const g0=await gros();await p.click('#left .szc');const g1=await gros();await p.click('#left .szc');const g2=await gros();await p.click('#left .szc');
  ok(g0==='6'&&g1==='12'&&g2==='3'&&await gros()==='6','ese botón recorre fino, medio y grueso');
  ok(e.favs.length<11&&e.favs.length>=6&&e.favs.join()===DE_SIEMPRE.slice(0,e.favs.length).join(),`en la barra derecha salen las ${e.favs.length} que caben, y el cajón sigue a la vista`);
  await cajon(p);ok(await dentro(p,'#pop')&&await p.locator('#pop .tile.fav').count()===e.favs.length,'el cajón cabe en la pantalla y solo marca las que se ven en la barra');
  await p.click('#pop [data-tid=note]');ok(await p.locator('.note').count()===1,'lo que no cabe en la barra (Nota) se abre desde el cajón');
  // barra llena: no deja añadir hasta quitar una
  await larga(p,'geo');
  ok(/No caben más/.test(await aviso(p))&&(await guardadas(p))===undefined&&(await est(p)).favs.join()===e.favs.join(),'con la barra llena, avisa de que no caben más y no cambia nada');
  await larga(p,e.favs[0]);await larga(p,'geo');const e2=await est(p);
  ok(e2.favs.join()===[...e.favs.slice(1),'geo'].join()&&(await guardadas(p)).join()===e2.favs.join()&&entero(e2),'al quitar una, ya cabe la nueva; se guarda justo lo que se ve');
  await p.context().close();

  // 3. 1024×768: antes «Limpiar» salía cortado, también con herramientas en la bandeja
  p=await abrir(1024,768);e=await est(p);
  ok(/^d[123]$/.test(e.lay)&&entero(e)&&await dentro(p,'#dock .danger'),'1024×768: no se corta nada y «Limpiar» se ve entero'+(entero(e)?'':' → '+cortes(e)));
  for(const id of ['b10','clock','eur','frac']){await cajon(p);await p.click(`#pop [data-tid=${id}]`)}
  await p.waitForTimeout(150);e=await est(p);
  ok(await p.locator('#tray button').count()===4&&entero(e)&&await dentro(p,'#dock .danger'),'con cuatro herramientas en la bandeja, la barra de abajo se aprieta y «Limpiar» sigue entero'+(entero(e)?'':' → '+cortes(e)));
  await cajon(p);await p.click('#pop >> text=Reiniciar herramientas');await p.waitForTimeout(150);
  ok(await p.locator('.win').count()===0&&await p.isHidden('#tray')&&await p.isVisible('#dock .d-reset .lbl-t'),'«Reiniciar herramientas» del cajón lo quita todo, y la barra de abajo recupera sus textos');
  await p.context().close();
  p=await abrir(1280,720);e=await est(p);
  ok(/^d[123]$/.test(e.lay)&&entero(e),'1280×720: no se corta nada'+(entero(e)?'':' → '+cortes(e)));
  await p.context().close();

  // 4. Tableta en vertical (768×1024): barra compacta
  p=await abrir(768,1024);e=await est(p);
  ok(e.lay==='c'&&e.der===null&&entero(e)&&e.w>=700,`768×1024: barra compacta, sin barra derecha; la pizarra mide ${e.w} px de ancho (antes 576)`+(entero(e)?'':' → '+cortes(e)));
  ok(await p.isVisible('#dock .d-tools')&&await p.isHidden('#dock .d-tools .lbl-t')&&e.rot===0,'el cajón pasa a la barra de abajo, que va solo con iconos');
  await cajon(p);
  ok(await dentro(p,'#pop')&&await p.locator('#pop .tile').count()===23&&await p.locator('#pop .tile.fav').count()===0&&await p.locator('#pop .pophint').count()===0,'el cajón cabe y, como no hay barra derecha, no ofrece favoritas');
  await larga(p,'geo');ok((await guardadas(p))===undefined,'sin barra derecha, la pulsación larga no cambia las favoritas');
  await p.mouse.up();await p.mouse.click(400,300);
  await p.context().close();

  // 5. Móvil en vertical (390×844): la pizarra ocupa todo el ancho (antes 198 px) y las herramientas van abajo
  p=await abrir(390,844);e=await est(p);
  ok(e.lay==='p'&&e.w===390&&e.leftTop>=e.stage[3]&&entero(e),`móvil vertical: la pizarra mide ${e.w}×${e.h} y las herramientas de dibujo van debajo`+(entero(e)?'':' → '+cortes(e)));
  ok(await p.evaluate(()=>{const d=document.querySelector('#dock');return d.scrollWidth<=d.clientWidth+1})&&await dentro(p,'#dock .danger')&&await p.isHidden('#dock .d-reset'),'la barra de abajo cabe sin deslizar («Reiniciar» está en el cajón)');
  await p.mouse.move(80,200);await p.mouse.down();await p.mouse.move(300,400,{steps:6});await p.mouse.up();
  ok(await p.evaluate(()=>__fori.pages[0].strokes.length)===1,'se puede dibujar');
  await p.click('#left [data-tool=eraser]');ok(await p.locator('#left [data-tool=eraser].on').count()===1,'se puede cambiar de herramienta');
  await p.click('#btnUndo');ok(await p.evaluate(()=>__fori.pages[0].strokes.length)===0,'y deshacer');
  // los menús de la barra de dibujo se abren hacia arriba y caben
  await p.click('#left [data-pop=shape]');const mf=await dentro(p,'#pop');await p.mouse.click(195,100);
  await p.click('#left [data-pop=color]');await p.waitForTimeout(100);const mc=await dentro(p,'#pop');await p.mouse.click(195,100);
  ok(mf&&mc&&await p.isHidden('#pop')&&await p.evaluate(()=>__fori.pages[0].strokes.length)===0,'los menús de formas y de colores caben en el móvil');
  await cajon(p);ok(await dentro(p,'#pop')&&await p.locator('#pop .tile').count()===23,'el cajón cabe en el móvil');
  await p.click('#pop [data-tid=picker]');await p.waitForTimeout(100);
  ok(await dentro(p,'.win'),'una ventana (Alumno al azar) nace dentro de la pantalla');
  await cajon(p);await p.click('#pop >> text=Reiniciar herramientas');
  ok(await p.locator('.win').count()===0,'«Reiniciar» funciona desde el cajón');
  await p.click('#pageLbl');await p.click('#pop >> text=Página nueva');
  ok((await p.textContent('#pageLbl')).includes('2/2')&&await p.isHidden('#pageLbl .lbl-t'),'el menú de página funciona y la etiqueta se queda en «2/2»');
  await p.context().close();
  for(const [w,h] of [[360,740],[320,640]]){
    p=await abrir(w,h);e=await est(p);
    ok(e.lay==='p'&&e.w===w&&entero(e),`móvil ${w}×${h}: no se corta nada`+(entero(e)?'':' → '+cortes(e)));
    await cajon(p);ok(await dentro(p,'#pop'),`móvil ${w}×${h}: el cajón cabe`);
    await p.context().close();
  }
  // móvil apaisado: la barra izquierda se reparte en columnas
  p=await abrir(844,390);e=await est(p);
  ok(e.lay==='c'&&entero(e)&&e.w>=700,`móvil apaisado: no se corta nada y la pizarra mide ${e.w}×${e.h} (antes 652×258)`+(entero(e)?'':' → '+cortes(e)));
  await p.context().close();

  // 6. Con «Tamaño de botones» Muy grande cabe menos: se adapta igual
  for(const [w,h] of [[1920,1080],[1366,768],[390,844]]){
    p=await abrir(w,h,{ui:1.3});e=await est(p);
    ok(entero(e),`${w}×${h} con botones muy grandes (${e.lay}): no se corta nada`+(entero(e)?'':' → '+cortes(e)));
    await p.context().close();
  }

  // 7. Cambiar de tamaño con algo dibujado: la interfaz se recoloca y el dibujo no se mueve de su sitio en la página
  p=await abrir(1920,1080);
  await p.mouse.move(500,400);await p.mouse.down();await p.mouse.move(900,600,{steps:6});await p.mouse.up();
  const pag=()=>p.evaluate(()=>{const g=__fori.pages[0],s=g.strokes[0],a=s.pts[0],z=s.pts[s.pts.length-1],L=q=>[(q.x-g.v.ox)/g.v.k,(q.y-g.v.oy)/g.v.k];return {size:g.size,a:L(a),z:L(z),px:[a.x,a.y,z.x,z.y]}});
  const cerca=(a,b,t=.05)=>a.every((v,i)=>Math.abs(v-b[i])<=t);
  const d0=await pag();
  await p.setViewportSize({width:390,height:844});await p.waitForTimeout(300);
  let d1=await pag();e=await est(p);
  ok(e.lay==='p'&&entero(e)&&d1.size.w===d0.size.w&&d1.size.h===d0.size.h&&cerca(d1.a,d0.a)&&cerca(d1.z,d0.z),'al pasar a tamaño de móvil, la página y el trazo siguen en su sitio');
  await p.setViewportSize({width:1024,height:768});await p.waitForTimeout(300);e=await est(p);
  ok(/^d[123]$/.test(e.lay)&&entero(e)&&e.favs.length>0,'al agrandar a 1024×768 vuelve la barra derecha');
  await p.setViewportSize({width:1920,height:1080});await p.waitForTimeout(300);
  d1=await pag();e=await est(p);
  ok(e.lay==='d0'&&e.favs.length===11&&cerca(d1.px,d0.px,.1),'y al volver al tamaño de la PDI todo queda exactamente como estaba');
  // modos de pantalla: en Mínima no hay barras; al volver a Completa se recolocan
  await p.click('#btnView');await p.click('#pop >> text=Mínima');await p.waitForTimeout(200);
  const enMini=await p.evaluate(()=>[document.body.dataset.lay===undefined,document.querySelector('#stage').clientWidth===innerWidth]);
  await p.click('#mini [data-pop=view]');await p.click('#pop >> text=Completa');await p.waitForTimeout(200);e=await est(p);
  ok(enMini.every(Boolean)&&e.lay==='d0'&&entero(e)&&cerca((await pag()).px,d0.px,.1),'el modo Mínima sigue a pantalla entera, y al volver a Completa todo está en su sitio');
  await p.context().close();
  ok(errs.length===0,'sin errores en ningún tamaño'+(errs.length?': '+errs.join(' | '):''));
}
/* Pruebas de los fondos: registro, tamaño por página (p.bgo), menú con vistas previas y pulsación larga */
async function fondos(b,url){
  console.log('\nFondos y tamaño por página');
  const ctx=await b.newContext({viewport:{width:1920,height:1080},acceptDownloads:true});
  const p=await ctx.newPage();
  const errs=[];p.on('pageerror',e=>errs.push(e.message));
  p.on('dialog',d=>d.accept());
  await p.goto(url);await p.waitForTimeout(800);
  const pg=()=>p.evaluate(()=>__fori.pages.map(q=>[q.bg,q.bgo]));
  const abre=async()=>{await p.click('#dock [data-pop=bg]');await p.waitForTimeout(100)};
  const corto=async id=>{await abre();await p.click(`#pop [data-bg=${id}]`);await p.waitForTimeout(100)};
  const sostener=async id=>{await abre();await p.hover(`#pop [data-bg=${id}]`);await p.mouse.down();await p.waitForTimeout(800);await p.mouse.up();await p.waitForTimeout(500)};
  const larga=async(id,op)=>{await sostener(id);await p.click(`#pop >> text=${op}`);await p.waitForTimeout(100)};
  const hash=()=>p.evaluate(()=>{const c=document.querySelector('#bg'),d=c.getContext('2d').getImageData(0,0,c.width,c.height).data;let h=0,n=0;for(let i=0;i<d.length;i+=4){n+=d[i+3];h=(h*31+d[i+3]+d[i]*7+d[i+1]*13)|0}return [h,n]});
  const dentro=sel=>p.evaluate(s=>{const r=document.querySelector(s).getBoundingClientRect();return r.left>=0&&r.top>=0&&r.right<=innerWidth+.5&&r.bottom<=innerHeight+.5},sel);
  const ajustes=async x=>{await p.evaluate(x=>{const k='fori-v1',s=JSON.parse(localStorage.getItem(k)||'{}');for(const n in x)x[n]===null?delete s[n]:s[n]=x[n];localStorage.setItem(k,JSON.stringify(s))},x)};
  const recarga=async()=>{await p.waitForTimeout(1000);await p.reload();await p.waitForTimeout(800)};
  const idb=f=>p.evaluate(f=>new Promise(r=>{const q=indexedDB.open('fori',1);q.onsuccess=async()=>{const st=q.result.transaction('kv','readwrite').objectStore('kv');const g=k=>new Promise(o=>{const x=st.get(k);x.onsuccess=()=>o(x.result)});const ids=(await g('board2')).ids;const rec=await g('page:'+ids[0]);(new Function('rec',f))(rec);st.put(rec,'page:'+ids[0]).onsuccess=()=>r(true)}}),f);

  // 1. El menú enseña los seis fondos con vista previa, en un solo apartado
  await abre();
  const tiles=await p.locator('#pop .tile.bgt').count(),seps=await p.locator('#pop .popsep.grp').allTextContents();
  const pintada=id=>p.evaluate(id=>{const c=document.querySelector(`#pop [data-bg=${id}] canvas`),d=c.getContext('2d').getImageData(0,0,c.width,c.height).data;let n=0;for(let i=3;i<d.length;i+=4)n+=d[i];return n},id);
  ok(tiles===22&&seps.length===2&&/Pautas/i.test(seps[0])&&/Plantillas/i.test(seps[1]),'el menú enseña los 22 fondos: 9 pautas y 13 plantillas, en dos apartados');
  ok(await pintada('grid')>0&&await pintada('montessori')>0&&await pintada('plain')===0,'cada tesela lleva su vista previa pintada (Liso, vacía)');
  ok(/Mantén pulsado un fondo/.test(await p.textContent('#pop')),'el menú avisa de la pulsación larga');
  ok(await dentro('#pop'),'el menú cabe en 1920×1080');
  await p.keyboard.press('Escape');

  // 2. Toque corto, pulsación larga y tamaño solo en esa página
  await corto('grid');
  ok(same(await pg(),[['grid',undefined]])&&/Cuadrícula/.test(await p.textContent('#bgBtn')),'toque corto: cambia el fondo y la página sigue el tamaño de Ajustes');
  await sostener('grid');
  const vista=await p.locator('#pop .wide').allTextContents();
  ok(/Volver · Cuadrícula/.test(vista[0])&&vista.slice(1,5).map(t=>t.trim()).join()==='Pequeña,Mediana,Grande,Extra grande'&&(await p.textContent('#pop .wide.on')).trim()==='Mediana','pulsación larga: «‹ Volver · Cuadrícula» y los cuatro tamaños, con el actual marcado');
  ok(await dentro('#pop'),'la vista de opciones cabe');
  await p.click('#pop >> text=Extra grande');await p.waitForTimeout(100);
  ok(same(await pg(),[['grid',1.8]])&&await p.isHidden('#pop'),'elegir «Extra grande» deja bg y bgo=1.8 en la página y cierra el menú');
  await sostener('grid');await p.click('#pop >> text=Volver');await p.waitForTimeout(100);
  ok(await p.locator('#pop .tile.bgt').count()===22,'«Volver» regresa al menú de fondos');
  await p.keyboard.press('Escape');

  // 3. Página nueva y duplicada heredan fondo y tamaño; otras páginas no cambian
  const menu=async t=>{await p.click('#pageLbl');await p.click(`#pop >> text=${t}`);await p.waitForTimeout(150)};
  await menu('Página nueva');
  ok(same(await pg(),[['grid',1.8],['grid',1.8]]),'una página nueva hereda fondo y tamaño');
  await larga('dots','Pequeña');
  ok(same(await pg(),[['grid',1.8],['dots',.75]]),'pulsación larga + «Pequeña» solo afecta a esa página');
  await menu('Duplicar esta página');
  ok(same(await pg(),[['grid',1.8],['dots',.75],['dots',.75]]),'duplicar hereda fondo y tamaño');
  ok((await p.evaluate(()=>JSON.parse(localStorage.getItem('fori-v1')).bgLast)).grid===1.8,'el último tamaño usado por fondo queda en los ajustes (bgLast)');
  await corto('grid');
  ok(same((await pg())[2],['grid',1.8]),'toque corto: pone el fondo con el último tamaño usado para él');
  await corto('plain');
  ok(same((await pg())[2],['plain',undefined]),'Liso no lleva tamaño');

  // 4. Recargar conserva bgo
  const antes=await pg();await recarga();
  ok(same(await pg(),antes)&&same(antes.map(x=>x[1]),[1.8,.75,undefined]),'al recargar, cada página conserva su fondo y su tamaño');

  // 5. Una página sin bgo usa el tamaño de Ajustes (se ve igual que con ese bgo)
  await ajustes({pautaSize:1.8,bgLast:null});await recarga();
  await corto('plain');await corto('grid');
  const hA=await hash(),sinA=(await pg())[(await p.evaluate(()=>__fori.cur))];
  await ajustes({pautaSize:1,bgLast:null});await recarga();
  const hC=await hash();
  await larga('grid','Extra grande');const hB=await hash();
  ok(sinA[1]===undefined&&hA[1]>0&&same(hA,hB),'una página sin bgo usa el tamaño de Ajustes: se pinta igual que con bgo=1.8');
  ok(!same(hA,hC),'y con otro tamaño de Ajustes se pinta distinto');

  // 6. Un fondo desconocido no rompe nada, se ve y se rotula como Liso y el dato no se toca
  await idb("rec.bg='xyz';rec.bgo=99");await recarga();
  for(let i=0;i<2;i++){await p.click('#dock [aria-label="Página anterior"]');await p.waitForTimeout(100)} // la página 1 es la del fondo desconocido
  ok((await p.textContent('#bgBtn')).includes('Liso')&&(await hash())[1]===0,'bg desconocido: se rotula y se pinta como Liso');
  ok((await p.evaluate(()=>__fori.pages[0].bg))==='xyz'&&(await p.evaluate(()=>__fori.pages[0].bgo))===undefined,'el dato se conserva y un bgo fuera de rango se descarta');
  await abre();ok(await p.locator('#pop .tile.bgt').count()===22,'el menú abre con un fondo desconocido');await p.keyboard.press('Escape');
  await corto('dots');

  // 7. Lecciones: guardar, exportar e importar conservan bgo; un bgo no válido se descarta
  await larga('dots','Grande');
  const kv=k=>p.evaluate(k=>new Promise(r=>{const q=indexedDB.open('fori',1);q.onsuccess=()=>{const g=q.result.transaction('kv').objectStore('kv').get(k);g.onsuccess=()=>r(g.result)}}),k);
  await menu('Guardar como lección');await p.waitForTimeout(600);
  const les=await kv('lessons'),lp=await kv('lesson:'+les[0].id);
  ok(lp[0].bg==='dots'&&lp[0].bgo===1.35,'la lección guardada lleva bgo');
  await menu('Mis lecciones');
  const [dl]=await Promise.all([p.waitForEvent('download'),p.click('.les-item [aria-label=Exportar]')]);
  const txt=require('fs').readFileSync(await dl.path(),'utf8'),d=JSON.parse(txt);
  ok(d.pages[0].bgo===1.35,'el archivo .fori exportado lleva bgo');
  await p.click('#pop,body',{position:{x:5,y:5},force:true}).catch(()=>{});
  await corto('plain');
  const imp=async t=>{const [fc]=await Promise.all([p.waitForEvent('filechooser'),p.click('text=Importar lección')]);await fc.setFiles({name:'a.fori',mimeType:'application/json',buffer:Buffer.from(t)});await p.waitForTimeout(900)};
  await imp(txt);
  ok(same((await pg())[0],['dots',1.35]),'importar la lección conserva el fondo y el tamaño');
  d.pages[0].bgo='x'.repeat(30);d.name='mala';await imp(JSON.stringify(d));
  ok((await pg())[0][1]===undefined,'al importar, un bgo de texto demasiado largo se descarta');
  d.pages[0].bgo=99;d.name='mala2';await imp(JSON.stringify(d));
  ok((await pg())[0][1]===undefined,'al importar, un bgo numérico fuera de rango se descarta');

  // 8. El menú cabe en móvil (vertical y horizontal)
  for(const [w,h2] of [[390,844],[844,390]]){
    await p.setViewportSize({width:w,height:h2});await p.waitForTimeout(400);
    await p.evaluate(()=>{document.querySelectorAll('.win').forEach(x=>x.remove())});
    await abre();
    const ok1=await dentro('#pop'),cols=await p.locator('#pop .tile.bgt').count();
    await p.keyboard.press('Escape');
    await sostener('grid');const ok2=await dentro('#pop');await p.keyboard.press('Escape');
    ok(ok1&&ok2&&cols===22,`a ${w}×${h2} el menú de fondos y sus opciones caben`);
  }
  await ctx.close();
  ok(errs.length===0,'sin errores en las pruebas de fondos'+(errs.length?': '+errs.join(' | '):''));
}
/* Pruebas de la fase B: plantillas (se dibujan una vez, encajadas en la página) y pautas nuevas */
async function plantillas(b,url){
  console.log('\nPlantillas y pautas nuevas');
  const ctx=await b.newContext({viewport:{width:1920,height:1080},acceptDownloads:true});
  const p=await ctx.newPage();
  const errs=[];p.on('pageerror',e=>errs.push(e.message));
  p.on('dialog',d=>d.accept());
  await p.goto(url);await p.waitForTimeout(800);
  const abre=async()=>{await p.click('#dock [data-pop=bg]');await p.waitForTimeout(100)};
  const corto=async id=>{await abre();await p.click(`#pop [data-bg=${id}]`);await p.waitForTimeout(150)};
  const larga=async(id,op)=>{await abre();await p.hover(`#pop [data-bg=${id}]`);await p.mouse.down();await p.waitForTimeout(800);await p.mouse.up();await p.waitForTimeout(500);await p.click(`#pop >> text=${op}`);await p.waitForTimeout(150)};
  const hash=()=>p.evaluate(()=>{const c=document.querySelector('#bg'),d=c.getContext('2d').getImageData(0,0,c.width,c.height).data;let h=0,n=0;for(let i=0;i<d.length;i+=4){n+=d[i+3];h=(h*31+d[i+3]+d[i]*7+d[i+1]*13)|0}return [h,n]});
  const pag=()=>p.evaluate(()=>{const q=__fori.pages[__fori.cur];return{bg:q.bg,bgo:q.bgo,size:q.size,v:q.v}});
  const nudge=async()=>{const v=p.viewportSize();await p.setViewportSize({width:v.width-1,height:v.height});await p.waitForTimeout(150);await p.setViewportSize(v);await p.waitForTimeout(250)};
  const recarga=async()=>{await p.waitForTimeout(1000);await p.reload();await p.waitForTimeout(800)};
  const dentro=sel=>p.evaluate(s=>{const r=document.querySelector(s).getBoundingClientRect();return r.left>=0&&r.top>=0&&r.right<=innerWidth+.5&&r.bottom<=innerHeight+.5},sel);

  // 1. El registro: 9 pautas y 13 plantillas, en el orden previsto
  const reg=await p.evaluate(()=>__fori.REG.fondos.map(f=>({id:f.id,g:f.group,o:f.order,op:(f.opts||[]).map(x=>x[0])})));
  const ids=g=>reg.filter(f=>f.g===g).sort((a,c)=>a.o-c.o).map(f=>f.id).join();
  ok(ids('pauta')==='plain,grid,dots,lines,montessori,cuadrovia,renglones,isometrico,milimetrado','pautas: las seis de siempre y Renglones, Papel isométrico y Milimetrado');
  ok(ids('plantilla')==='venn,ajedrez,tabla100,marco10,ppt,valorpos,ejes,grafbarras,tablacol,vinetas,dibescr,calendario,mapa','plantillas: las 13, en el orden del plan');
  ok(same(reg.find(f=>f.id==='ajedrez').op,['coord','8','damas'])&&same(reg.find(f=>f.id==='valorpos').op,['du','cdu','umcdu'])&&same(reg.find(f=>f.id==='vinetas').op,['3','4','6'])&&reg.find(f=>f.id==='calendario').op.length===0,'las variantes son las del plan (y Calendario no tiene)');

  // 2. Cada fondo y cada variante se pinta sin errores en claro y oscuro (las plantillas dejan algo pintado)
  let vacios=[],n=0;
  for(const tema of ['light','dark']){
    await p.evaluate(t=>{document.documentElement.dataset.theme=t},tema);
    for(const f of reg){
      for(const op of (f.op.length?f.op:[undefined])){
        await p.evaluate(([id,o])=>{const q=__fori.pages[__fori.cur];q.bg=id;if(o===undefined)delete q.bgo;else q.bgo=o},[f.id,op]);
        await nudge();n++;
        const h=await hash();if(f.id!=='plain'&&!(h[1]>0))vacios.push(tema+':'+f.id+':'+op);
      }
    }
  }
  await p.evaluate(()=>{document.documentElement.dataset.theme='light'});
  ok(vacios.length===0&&n>40,`${n} combinaciones (fondo × variante × claro/oscuro) se pintan sin dejar la página vacía`+(vacios.length?': '+vacios.join(' '):''));
  ok(errs.length===0,'sin errores al pintarlas todas'+(errs.length?': '+errs.join(' | '):''));

  // 3. Distintas variantes se ven distintas
  const dist=async(id,a,c)=>{await p.evaluate(([id,o])=>{const q=__fori.pages[__fori.cur];q.bg=id;q.bgo=o},[id,a]);await nudge();const h1=await hash();
    await p.evaluate(([id,o])=>{const q=__fori.pages[__fori.cur];q.bg=id;q.bgo=o},[id,c]);await nudge();const h2=await hash();return !same(h1,h2)};
  ok(await dist('venn','2','3')&&await dist('ajedrez','coord','8')&&await dist('ajedrez','8','damas')&&await dist('tabla100','vacia','fila')&&await dist('marco10','1','2')&&await dist('ppt','circ','barras')&&await dist('valorpos','du','umcdu')&&await dist('ejes','q1','q4')&&await dist('tablacol','2','3')&&await dist('vinetas','3','6'),'cada variante se pinta distinta de la otra');

  // 4. El menú: tres apartados, vistas previas de las plantillas y todo cabe
  await p.evaluate(()=>{const q=__fori.pages[__fori.cur];q.bg='plain';delete q.bgo});await nudge();
  await abre();
  const seps=await p.locator('#pop .popsep.grp').allTextContents(),tiles=await p.locator('#pop .tile.bgt').count();
  const pintada=id=>p.evaluate(id=>{const c=document.querySelector(`#pop [data-bg=${id}] canvas`),d=c.getContext('2d').getImageData(0,0,c.width,c.height).data;let n=0;for(let i=3;i<d.length;i+=4)n+=d[i];return n},id);
  const todasPintadas=[];for(const f of reg.filter(f=>f.g==='plantilla'||['renglones','isometrico','milimetrado'].includes(f.id)))if(!(await pintada(f.id)>0))todasPintadas.push(f.id);
  ok(seps.length===2&&/Pautas/.test(seps[0])&&/Plantillas/.test(seps[1])&&tiles===22,'el menú tiene los apartados «Pautas» y «Plantillas» con 22 teselas');
  ok(todasPintadas.length===0,'la vista previa de cada plantilla y pauta nueva está pintada'+(todasPintadas.length?': '+todasPintadas.join():''));
  await p.keyboard.press('Escape');

  // 5. Elegir una plantilla en una página vacía fija su tamaño; al cambiar el tamaño de la ventana no se mueve ni se deforma
  await corto('plain');
  await corto('ajedrez');
  const a0=await pag();
  ok(a0.bg==='ajedrez'&&a0.bgo===undefined&&a0.size&&a0.size.w>0&&a0.size.h>0&&same(a0.v,{k:1,ox:0,oy:0}),'toque corto en «Tablero de ajedrez»: pone la plantilla con la variante por defecto y fija el tamaño de la página');
  // el centro de una casilla oscura (b8) tiene tinta y el de una clara (a8), no
  const casillas=()=>p.evaluate(()=>{
    const q=__fori.pages[__fori.cur],L=q.size,v=q.v,m=.06*Math.min(L.w,L.h),s=Math.min((L.w-2*m)/9.3,(L.h-2*m)/9.3),x0=(L.w-8*s)/2,y0=(L.h-8*s)/2;
    const c=document.querySelector('#bg'),dpr=c.width/c.clientWidth,x=c.getContext('2d');
    const al=(lx,ly)=>x.getImageData(Math.round((v.ox+lx*v.k)*dpr),Math.round((v.oy+ly*v.k)*dpr),1,1).data[3];
    return [al(x0+1.5*s,y0+.5*s),al(x0+.5*s,y0+.5*s),al(x0+6.5*s,y0+7.5*s),al(x0+7.5*s,y0+7.5*s)];
  });
  const c0=await casillas();
  ok(c0[0]>0&&c0[1]===0&&c0[2]>0&&c0[3]===0,'las casillas oscuras están pintadas y las claras no');
  await p.setViewportSize({width:1280,height:720});await p.waitForTimeout(400);
  const a1=await pag(),c1=await casillas();
  ok(same(a1.size,a0.size)&&a1.v.k<1&&same(c1.map(x=>x>0),c0.map(x=>x>0)),'tras reducir la ventana a 1280×720 la plantilla sigue entera y en su sitio (misma página lógica, vista a escala)');
  await p.setViewportSize({width:700,height:1000});await p.waitForTimeout(400);
  const a2=await pag(),c2=await casillas();
  ok(same(a2.size,a0.size)&&same(c2.map(x=>x>0),c0.map(x=>x>0)),'y al girar la ventana a vertical (700×1000) tampoco se mueve ni se deforma');
  await p.setViewportSize({width:1920,height:1080});await p.waitForTimeout(400);

  // 6. Escribir encima: el trazo acompaña a la plantilla
  await p.mouse.move(900,500);await p.mouse.down();await p.mouse.move(1100,560,{steps:6});await p.mouse.up();
  const t0=await p.evaluate(()=>__fori.pages[__fori.cur].strokes.length);
  await p.setViewportSize({width:1280,height:720});await p.waitForTimeout(400);
  const a3=await pag(),c3=await casillas();
  ok(t0===1&&same(a3.size,a0.size)&&same(c3.map(x=>x>0),c0.map(x=>x>0)),'con un trazo encima, la página conserva su tamaño y la plantilla sigue alineada tras cambiar el tamaño de la ventana');
  await p.setViewportSize({width:1920,height:1080});await p.waitForTimeout(400);

  // 7. Pulsación larga: variante guardada solo en esa página, y recargar la conserva
  await p.click('#pageLbl');await p.click('#pop >> text=Página nueva');await p.waitForTimeout(150);
  await larga('ajedrez','Damas');
  const a4=await pag();
  ok(a4.bg==='ajedrez'&&a4.bgo==='damas'&&a4.size&&same(a4.v,{k:1,ox:0,oy:0}),'pulsación larga + «Damas 10×10» deja bgo=damas en esa página');
  ok(same((await p.evaluate(()=>__fori.pages.map(q=>[q.bg,q.bgo]))),[['ajedrez',undefined],['ajedrez','damas']]),'la otra página no cambia');
  const hD=await hash();
  await recarga();
  ok(same(await p.evaluate(()=>__fori.pages.map(q=>[q.bg,q.bgo])),[['ajedrez',undefined],['ajedrez','damas']])&&same(await hash(),hD),'al recargar se conservan la plantilla y su variante y se ven igual');
  ok((await p.evaluate(()=>__fori.pages[__fori.cur].size)).w>0,'y la página vacía con plantilla conserva su tamaño');

  // 8. Cambiar de una plantilla a una pauta en una página vacía: vuelve a tomar el tamaño de la pizarra
  await p.setViewportSize({width:1280,height:720});await p.waitForTimeout(400);
  await corto('grid');
  const a5=await pag(),st=await p.evaluate(()=>[document.querySelector('#stage').clientWidth,document.querySelector('#stage').clientHeight]);
  ok(a5.bg==='grid'&&a5.size.w===st[0]&&a5.size.h===st[1]&&same(a5.v,{k:1,ox:0,oy:0}),'plantilla → pauta en una página vacía: la página vuelve a seguir el tamaño de la pizarra');
  await p.setViewportSize({width:1920,height:1080});await p.waitForTimeout(400);

  // 9. Exportar: el PNG y la miniatura de la lección llevan la plantilla
  await corto('plain');await corto('venn');
  const png=async()=>{const [dl]=await Promise.all([p.waitForEvent('download'),(async()=>{await p.click('#pageLbl');await p.click('#pop >> text=Guardar página como imagen')})()]);
    const buf=require('fs').readFileSync(await dl.path());
    return p.evaluate(async b64=>{const im=new Image();await new Promise(r=>{im.onload=r;im.src='data:image/png;base64,'+b64});const c=document.createElement('canvas');c.width=im.width;c.height=im.height;const x=c.getContext('2d');x.drawImage(im,0,0);
      const d=x.getImageData(0,0,c.width,c.height).data,o=new Set();for(let i=0;i<d.length;i+=4*97)o.add(d[i]+','+d[i+1]+','+d[i+2]);return o.size},buf.toString('base64'))};
  const colVenn=await png();
  await corto('plain');const colLiso=await png();
  ok(colVenn>colLiso&&colLiso<=2,'«Guardar página como imagen» incluye la plantilla (el PNG de una página lisa tiene un solo color; el del Venn, varios)');
  await corto('venn');
  await p.click('#pageLbl');await p.click('#pop >> text=Guardar como lección');await p.waitForTimeout(700);
  const kv=k=>p.evaluate(k=>new Promise(r=>{const q=indexedDB.open('fori',1);q.onsuccess=()=>{const g=q.result.transaction('kv').objectStore('kv').get(k);g.onsuccess=()=>r(g.result)}}),k);
  const les=await kv('lessons'),lp=await kv('lesson:'+les[0].id);
  ok(lp[1].bg==='venn'&&lp[1].size&&lp[1].size.w>0,'la lección guardada lleva la plantilla y el tamaño de la página');
  const thumbVenn=les[0].thumb;
  ok(typeof thumbVenn==='string'&&thumbVenn.length>1500,'la miniatura de la lección existe y no está vacía');

  // 10. Una lección con una plantilla desconocida o con una variante no válida se abre sin romper nada
  await p.evaluate(()=>{const q=__fori.pages[__fori.cur];q.bg='plantilla-futura';q.bgo='x'.repeat(30)});await nudge();await p.click('#dock [aria-label="Página anterior"]');await p.click('#dock [aria-label="Página siguiente"]');await p.waitForTimeout(150);
  ok((await p.textContent('#bgBtn')).includes('Liso')&&errs.length===0,'una plantilla desconocida se rotula y se pinta como Liso y no da errores');

  // 11. El menú largo cabe y se puede recorrer hasta el final en móvil
  for(const [w,h2] of [[390,844],[844,390]]){
    await p.setViewportSize({width:w,height:h2});await p.waitForTimeout(400);
    await p.evaluate(()=>{document.querySelectorAll('.win').forEach(x=>x.remove())});
    await abre();
    const e=await p.evaluate(()=>{const pop=document.querySelector('#pop'),r=pop.getBoundingClientRect();pop.scrollTop=pop.scrollHeight;
      const tm=document.querySelector('#pop [data-bg=mapa]');tm.scrollIntoView({block:'nearest'});const t=tm.getBoundingClientRect(),pr=pop.getBoundingClientRect();
      return{dentro:r.left>=0&&r.top>=0&&r.right<=innerWidth+.5&&r.bottom<=innerHeight+.5,desliza:pop.scrollHeight>pop.clientHeight,alcanza:t.top>=pr.top-1&&t.bottom<=pr.bottom+1}});
    await p.keyboard.press('Escape');
    ok(e.dentro&&e.desliza&&e.alcanza,`a ${w}×${h2} el menú cabe en pantalla, se desliza y se llega a la última plantilla`);
    await abre();await p.hover('#pop [data-bg=venn]').catch(()=>{});await p.evaluate(()=>{document.querySelector('#pop').scrollTop=0});
    await p.mouse.down();await p.waitForTimeout(800);await p.mouse.up();await p.waitForTimeout(400);
    ok(await dentro('#pop'),`a ${w}×${h2} las opciones de una plantilla caben`);await p.keyboard.press('Escape');
  }
  await ctx.close();
  ok(errs.length===0,'sin errores en las pruebas de plantillas'+(errs.length?': '+errs.join(' | '):''));
}
server.listen(0,async()=>{
  const url=`http://localhost:${server.address().port}/`;
  // FORI_CHROME=1 usa el Chrome instalado en el equipo en vez del navegador de Playwright
  const b=await chromium.launch(process.env.FORI_CHROME?{channel:'chrome',args:['--no-sandbox']}:{});
  try{
    if(process.env.FORI_SOLO==='fondos'){await fondos(b,url);await plantillas(b,url);await b.close();server.close();console.log(fails.length?`\n${fails.length} fallo(s)`:'\nTodo correcto');process.exit(fails.length?1:0)}
    const p=await b.newPage({viewport:{width:1920,height:1080}});
    const errs=[];p.on('pageerror',e=>errs.push(e.message));
    p.on('console',m=>{if(m.type()==='error'&&!/Failed to load resource|ERR_/.test(m.text()))errs.push(m.text())});
    await p.goto(url);await p.waitForTimeout(800);
    ok(await p.evaluate(()=>window.__foriOK===true),'la app arranca');
    // dibujar un trazo
    await p.mouse.move(500,400);await p.mouse.down();await p.mouse.move(800,450,{steps:5});await p.mouse.up();
    // herramientas de la barra derecha
    for(const id of await p.$$eval('#right [data-win]',bs=>bs.map(b=>b.dataset.win).filter(i=>i!=='spot'&&i!=='noise'))){
      await p.click(`#right [data-win="${id}"]`);await p.waitForTimeout(80);
      ok(await p.locator('.win').count()>0,`abre «${id}»`);
      await p.click(`#right [data-win="${id}"]`);
    }
    // herramientas de matemáticas
    for(const id of await p.evaluate(()=>__fori.REG.tools.filter(t=>t.group==='mates'&&!t.hidden).map(t=>t.id))){
      await p.click('#btnTools');await p.click(`#pop [data-tid="${id}"]`);await p.waitForTimeout(80);ok(await p.isHidden('#pop'),`abre «${id}» desde el cajón`)}
    await p.click('#dock >> text=Reiniciar');
    // páginas
    await p.click('#pageLbl');await p.click('#pop >> text=Página nueva');
    ok((await p.textContent('#pageLbl')).includes('2/2'),'crea una página nueva');
    ok(errs.length===0,'sin errores en la consola'+(errs.length?': '+errs.join(' | '):''));
    // arrancar con ajustes guardados poco habituales (zonas, modo mínimo, ruleta, tema oscuro…)
    for(const extra of [{zoneN:4},{zoneN:2,view:'mini'},{view:'clean',theme:'dark',pickerMode:'wheel'},{ui:1.3,pautaSize:1.35},{pautaSize:1.8}]){
      await p.evaluate(x=>{const k='fori-v1',s=JSON.parse(localStorage.getItem(k)||'{}');localStorage.setItem(k,JSON.stringify({...s,...x}))},extra);
      const e2=[];const h=e=>e2.push(e.message);p.on('pageerror',h);
      await p.reload();await p.waitForTimeout(700);p.off('pageerror',h);
      ok(await p.evaluate(()=>window.__foriOK===true)&&!e2.length,'arranca con '+JSON.stringify(extra)+(e2.length?': '+e2.join(' | '):''));
    }
    ok(await p.evaluate(()=>[...document.querySelectorAll('#sPauta option')].map(o=>o.value+':'+o.textContent).join()==='0.75:Pequeña,1:Mediana,1.35:Grande,1.8:Extra grande'),'el tamaño de pauta tiene la opción «Extra grande»');
    await registro(b,url);
    await pantallas(b,url);
    await pizarra(b,url);
    await guardado(b,url);
    await fondos(b,url);
    await plantillas(b,url);
  }catch(e){fails.push(String(e));console.log(e)}
  await b.close();server.close();
  console.log(fails.length?`\n${fails.length} fallo(s)`:'\nTodo correcto');process.exit(fails.length?1:0);
});
