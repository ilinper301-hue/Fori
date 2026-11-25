/* ============ Construcción de la interfaz ============ */
const PALETTE=['ink','#000000','#ffffff','#868e96','#8d5524','#f783ac',
  '#c92a2a','#e03131','#ff6b6b','#e8590c','#f08c00','#fcc419',
  '#2b8a3e','#2f9e44','#69db7c','#0ca678','#15aabf','#74c0fc',
  '#1864ab','#1e6fe0','#4263eb','#7048e8','#ae3ec9','#e64980'];
const cssColor=c=>c==='ink'?'var(--ink)':c;
const pop=$('#pop');let popOwner=null;
function closePop(){pop.style.display='none';popOwner=null}
// place: 'right' (barra izquierda), 'left' (barra derecha), 'above' (barra inferior) o 'below' (barra superior)
function openPop(owner,anchor,cols,nodes,place){
  if(popOwner===owner){closePop();return}
  if(place===true)place='above';
  pop.replaceChildren(...nodes);pop.style.gridTemplateColumns=`repeat(${cols},auto)`;
  pop.style.display='grid';popOwner=owner;
  const r=anchor.getBoundingClientRect();
  if(!place&&r.right+10+pop.offsetWidth>innerWidth-8)place='above'; // sin sitio a la derecha (barra de dibujo abajo, en el móvil): encima
  if(place==='above'||place==='below'){
    pop.style.left=clamp(r.left,8,innerWidth-pop.offsetWidth-8)+'px';
    pop.style.top=(place==='above'?Math.max(8,r.top-pop.offsetHeight-10):r.bottom+10)+'px';
  }else if(place==='left'){
    pop.style.left=Math.max(8,r.left-pop.offsetWidth-10)+'px';
    pop.style.top=clamp(r.bottom-pop.offsetHeight,8,Math.max(8,innerHeight-pop.offsetHeight-8))+'px';
  }else{
    pop.style.left=(r.right+10)+'px';
    pop.style.top=clamp(r.top,8,innerHeight-pop.offsetHeight-8)+'px';
  }
}
// remember=true: el color se añade a los recientes de la barra lateral
function setColor(c,remember){
  T.color=c;if(T.tool==='eraser'||(T.tool==='select'&&!sel))T.tool='pen';
  if(remember&&!S.recent.includes(c)){S.recent=[c,...S.recent].slice(0,6);save();renderRecent()}
  if(sel&&sel.color!==undefined&&sel.color!==c){const b={...sel,color:c};record({t:'rep',a:sel,b});P().strokes[P().strokes.indexOf(sel)]=b;setSel(b);changed()}
  refreshTools();
}
function renderRecent(){
  const r=$('#recent');if(!r)return;
  r.replaceChildren(...S.recent.map(c=>h('button',{class:'sw','data-c':c,'aria-label':'Color',style:`background:${cssColor(c)}`,onclick:()=>setColor(c)})));
}
function refreshTools(){
  $$('[data-tool]').forEach(b=>b.classList.toggle('on',b.dataset.tool===T.tool));
  $$('.sw').forEach(b=>b.classList.toggle('on',b.dataset.c===T.color));
  $$('.sz').forEach(b=>b.classList.toggle('on',Number(b.dataset.s)===T.size));
  const cc=$('.curc');if(cc)cc.style.setProperty('--c',cssColor(T.color));
  const sc=$('.szc i');if(sc)sc.style.width=sc.style.height=sizeDot(T.size)+'px';
  dr.style.cursor=T.tool==='text'?'text':T.tool==='select'?'move':'crosshair';
  if(T.tool!=='select')setSel(null);
}
function setSize(s){T.size=s;refreshTools();if(editor){editor.fs=fsOf(s);editor.ta.style.fontSize=editor.fs+'px';sizeEditor()}}
const fillLabel=()=>T.fill?'◼ Con relleno':'◻ Sin relleno';
const shapeNodes=()=>[
  ...[['linea','Líneas'],['plana','Planas'],['cuerpo','Cuerpos']].flatMap(([g,name])=>[
    h('div',{class:'popsep grp'},name),
    ...formasOf(g).map(f=>h('button',{title:f.label,'aria-label':f.label,'data-shape':f.id,class:f.id===T.shape?'on':'',onclick:()=>{T.shape=f.id;T.tool='shape';refreshTools();closePop()}},h('span',{html:formaIcon(f)})))]),
  h('button',{class:'wide'+(T.fill?' on':''),onclick:e=>{T.fill=!T.fill;e.currentTarget.classList.toggle('on',T.fill);e.currentTarget.textContent=fillLabel()}},fillLabel())
];
const shapeCols=()=>innerHeight/(S.ui||1)<640?6:4; // en pantallas bajas, más columnas para que quepan sin deslizar tanto
const colorNodes=()=>[colorPicker()]; // ruleta de color (ver 33b-selector-color.js)
function toolBtn(tool,icon,label){
  const extra=tool==='shape'?{'data-pop':'shape'}:{};
  return h('button',{class:'tool','data-tool':tool,...extra,onclick:e=>{
    commitEditor();T.tool=tool;refreshTools();
    if(tool==='shape')openPop('shape',e.currentTarget,shapeCols(),shapeNodes());else closePop();
  }},ico(icon,'ic'),h('small',{},label));
}
function buildLeft(){
  $('#left').replaceChildren(
    toolBtn('pen','pen','Lápiz'),toolBtn('marker','marker','Fluor'),toolBtn('eraser','eraser','Borrador'),
    toolBtn('shape','shapes','Formas'),toolBtn('text','text','Texto'),toolBtn('select','select','Mover'),
    h('div',{class:'pair'},
      h('button',{class:'tool half',id:'btnUndo','aria-label':'Deshacer',onclick:undo},ico('undo')),
      h('button',{class:'tool half',id:'btnRedo','aria-label':'Rehacer',onclick:redo},ico('redo'))),
    h('div',{class:'sep'}),
    h('button',{class:'tool','data-pop':'color',onclick:e=>openPop('color',e.currentTarget,1,colorNodes())},h('span',{class:'curc'}),h('small',{},'Colores')),
    h('div',{class:'grid2',id:'recent'}),
    h('div',{class:'sep'}),
    // toque: ese grosor; pulsación larga: barra para elegir cualquier grosor (ver 33d-grosor.js)
    ...[[3,'Fino',6],[6,'Medio',12],[12,'Grueso',22]].map(([s,n,d])=>sizeHold(h('button',{class:'sz','data-s':s,'aria-label':n,title:n+' · mantén pulsado para elegir el grosor',onclick:e=>{if(!wasHeld(e))setSize(s)}},h('i',{style:`width:${d}px;height:${d}px`})))),
    // cuando no caben los tres grosores (ver 35b-pantallas-pequenas.js), este botón los recorre
    sizeHold(h('button',{class:'tool szc','aria-label':'Grosor',title:'Grosor · mantén pulsado para elegir el grosor',onclick:e=>{if(!wasHeld(e))setSize(nextSize())}},h('i'))));
  renderRecent();refreshTools();updatePageUI();
}
/* --- Menú de fondo ---
   Teselas con vista previa, por apartados (Pautas, Plantillas). Toque corto: pone ese fondo con el último tamaño usado
   para él (S.bgLast[id]) o, si no hay, el de Ajustes. Pulsación larga (600 ms): el mismo menú cambia a las opciones
   del fondo (en las pautas, el tamaño); elegir una pone fondo y opción en esta página y cierra. */
const bgLabel=()=>`${fondoOf(P().bg).label}${P().img?' + imagen':''} ▾`;
const refreshBgBtn=()=>{const b=$('#bgBtn');if(b)b.replaceChildren(...ib('layers',bgLabel()))};
const bgTapOpt=f=>{const o=S.bgLast&&S.bgLast[f.id];return bgoOk(o)?o:undefined}; // la opción de un toque corto (undefined = la por defecto)
let bgHeldAt=0; // para que soltar el dedo tras la pulsación larga no pulse sin querer una opción del menú nuevo
function bgSet(f,opt,remember){
  const p=P();p.bg=f.id;
  if(opt===undefined)delete p.bgo;else p.bgo=opt;
  // una plantilla se encaja en la página: en una vacía, su tamaño queda fijo desde ahora (no se mueve al girar la pantalla)
  if(f.group==='plantilla'&&!p.strokes.length){p.size={w:stage.clientWidth,h:stage.clientHeight};p.v=viewId()}
  fitPage(p);
  if(remember&&opt!==undefined){(S.bgLast=S.bgLast||{})[f.id]=opt;save()}
  drawBg();persist();refreshBgBtn();closePop();
}
function bgThumb(f,w,hh){
  const c=h('canvas',{class:'bgth','aria-hidden':'true'}),dpr=devicePixelRatio||1,z=.4; // se pinta con el mismo paint, a menor escala
  c.width=Math.round(w*dpr);c.height=Math.round(hh*dpr);c.style.width=w+'px';c.style.height=hh+'px';
  const x=c.getContext('2d'),dark=document.documentElement.dataset.theme==='dark';x.scale(dpr,dpr);
  if(f.group==='plantilla'){ // una página entera (con la forma de la pizarra) reducida y centrada en la tesela
    const W=stage.clientWidth||1,H=stage.clientHeight||1,L={w:240,h:Math.max(60,Math.min(480,240*H/W))},k=Math.min(w/L.w,hh/L.h);
    x.translate((w-L.w*k)/2,(hh-L.h*k)/2);x.scale(k,k);
    paintBg(x,0,0,L.w,L.h,f.id,dark,bgTapOpt(f),L);
  }else{x.scale(z,z);paintBg(x,0,0,w/z,hh/z,f.id,dark,bgTapOpt(f))}
  return c;
}
function bgTile(f,tw,anchor){
  const b=h('button',{class:'tile bgt'+(P().bg===f.id?' on':''),title:f.label,'data-bg':f.id,style:`width:${tw}px`},bgThumb(f,tw-12,50),h('small',{},f.label));
  let timer=null,held=false,x0=0,y0=0;
  const cancel=()=>{clearTimeout(timer);timer=null;b.classList.remove('holding')};
  if(f.opts&&f.opts.length){
    b.addEventListener('pointerdown',e=>{held=false;x0=e.clientX;y0=e.clientY;b.classList.add('holding');timer=setTimeout(()=>{held=true;cancel();bgHeldAt=performance.now();bgOptions(f,anchor,tw)},600)});
    b.addEventListener('pointermove',e=>{if(timer&&Math.hypot(e.clientX-x0,e.clientY-y0)>12)cancel()}); // si el dedo se mueve, desliza la lista
    for(const ev of ['pointerup','pointerleave','pointercancel'])b.addEventListener(ev,cancel);
  }
  b.addEventListener('click',()=>{
    if(held){held=false;return}
    if(P().bg===f.id)closePop();else bgSet(f,bgTapOpt(f));
  });
  return b;
}
function bgOptions(f,anchor){
  const p=P(),cur=fondoOpt(f,p.bg===f.id?p.bgo:bgTapOpt(f));
  closePop();
  openPop('bg',anchor,1,[
    h('button',{class:'wide',onclick:()=>{if(performance.now()-bgHeldAt<400)return;closePop();bgMenu(anchor)}},`‹ Volver · ${f.label}`),
    ...f.opts.map(([v,lb])=>h('button',{class:'wide'+(v===cur?' on':''),onclick:()=>{if(performance.now()-bgHeldAt<400)return;bgSet(f,v,true)}},lb))],'above');
}
function bgMenu(anchor){
  const W=innerWidth/(S.ui||1),tw=Math.min(104,Math.floor((W-34-12)/3)),nodes=[]; // tres columnas que caben a lo ancho en cualquier móvil
  for(const [g,name] of [['pauta','Pautas'],['plantilla','Plantillas']]){
    const fs=fondosOf(g);if(fs.length)nodes.push(h('div',{class:'popsep grp'},name),...fs.map(f=>bgTile(f,tw,anchor)));
  }
  nodes.push(
    h('button',{class:'wide',onclick:()=>{
      closePop();
      if(P().img){P().img=null;drawBg();persist();refreshBgBtn()}
      else $('#bgFile').click();
    }},...ib('image',P().img?'Quitar imagen de fondo':'Poner imagen de fondo')),
    h('div',{class:'popsep'},'Pizarra dividida'),
    ...[[1,'Una sola zona'],[2,'Dividir en 2 zonas'],[3,'Dividir en 3 zonas'],[4,'Dividir en 4 zonas']].map(([n,lb])=>h('button',{class:'wide'+(ZN.n===n?' on':''),onclick:()=>{closePop();setZones(n)}},...ib('zones'+n,lb))),
    h('p',{class:'pophint',style:`max-width:${3*tw+12}px`},'Mantén pulsado un fondo para cambiar su tamaño.'));
  openPop('bg',anchor,3,nodes,'above');
}
function resetTools(){
  commitEditor();closeAllWins();REG.tools.forEach(t=>t.clear&&t.clear());
  closePop();setSel(null);refreshRail();toast('Herramientas reiniciadas');
}
function buildDock(){
  const dock=$('#dock');
  const setBg=refreshBgBtn;
  const bgBtn=h('button',{class:'dbtn','data-pop':'bg',id:'bgBtn',title:'Fondo',onclick:e=>bgMenu(e.currentTarget)});
  $('#bgFile').addEventListener('change',async e=>{
    const f=e.target.files[0];if(!f)return;e.target.value='';
    await setBgImage(f);setBg();
  });
  const pageBtn=h('button',{class:'dbtn','data-pop':'page',id:'pageLbl',onclick:e=>openPop('page',e.currentTarget,1,[
    h('button',{class:'wide',onclick:()=>{closePop();openPagesView()}},...ib('pages','Ver todas las páginas')),
    h('button',{class:'wide',onclick:()=>{closePop();addPage(false)}},...ib('plus','Página nueva')),
    h('button',{class:'wide',onclick:()=>{closePop();addPage(true)}},...ib('copy','Duplicar esta página')),
    h('button',{class:'wide',onclick:()=>{closePop();deletePage()}},...ib('trash','Borrar esta página')),
    h('button',{class:'wide',onclick:()=>{closePop();deleteAllPages()}},...ib('trash','Borrar todas las páginas')),
    h('button',{class:'wide',onclick:()=>{closePop();exportPNG()}},...ib('image','Guardar página como imagen')),
    h('button',{class:'wide',onclick:()=>{closePop();exportPDF()}},...ib('pdf','Guardar todas en PDF')),
    ...REG.pageMenu.map(f=>f())],'above')});
  dock.replaceChildren(
    bgBtn,h('button',{class:'dbtn','data-pop':'ins',title:'Insertar',onclick:e=>openPop('ins',e.currentTarget,1,insertNodes(),'above')},...ib('plus','Insertar ▾')),
    // el cajón de herramientas se abre desde la barra derecha; aquí solo se ve cuando esa barra no está (pantallas pequeñas)
    h('button',{class:'dbtn d-tools','data-pop':'tools',title:'Herramientas',onclick:e=>openDrawer(e.currentTarget)},...ib('apps','Herramientas')),
    h('span',{id:'tray'}),h('span',{class:'dsep'}),
    h('button',{class:'dbtn nav','aria-label':'Página anterior',onclick:()=>gotoPage(cur-1)},ico('left')),
    pageBtn,
    h('button',{class:'dbtn nav','aria-label':'Página siguiente',onclick:()=>cur<pages.length-1?gotoPage(cur+1):addPage(false)},ico('right')),
    h('span',{class:'sp'}),
    h('button',{class:'dbtn d-reset',title:'Reiniciar herramientas',onclick:resetTools},...ib('reset','Reiniciar')),
    h('button',{class:'dbtn danger',title:'Limpiar la página',onclick:clearBoard},...ib('trash','Limpiar')));
  REG.pageUI.push(setBg,fitDock); // al cambiar de página se actualiza la etiqueta del fondo (y puede cambiar lo que cabe)
  updatePageUI();
}

