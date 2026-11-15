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
  const board=async()=>{await p.waitForTimeout(900);return kv('board')};
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
  await p.evaluate(()=>new Promise(r=>{const q=indexedDB.open('fori',1);q.onsuccess=()=>{const t=q.result.transaction('kv','readwrite');
    t.objectStore('kv').put({cur:0,pages:[{bg:'grid',img:null,size:{w:1000,h:500},strokes:[{type:'free',tool:'pen',color:'ink',size:6,pts:[{x:100,y:100},{x:900,y:400}]}]}]},'board');t.oncomplete=()=>r()}}));
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
    await pizarra(b,url);
  }catch(e){fails.push(String(e));console.log(e)}
  await b.close();server.close();
  console.log(fails.length?`\n${fails.length} fallo(s)`:'\nTodo correcto');process.exit(fails.length?1:0);
});
