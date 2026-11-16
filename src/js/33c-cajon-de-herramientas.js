/* ============ Cajón de herramientas, favoritas y barra derecha ============ */
// El cajón enseña todas las herramientas del registro por grupos. Las favoritas son las que salen en la barra derecha.
// S.favs: lista de ids (ajuste nuevo y opcional). Si no existe, son las de siempre: las del aula y las de apoyo.
const TOOL_GROUPS=[['aula','Aula'],['apoyo','Apoyo'],['mates','Matemáticas']];
const favIds=()=>Array.isArray(S.favs)?S.favs:[...toolsOf('aula'),...toolsOf('apoyo')].map(t=>t.id);
const favTools=()=>{const f=new Set(favIds());return TOOL_GROUPS.flatMap(([g])=>toolsOf(g).filter(t=>f.has(t.id)))}; // en el orden del cajón
let favShown=[]; // las favoritas que caben ahora mismo en la barra
const isCompact=()=>/^[cp]$/.test(document.body.dataset.lay||''); // sin barra derecha (ver 35b-pantallas-pequenas.js)
// Barra derecha: las favoritas que quepan (con una raya entre grupos) y, siempre a la vista, el botón del cajón
function buildRight(){
  const right=$('#right'),all=favTools();
  const btn=t=>h('button',{class:'tool',...(t.build||t.on?{'data-win':t.id}:{}),'data-fav':t.id,onclick:()=>toolRun(t)},ico(t.icon),h('small',{},t.label));
  const draw=n=>{
    const list=all.slice(0,n),nodes=[];
    list.forEach((t,i)=>{if(i&&t.group!==list[i-1].group)nodes.push(h('div',{class:'sep'}));nodes.push(btn(t))});
    right.replaceChildren(...nodes,h('button',{class:'tool',id:'btnTools','data-pop':'tools',title:'Todas las herramientas',onclick:e=>openDrawer(e.currentTarget)},ico('apps'),h('small',{},'Herramientas')));
  };
  let n=all.length;draw(n);
  while(n>0&&right.scrollHeight>right.clientHeight+1)draw(--n); // si no caben todas, se quedan en el cajón las últimas
  favShown=all.slice(0,n).map(t=>t.id);
  refreshRail();
}
// Pulsación larga sobre una herramienta del cajón: la pone o la quita de la barra. La barra es lo que se ve:
// se parte de las favoritas que caben en esta pantalla, y si no cabe ninguna más, se avisa.
function toggleFav(t,b){
  const shown=favShown.slice(),prev=S.favs;
  if(shown.includes(t.id)){S.favs=shown.filter(i=>i!==t.id);save();buildRight();toast(`«${t.label}» quitada de la barra`)}
  else{
    S.favs=[...shown,t.id];buildRight();
    if(favShown.includes(t.id)){save();toast(`«${t.label}» puesta en la barra`)}
    else{S.favs=prev;if(prev===undefined)delete S.favs;buildRight();toast('No caben más en la barra: quita antes alguna')}
  }
  $$('#pop .tile').forEach(x=>x.classList.toggle('fav',favShown.includes(x.dataset.tid)));
}
function toolTile(t,canFav,tw){
  const b=h('button',{class:'tile'+(toolOn(t)?' on':'')+(canFav&&favShown.includes(t.id)?' fav':''),'data-tid':t.id,title:t.title||t.label,style:`width:${tw}px`},
    ico(t.icon),h('small',{},t.label),ico('star','fstar'));
  let timer=null,held=false,x0=0,y0=0;
  const cancel=()=>{clearTimeout(timer);timer=null;b.classList.remove('holding')};
  if(canFav){
    b.addEventListener('pointerdown',e=>{held=false;x0=e.clientX;y0=e.clientY;b.classList.add('holding');timer=setTimeout(()=>{held=true;cancel();toggleFav(t,b)},600)});
    b.addEventListener('pointermove',e=>{if(timer&&Math.hypot(e.clientX-x0,e.clientY-y0)>12)cancel()}); // si el dedo se mueve, es que está deslizando la lista
    for(const ev of ['pointerup','pointerleave','pointercancel'])b.addEventListener(ev,cancel);
  }
  b.addEventListener('click',()=>{if(held){held=false;return}closePop();toolRun(t);refreshRail()});
  return b;
}
function openDrawer(anchor){
  const compact=isCompact(),ui=S.ui||1,W=innerWidth/ui,H=innerHeight/ui,cols=W<480?3:W>=760&&H<880?6:4, // en pantallas bajas, más ancho y menos alto
    tw=Math.min(112,Math.floor((W-34-(cols-1)*6)/cols)),nodes=[]; // que quepa a lo ancho en cualquier móvil
  TOOL_GROUPS.forEach(([g,name])=>{const ts=toolsOf(g);if(ts.length)nodes.push(h('div',{class:'popsep grp'},name),...ts.map(t=>toolTile(t,!compact,tw)))});
  if(!compact)nodes.push(h('p',{class:'pophint',style:`max-width:${cols*tw+(cols-1)*6}px`},ico('star'),' Mantén pulsada una herramienta para ponerla en la barra derecha o quitarla.'));
  nodes.push(h('button',{class:'wide',onclick:resetTools},...ib('reset','Reiniciar herramientas')));
  openPop('tools',anchor,cols,nodes,compact?'above':'left');
}
