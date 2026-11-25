/* ============ Grosor: barra deslizante con pulsación larga ============
   Los botones de grosor (Fino, Medio, Grueso, el botón único de las pantallas pequeñas y el de la barra Mínima)
   eligen su grosor con un toque; si se mantienen pulsados 600 ms abren un panel con una barra para elegir
   cualquier grosor de GROSOR_MIN a GROSOR_MAX. Cada trazo guarda su grosor como número: no cambia ningún dato. */
const GROSOR_MIN=1,GROSOR_MAX=30;
const sizeDot=s=>Math.round(Math.min(34,s*1.6+4)); // punto que representa el grosor en los botones
const nextSize=()=>T.size<3?3:T.size<6?6:T.size<12?12:3; // el botón único recorre los tres grosores de siempre
// true si este clic es el que llega al soltar tras una pulsación larga (y entonces no hay que hacer nada más)
function wasHeld(e){const b=e.currentTarget;if(b&&b._held){b._held=false;return true}return false}
// Añade la pulsación larga a un botón de grosor. place: dónde se abre el panel; done: se llama al cambiar el grosor
function sizeHold(b,place,done){
  let timer=null,x0=0,y0=0;
  const cancel=()=>{clearTimeout(timer);timer=null;b.classList.remove('holding')};
  b.addEventListener('pointerdown',e=>{b._held=false;x0=e.clientX;y0=e.clientY;b.classList.add('holding');
    timer=setTimeout(()=>{cancel();b._held=true;sizePanel(b,place,done)},600)});
  b.addEventListener('pointermove',e=>{if(timer&&Math.hypot(e.clientX-x0,e.clientY-y0)>12)cancel()});
  for(const ev of ['pointerup','pointerleave','pointercancel'])b.addEventListener(ev,cancel);
  b.addEventListener('contextmenu',e=>e.preventDefault()); // en pantallas táctiles, la pulsación larga no abre el menú del navegador
  return b;
}
// Grosor con el que pinta de verdad la herramienta actual (igual que en 05-pizarra.js)
const sizeReal=s=>T.tool==='eraser'?Math.max(30,s*5):T.tool==='marker'?s*4+10:s;
function sizePanel(anchor,place,done){
  if(popOwner==='size')closePop();
  commitEditor();
  const W=260,H=90,dpr=devicePixelRatio||1;
  const cv=h('canvas',{class:'szp-prev',width:W*dpr,height:H*dpr,style:`width:${W}px;height:${H}px`});
  const num=h('b',{class:'szp-n'});
  const range=h('input',{type:'range',class:'szp-r',min:GROSOR_MIN,max:GROSOR_MAX,step:1,'aria-label':'Grosor'});
  range.value=clamp(Math.round(T.size),GROSOR_MIN,GROSOR_MAX);
  const paint=()=>{
    const x=cv.getContext('2d'),s=Number(range.value),lw=Math.min(H-10,sizeReal(s));
    x.setTransform(dpr,0,0,dpr,0,0);x.clearRect(0,0,W,H);
    x.lineCap=x.lineJoin='round';x.lineWidth=lw;
    const ink=getComputedStyle(document.documentElement).getPropertyValue('--ink').trim()||'#222';
    x.strokeStyle=T.tool==='eraser'?'#adb5bd':T.color==='ink'?ink:T.color;
    x.globalAlpha=T.tool==='marker'?.4:1;
    const m=Math.max(12,lw/2+4);
    x.beginPath();x.moveTo(m,H/2+12);x.bezierCurveTo(W*.35,-10,W*.6,H+10,W-m,H/2-12);x.stroke();
    num.textContent=s;
    quick.forEach(q=>q.classList.toggle('on',Number(q.dataset.q)===s));
  };
  const set=s=>{range.value=s;setSize(s);paint();if(done)done()};
  range.addEventListener('input',()=>set(Number(range.value)));
  const quick=[[3,'Fino'],[6,'Medio'],[12,'Grueso']].map(([s,n])=>h('button',{class:'szp-q','data-q':s,onclick:()=>set(s)},n));
  const nodes=[h('div',{class:'szp'},
    h('div',{class:'szp-t'},h('span',{},'Grosor'),num),
    cv,
    h('div',{class:'szp-row'},
      h('button',{class:'szp-pm','aria-label':'Más fino',onclick:()=>set(clamp(Number(range.value)-1,GROSOR_MIN,GROSOR_MAX))},ico('minus')),
      range,
      h('button',{class:'szp-pm','aria-label':'Más grueso',onclick:()=>set(clamp(Number(range.value)+1,GROSOR_MIN,GROSOR_MAX))},ico('plus'))),
    h('div',{class:'szp-qs'},...quick))];
  openPop('size',anchor,1,nodes,place);
  paint();
}
