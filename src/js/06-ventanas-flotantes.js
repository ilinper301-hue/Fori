/* ============ Ventanas flotantes ============ */
const floaters=$('#floaters'),wins=new Map();let zTop=10;
function makeDrag(handle,el){
  let d=null;
  handle.addEventListener('pointerdown',e=>{
    if(e.target.closest('button'))return;
    d={x:e.clientX-el.offsetLeft,y:e.clientY-el.offsetTop};handle.setPointerCapture(e.pointerId);el.style.zIndex=++zTop;
  });
  handle.addEventListener('pointermove',e=>{
    if(!d)return;
    el.style.left=clamp(e.clientX-d.x,-el.offsetWidth+90,stage.clientWidth-90)+'px';
    el.style.top=clamp(e.clientY-d.y,0,stage.clientHeight-50)+'px';
  });
  const end=()=>d=null;handle.addEventListener('pointerup',end);handle.addEventListener('pointercancel',end);
}
const WIN_COLOR={mates:'var(--coral)',aula:'var(--yellow)'}; // color de la cabecera según el grupo de la herramienta
const toolOn=t=>t.on?t.on():wins.has(t.id);
const toolRun=t=>t.run?t.run():openWin(t.id,t.title,t.build,t.w);
const openTool=id=>toolRun(toolById(id));
function refreshRail(){setTimeout(renderTray);$$('[data-win]').forEach(b=>{const t=toolById(b.dataset.win);b.classList.toggle('on',t?toolOn(t):wins.has(b.dataset.win))})}
function openWin(id,title,build,w=400){
  if(wins.has(id)){const w=wins.get(id);if(w.min)restoreWin(id);else closeWin(id);return}
  const n=wins.size%6,ui=S.ui||1;
  const body=h('div',{class:'body'});
  const ww=Math.round(w*ui),x=Math.max(4,Math.min(40+n*34,stage.clientWidth-ww-8)); // en pantallas estrechas, que no nazca fuera
  const win=h('div',{class:'win',style:`width:${ww}px;left:${x}px;top:${24+n*34}px;z-index:${++zTop}`},
    h('header',{},h('span',{},title),h('button',{class:'x','aria-label':'Minimizar',title:'Minimizar',onclick:()=>minimizeWin(id)},ico('minus')),h('button',{class:'x','aria-label':'Cerrar',onclick:()=>closeWin(id)},ico('x'))),body);
  win.style.setProperty('--wc',WIN_COLOR[(toolById(id)||{}).group]||'var(--teal)');
  floaters.append(win);
  makeDrag($('header',win),win);
  win.addEventListener('pointerdown',()=>win.style.zIndex=++zTop);
  wins.set(id,{win,cleanup:build(body)||null});
  refreshRail();renderTray();
}
function closeWin(id){const w=wins.get(id);if(!w)return;w.cleanup&&w.cleanup();w.win.remove();wins.delete(id);refreshRail();renderTray()}
function minimizeWin(id){const w=wins.get(id);if(!w)return;w.min=true;w.win.style.display='none';refreshRail();renderTray()}
function restoreWin(id){const w=wins.get(id);if(!w)return;w.min=false;w.win.style.display='';w.win.style.zIndex=++zTop;refreshRail();renderTray()}
// Barra inferior: un botón por cada herramienta de matemáticas abierta (minimizar / recuperar con un toque)
function renderTray(){
  const tray=$('#tray');if(!tray)return;
  const items=toolsOf('mates').filter(toolOn);
  tray.replaceChildren(...items.map(m=>{
    const w=wins.get(m.id),obj=m.obj?m.obj():null;
    const hidden=w?w.min:obj?obj.el.style.display==='none':false;
    return h('button',{class:'dbtn tray'+(hidden?' min':' on'),title:hidden?'Mostrar':'Minimizar',onclick:()=>{
      if(w){w.min?restoreWin(m.id):minimizeWin(m.id)}
      else if(obj){obj.el.style.display=hidden?'':'none';renderTray()}
    }},...ib(m.icon,m.label));
  }));
  tray.style.display=items.length?'flex':'none';
  fitDock();
}
const closeAllWins=()=>[...wins.keys()].forEach(closeWin);

