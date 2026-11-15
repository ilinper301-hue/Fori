/* ============ Monedas y billetes de euro ============ */
// Diámetros reales en mm y tamaños de billete en mm, para respetar las proporciones entre piezas
const COINS=[[1,16.25],[2,18.75],[5,21.25],[10,19.75],[20,22.25],[50,24.25],[100,23.25],[200,25.75]];
const BILLS=[[5,120,62,'#a7b0ba'],[10,127,67,'#ef7f78'],[20,133,72,'#6f9fe3'],[50,140,77,'#f3ab5c'],[100,147,77,'#5fbf87'],[200,153,77,'#e0c060']];
function coinSVG(v,d){
  const r=d/2,eu=v>=100,copper=v<10;
  const outer=v===200?'#d9b44a':v===100?'#c9ccd1':copper?'#c87443':'#dcb84e';
  const inner=v===200?'#c9ccd1':v===100?'#d9b44a':outer;
  const edge=copper?'#8a4422':eu?'#6b7078':'#9c7c22';
  return `<svg width="${d}" height="${d}" viewBox="0 0 ${d} ${d}"><circle cx="${r}" cy="${r}" r="${r-1.5}" fill="${outer}" stroke="${edge}" stroke-width="3"/><circle cx="${r}" cy="${r}" r="${eu?r*.66:r*.84}" fill="${inner}" stroke="rgba(0,0,0,.18)" stroke-width="2"/><text x="${r}" y="${r*.92}" text-anchor="middle" dominant-baseline="central" font-size="${r*(eu?.85:.74)}" font-weight="900" fill="#3a2a0e">${eu?v/100:v}</text><text x="${r}" y="${r*1.45}" text-anchor="middle" dominant-baseline="central" font-size="${r*(eu?.36:.3)}" font-weight="800" fill="#3a2a0e">${eu?'€':'cent'}</text></svg>`;
}
function billSVG(v,w,hh,col){
  return `<svg width="${w}" height="${hh}" viewBox="0 0 ${w} ${hh}"><rect x="1" y="1" width="${w-2}" height="${hh-2}" rx="8" fill="${col}" stroke="rgba(0,0,0,.35)" stroke-width="2"/><rect x="9" y="9" width="${w-18}" height="${hh-18}" rx="5" fill="none" stroke="rgba(255,255,255,.65)" stroke-width="2"/><circle cx="${w*.63}" cy="${hh/2}" r="${hh*.3}" fill="rgba(255,255,255,.45)"/><text x="${w*.63}" y="${hh/2}" text-anchor="middle" dominant-baseline="central" font-size="${hh*.34}" font-weight="900" fill="rgba(0,0,0,.55)">€</text><text x="16" y="${hh*.4}" font-size="${hh*.3}" font-weight="900" fill="rgba(0,0,0,.72)">${v}</text><text x="${w-16}" y="${hh-16}" text-anchor="end" font-size="${hh*.26}" font-weight="900" fill="rgba(0,0,0,.72)">${v}</text><text x="16" y="${hh-17}" font-size="${hh*.13}" font-weight="800" letter-spacing="2" fill="rgba(0,0,0,.6)">EURO</text></svg>`;
}
COINS.forEach(([v,mm])=>{const d=Math.round(mm*3.4);KINDS['c'+v]={w:d,h:d,g:'eur',v,svg:coinSVG(v,d)}});
BILLS.forEach(([v,wm,hm,col])=>{
  const w=Math.round(wm*1.7),hh=Math.round(hm*1.7),simple=billSVG(v,w,hh,col);
  KINDS['b'+v]={w,h:hh,g:'eur',v:v*100,get svg(){return billMarkup(v,w,hh)||simple}};
});
// Modelo "real": imágenes oficiales del BCE, cargadas en Dinero (se guardan en este navegador)
// o subidas al repositorio en la carpeta billetes/ (5.jpg, 10.jpg… sirven para todos los equipos)
const BILL_VALUES=BILLS.map(b=>b[0]);
const repoImgs={};
const billImg=v=>S.billImgs[v]||repoImgs[v];
function billMarkup(v,w,hh){
  const src=S.billMode==='real'&&billImg(v);if(!src)return null;
  const mark=S.specimen?`<text x="${w/2}" y="${hh/2}" transform="rotate(-20 ${w/2} ${hh/2})" text-anchor="middle" dominant-baseline="central" font-family="Arial,sans-serif" font-weight="700" font-size="${(hh*.26).toFixed(1)}" textLength="${(w*.8).toFixed(1)}" lengthAdjust="spacingAndGlyphs" fill="#c62828">SPECIMEN</text>`:'';
  return `<svg width="${w}" height="${hh}" viewBox="0 0 ${w} ${hh}"><image href="${src}" width="${w}" height="${hh}" preserveAspectRatio="none"/>${mark}</svg>`;
}
function refreshBills(){
  pieces(null,'eur').forEach(p=>{if(p.dataset.k[0]==='b')p.innerHTML=KINDS[p.dataset.k].svg});
  if(eurui&&eurui.renderBills)eurui.renderBills();
}
let probed=false; // la carpeta billetes/ solo se busca cuando se usa el modelo de imagen real
function probeRepoBills(){
  if(probed)return;probed=true;
  BILL_VALUES.forEach(v=>{
    const exts=['jpg','png','webp'];let i=0;
    const next=()=>{if(i>=exts.length)return;const url=`billetes/${v}.${exts[i++]}`,im=new Image();im.onload=()=>{repoImgs[v]=url;refreshBills()};im.onerror=next;im.src=url};
    next();
  });
}
if(S.billMode==='real')probeRepoBills();
// Reduce la imagen (resolución baja, como pide el BCE para pantallas) y la guarda como texto
function shrinkImage(file,maxW){
  return new Promise((res,rej)=>{
    const url=URL.createObjectURL(file),im=new Image();
    im.onload=()=>{const k=Math.min(1,maxW/im.width),c=document.createElement('canvas');c.width=Math.round(im.width*k);c.height=Math.round(im.height*k);c.getContext('2d').drawImage(im,0,0,c.width,c.height);URL.revokeObjectURL(url);res(c.toDataURL('image/jpeg',.85))};
    im.onerror=()=>{URL.revokeObjectURL(url);rej()};im.src=url;
  });
}
async function loadBillFiles(files){
  const ok=[],bad=[];
  for(const f of files){
    const v=(f.name.match(/\d+/g)||[]).map(Number).find(n=>BILL_VALUES.includes(n));
    if(!v){bad.push(f.name);continue}
    try{S.billImgs[v]=await shrinkImage(f,320);ok.push(v+' €')}catch{bad.push(f.name)}
  }
  save();refreshBills();
  toast((ok.length?`Cargados: ${ok.join(', ')}. `:'')+(bad.length?`No reconocidos: ${bad.join(', ')} (el nombre debe incluir el valor, p. ej. 20.jpg)`:''));
}
// Doble toque: cambiar una pieza por otras de menor valor
const CHANGE={c2:['c1','c1'],c5:['c2','c2','c1'],c10:['c5','c5'],c20:['c10','c10'],c50:['c20','c20','c10'],c100:['c50','c50'],c200:['c100','c100'],
  b5:['c200','c200','c100'],b10:['b5','b5'],b20:['b10','b10'],b50:['b20','b20','b10'],b100:['b50','b50'],b200:['b100','b100']};
const fmtEur=c=>(c/100).toLocaleString('es-ES',{style:'currency',currency:'EUR'});
const eurTotal=()=>pieces(null,'eur').reduce((s,p)=>s+KINDS[p.dataset.k].v,0);
let eurui=null;
function updateEur(){if(eurui)eurui.tot.textContent=eurui.show?fmtEur(eurTotal()):'? €'}
function eurClear(){pieces(null,'eur').forEach(p=>p.remove());updateEur()}
function arrangeEur(){
  const list=pieces(null,'eur').sort((a,b)=>KINDS[b.dataset.k].v-KINDS[a.dataset.k].v);
  let x=20,y=20,rowH=0,prev=null;
  for(const p of list){
    const K=KINDS[p.dataset.k],bill=p.dataset.k[0]==='b';
    if((prev!==null&&bill!==prev)||x+K.w>stage.clientWidth-20){x=20;y+=rowH+14;rowH=0}
    p.classList.add('anim');p.style.left=x+'px';p.style.top=y+'px';
    x+=K.w+(bill?14:10);rowH=Math.max(rowH,K.h);prev=bill;
  }
  setTimeout(()=>list.forEach(p=>p.classList.remove('anim')),400);
}
const LEVELS=[['Hasta 1 €',100,1],['Hasta 10 €',1000,5],['Hasta 50 €',5000,10],['Hasta 200 €',20000,50]];
function mEur(body){
  let lvl=1,target=0;
  const tot=h('div',{class:'eurtot'}),res=h('div',{class:'res'}),tg=h('div',{class:'target'},'—');
  eurui={tot,show:true};
  const vis=h('button',{class:'btn ghost tog on',onclick:()=>{eurui.show=!eurui.show;vis.classList.toggle('on',eurui.show);updateEur()}},...ib('eye','Total'));
  const billRow=h('div',{class:'row'});
  eurui.renderBills=()=>billRow.replaceChildren(...BILLS.map(([v])=>h('button',{class:'mbtn bill','aria-label':v+' €',html:KINDS['b'+v].svg,onclick:()=>addNew('b'+v)})));
  eurui.renderBills();
  // Selector de modelo: simplificados / reales
  const info=h('div',{class:'muted',style:'font-size:15px;margin-top:8px'});
  const realBox=h('div');
  const updInfo=()=>{
    const n=BILL_VALUES.filter(billImg).length;
    realBox.style.display=S.billMode==='real'?'block':'none';
    info.textContent=`Imágenes disponibles: ${n} de 6`+(n<6?' · las que falten se ven simplificadas':'');
  };
  const modeSeg=h('div',{class:'seg'},
    h('button',{class:S.billMode!=='real'?'on':'',onclick:e=>setMode('simple',e.currentTarget)},'Simplificados'),
    h('button',{class:S.billMode==='real'?'on':'',onclick:e=>setMode('real',e.currentTarget)},'Imagen real'));
  function setMode(m,btn){S.billMode=m;save();if(m==='real')probeRepoBills();$$('button',modeSeg).forEach(b=>b.classList.toggle('on',b===btn));refreshBills();updInfo()}
  const fileIn=h('input',{type:'file',accept:'image/*',multiple:'',hidden:'',onchange:async e=>{await loadBillFiles([...e.target.files]);e.target.value='';updInfo()}});
  const spB=h('button',{class:'btn ghost tog'+(S.specimen?' on':''),onclick:()=>{S.specimen=!S.specimen;save();spB.classList.toggle('on',S.specimen);refreshBills()}},'Marca SPECIMEN');
  realBox.append(
    h('p',{class:'muted',style:'font-size:15px;text-align:left'},'Descarga las imágenes oficiales en la web del BCE y cárgalas aquí. El nombre de cada archivo debe incluir el valor (por ejemplo, 20.jpg). Las imágenes del BCE ya llevan la palabra SPECIMEN: si las usas, puedes desactivar la marca.'),
    h('div',{class:'row c'},
      h('button',{class:'btn',onclick:()=>fileIn.click()},...ib('upload','Cargar imágenes')),
      h('a',{class:'btn ghost',href:'https://www.ecb.europa.eu/euro/banknotes/images/html/index.es.html',target:'_blank',rel:'noopener',style:'display:inline-flex;align-items:center;text-decoration:none'},...ib('globe','Web del BCE')),
      spB,
      h('button',{class:'btn ghost',onclick:()=>{S.billImgs={};save();refreshBills();updInfo()}},'Borrar'),fileIn),
    info);
  const lvSeg=h('div',{class:'seg'},...LEVELS.map(([n],i)=>h('button',{class:i===lvl?'on':'',onclick:e=>{lvl=i;$$('button',lvSeg).forEach(b=>b.classList.toggle('on',b===e.currentTarget))}},n)));
  body.append(
    h('div',{class:'lbl'},'Monedas'),
    h('div',{class:'row'},...COINS.map(([v])=>h('button',{class:'mbtn coin','aria-label':fmtEur(v),html:KINDS['c'+v].svg,onclick:()=>addNew('c'+v)}))),
    h('div',{class:'lbl'},'Billetes'),
    billRow,
    tot,
    h('div',{class:'row c'},vis,h('button',{class:'btn ghost',onclick:arrangeEur},...ib('sort','Ordenar')),h('button',{class:'btn ghost',onclick:eurClear},...ib('trash','Vaciar'))),
    h('div',{class:'lbl',style:'margin-top:18px'},'Reto: forma esta cantidad'),lvSeg,
    h('div',{class:'row c',style:'margin-top:10px'},
      h('button',{class:'btn',onclick:()=>{const [,max,step]=LEVELS[lvl];target=(Math.floor(Math.random()*(max/step))+1)*step;tg.textContent=fmtEur(target);res.textContent=''}},...ib('target','Nuevo reto')),
      tg,
      h('button',{class:'btn',onclick:()=>{
        if(!target){res.textContent='Pulsa «Nuevo reto»';return}
        const d=eurTotal()-target;
        res.textContent=d===0?'¡Correcto!':d<0?`Faltan ${fmtEur(-d)}`:`Sobran ${fmtEur(d)}`;
        res.style.color=d===0?'#2f9e44':'var(--danger)';
      }},...ib('check','Comprobar'))),
    res,
    h('p',{class:'muted',style:'font-size:15px;margin:12px 0 0'},'Toca dos veces una moneda o un billete para cambiarlo por otros de menor valor'),
    h('div',{class:'lbl',style:'margin-top:18px'},'Modelo de billetes'),modeSeg,realBox);
  updateEur();updInfo();
  return()=>{eurui=null};
}
tool({id:'eur',group:'mates',order:40,icon:'euro',label:'Dinero',title:'Monedas y billetes',build:mEur,w:640,clear:eurClear});
