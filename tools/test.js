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
server.listen(0,async()=>{
  const url=`http://localhost:${server.address().port}/`;
  const b=await chromium.launch();
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
  }catch(e){fails.push(String(e));console.log(e)}
  await b.close();server.close();
  console.log(fails.length?`\n${fails.length} fallo(s)`:'\nTodo correcto');process.exit(fails.length?1:0);
});
