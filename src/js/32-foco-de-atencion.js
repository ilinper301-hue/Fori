/* ============ Foco de atención ============ */
const spot=$('#spot'),spotCtl=$('#spotCtl');
const sp={on:false,x:innerWidth/2,y:innerHeight/2,r:170,shape:'circle'};
function spDraw(){
  const c=$('#hc'),r=$('#hr');
  if(sp.shape==='circle'){c.setAttribute('cx',sp.x);c.setAttribute('cy',sp.y);c.setAttribute('r',sp.r);c.style.display='';r.style.display='none'}
  else{const w=sp.r*2.6,hh=sp.r*1.5;r.setAttribute('x',sp.x-w/2);r.setAttribute('y',sp.y-hh/2);r.setAttribute('width',w);r.setAttribute('height',hh);r.setAttribute('rx',16);r.style.display='';c.style.display='none'}
}
function toggleSpot(on){
  sp.on=on===undefined?!sp.on:on;
  spot.style.display=sp.on?'block':'none';spotCtl.style.display=sp.on?'flex':'none';
  if(sp.on){sp.x=innerWidth/2;sp.y=innerHeight/2;spDraw()}
  refreshRail();
}
spotCtl.append(
  h('button',{class:'btn ghost',onclick:()=>{sp.r=Math.max(60,sp.r-30);spDraw()}},...ib('minus','Menor')),
  h('button',{class:'btn ghost',onclick:()=>{sp.r=Math.min(600,sp.r+30);spDraw()}},...ib('plus','Mayor')),
  h('button',{class:'btn ghost',onclick:()=>{sp.shape=sp.shape==='circle'?'rect':'circle';spDraw()}},...ib('square-circle','Forma')),
  h('button',{class:'btn danger',onclick:()=>toggleSpot(false)},...ib('x','Salir')));
let spDrag=false;
spot.addEventListener('pointerdown',e=>{spDrag=true;spot.setPointerCapture(e.pointerId);sp.x=e.clientX;sp.y=e.clientY;spDraw()});
spot.addEventListener('pointermove',e=>{if(spDrag){sp.x=e.clientX;sp.y=e.clientY;spDraw()}});
spot.addEventListener('pointerup',()=>spDrag=false);
spot.addEventListener('pointercancel',()=>spDrag=false);

