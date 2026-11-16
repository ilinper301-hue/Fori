/* ============ Construcción de la interfaz ============ */
const SHAPES=[['line','╱','Línea'],['rect','▭','Rectángulo'],['square','□','Cuadrado'],['circle','◯','Círculo'],['ellipse','⬭','Elipse'],['triangle','△','Triángulo'],['pentagon','⬠','Pentágono'],['hexagon','⬡','Hexágono']];
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
  const sc=$('.szc i');if(sc)sc.style.width=sc.style.height=(T.size*1.6+4)+'px';
  dr.style.cursor=T.tool==='text'?'text':T.tool==='select'?'move':'crosshair';
  if(T.tool!=='select')setSel(null);
}
function setSize(s){T.size=s;refreshTools();if(editor){editor.fs=FS[s];editor.ta.style.fontSize=FS[s]+'px';sizeEditor()}}
const fillLabel=()=>T.fill?'◼ Con relleno':'◻ Sin relleno';
const shapeNodes=()=>[
  ...SHAPES.map(([id,ic,nm])=>h('button',{title:nm,'aria-label':nm,class:id===T.shape?'on':'',onclick:()=>{T.shape=id;T.tool='shape';refreshTools();closePop()}},ic)),
  h('button',{class:'wide'+(T.fill?' on':''),onclick:e=>{T.fill=!T.fill;e.currentTarget.classList.toggle('on',T.fill);e.currentTarget.textContent=fillLabel()}},fillLabel())
];
const colorNodes=()=>[colorPicker()]; // ruleta de color (ver 33b-selector-color.js)
function toolBtn(tool,icon,label){
  const extra=tool==='shape'?{'data-pop':'shape'}:{};
  return h('button',{class:'tool','data-tool':tool,...extra,onclick:e=>{
    commitEditor();T.tool=tool;refreshTools();
    if(tool==='shape')openPop('shape',e.currentTarget,4,shapeNodes());else closePop();
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
    ...[[3,'Fino',6],[6,'Medio',12],[12,'Grueso',22]].map(([s,n,d])=>h('button',{class:'sz','data-s':s,'aria-label':n,onclick:()=>setSize(s)},h('i',{style:`width:${d}px;height:${d}px`}))),
    // cuando no caben los tres grosores (ver 35b-pantallas-pequenas.js), este botón los recorre
    h('button',{class:'tool szc','aria-label':'Grosor',title:'Grosor',onclick:()=>setSize(T.size===3?6:T.size===6?12:3)},h('i')));
  renderRecent();refreshTools();updatePageUI();
}
const BGS=[['plain','Liso'],['grid','Cuadrícula'],['dots','Puntos'],['lines','Pauta doble línea'],['montessori','Pauta Montessori'],['cuadrovia','Cuadrovía']];
function resetTools(){
  commitEditor();closeAllWins();REG.tools.forEach(t=>t.clear&&t.clear());
  closePop();setSel(null);refreshRail();toast('Herramientas reiniciadas');
}
function buildDock(){
  const dock=$('#dock');
  const bgLabel=()=>`${BGS.find(b=>b[0]===P().bg)[1]}${P().img?' + imagen':''} ▾`;
  const setBg=()=>bgBtn.replaceChildren(...ib('layers',bgLabel()));
  const bgBtn=h('button',{class:'dbtn','data-pop':'bg',id:'bgBtn',title:'Fondo',onclick:e=>openPop('bg',e.currentTarget,1,[
    ...BGS.map(([id,lb])=>h('button',{class:'wide'+(P().bg===id?' on':''),onclick:()=>{P().bg=id;drawBg();persist();setBg();closePop()}},lb)),
    h('button',{class:'wide',onclick:()=>{
      closePop();
      if(P().img){P().img=null;drawBg();persist();setBg()}
      else $('#bgFile').click();
    }},...ib('image',P().img?'Quitar imagen de fondo':'Poner imagen de fondo')),
    h('div',{class:'popsep'},'Pizarra dividida'),
    ...[[1,'Una sola zona'],[2,'Dividir en 2 zonas'],[3,'Dividir en 3 zonas'],[4,'Dividir en 4 zonas']].map(([n,lb])=>h('button',{class:'wide'+(ZN.n===n?' on':''),onclick:()=>{closePop();setZones(n)}},...ib('zones'+n,lb)))],'above')});
  $('#bgFile').addEventListener('change',async e=>{
    const f=e.target.files[0];if(!f)return;e.target.value='';
    await setBgImage(f);setBg();
  });
  const pageBtn=h('button',{class:'dbtn','data-pop':'page',id:'pageLbl',onclick:e=>openPop('page',e.currentTarget,1,[
    h('button',{class:'wide',onclick:()=>{closePop();addPage(false)}},...ib('plus','Página nueva')),
    h('button',{class:'wide',onclick:()=>{closePop();addPage(true)}},...ib('copy','Duplicar esta página')),
    h('button',{class:'wide',onclick:()=>{closePop();deletePage()}},...ib('trash','Borrar esta página')),
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

