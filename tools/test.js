#!/usr/bin/env node
/* Prueba rápida de Fori: arranca la app, dibuja, abre todas las herramientas y comprueba que no hay errores.
   Uso: node tools/test.js   (necesita Playwright; primero genera index.html con python3 tools/build.py) */
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
  const mates=async l=>{await p.click('[data-pop=math]');await p.locator('#pop button',{hasText:l}).first().click();await p.waitForTimeout(80)};
  const wc=()=>p.evaluate(()=>[...document.querySelectorAll('.win')].pop().style.getPropertyValue('--wc'));
  const n=sel=>p.locator(sel).count();

  // 1. Lo que hay apuntado está completo
  const reg=await p.evaluate(()=>__fori.REG.tools.map(t=>({id:t.id,group:t.group,icon:t.icon,label:t.label,hidden:!!t.hidden,hace:typeof(t.build||t.run),ico:!!t.hidden||!!document.querySelector('#i-'+t.icon)})));
  ok(reg.length>=24&&new Set(reg.map(t=>t.id)).size===reg.length,`hay ${reg.length} herramientas apuntadas y ninguna repetida`);
  ok(reg.every(t=>t.id&&['aula','apoyo','mates'].includes(t.group)&&t.hace==='function'&&(t.hidden||(t.icon&&t.label))),'cada una tiene id, grupo, icono, texto y algo que hacer');
  ok(reg.every(t=>t.ico),'todos sus iconos existen'+(reg.every(t=>t.ico)?'':': '+reg.filter(t=>!t.ico).map(t=>t.id).join()));

  // 2. Quien usa la pizarra ve lo de siempre: mismos botones, mismo orden
  const rail=await p.$$eval('#right > *',es=>es.map(e=>e.className==='sep'?'|':(e.dataset.win||'-')+':'+e.textContent.trim()).join(' '));
  ok(rail==='picker:Elegir groups:Grupos roles:Encargados sched:Horario asam:Asamblea sema:Semáforo timer:Tiempo noise:Ruido score:Puntos | spot:Foco -:Nota','la barra derecha tiene los botones de siempre, en su orden');
  await p.click('[data-pop=math]');
  const menu=await p.$$eval('#pop button',bs=>bs.map(b=>b.textContent.trim()).join(', '));await p.mouse.click(1000,600);
  ok(menu==='Base 10, Reloj, Regla, Dinero, Regletas, Tangram, Transportador, Recta numérica, Fracciones, Tabla del 100, Dados, Geoplano','el menú Matemáticas tiene las herramientas de siempre, en su orden');

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
server.listen(0,async()=>{
  const url=`http://localhost:${server.address().port}/`;
  // FORI_CHROME=1 usa el Chrome instalado en el equipo en vez del navegador de Playwright
  const b=await chromium.launch(process.env.FORI_CHROME?{channel:'chrome',args:['--no-sandbox']}:{});
  try{
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
    await p.click('[data-pop=math]');const labels=await p.$$eval('#pop button',bs=>bs.map(b=>b.textContent.trim()));await p.mouse.click(1000,600);
    for(const l of labels){await p.click('[data-pop=math]');await p.locator('#pop button',{hasText:l}).first().click();await p.waitForTimeout(80);ok(true,`abre «${l}»`)}
    await p.click('#dock >> text=Reiniciar');
    // páginas
    await p.click('#pageLbl');await p.click('#pop >> text=Página nueva');
    ok((await p.textContent('#pageLbl')).includes('2/2'),'crea una página nueva');
    ok(errs.length===0,'sin errores en la consola'+(errs.length?': '+errs.join(' | '):''));
    // arrancar con ajustes guardados poco habituales (zonas, modo mínimo, ruleta, tema oscuro…)
    for(const extra of [{zoneN:4},{zoneN:2,view:'mini'},{view:'clean',theme:'dark',pickerMode:'wheel'},{ui:1.3,pautaSize:1.35}]){
      await p.evaluate(x=>{const k='fori-v1',s=JSON.parse(localStorage.getItem(k)||'{}');localStorage.setItem(k,JSON.stringify({...s,...x}))},extra);
      const e2=[];const h=e=>e2.push(e.message);p.on('pageerror',h);
      await p.reload();await p.waitForTimeout(700);p.off('pageerror',h);
      ok(await p.evaluate(()=>window.__foriOK===true)&&!e2.length,'arranca con '+JSON.stringify(extra)+(e2.length?': '+e2.join(' | '):''));
    }
    await registro(b,url);
    await pizarra(b,url);
    await guardado(b,url);
  }catch(e){fails.push(String(e));console.log(e)}
  await b.close();server.close();
  console.log(fails.length?`\n${fails.length} fallo(s)`:'\nTodo correcto');process.exit(fails.length?1:0);
});
