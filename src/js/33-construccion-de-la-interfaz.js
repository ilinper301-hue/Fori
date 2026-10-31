/* ============ Construcción de la interfaz ============ */
const SHAPES=[['line','╱','Línea'],['rect','▭','Rectángulo'],['square','□','Cuadrado'],['circle','◯','Círculo'],['ellipse','⬭','Elipse'],['triangle','△','Triángulo'],['pentagon','⬠','Pentágono'],['hexagon','⬡','Hexágono']];
const PALETTE=['ink','#000000','#ffffff','#868e96','#8d5524','#f783ac',
  '#c92a2a','#e03131','#ff6b6b','#e8590c','#f08c00','#fcc419',
  '#2b8a3e','#2f9e44','#69db7c','#0ca678','#15aabf','#74c0fc',
  '#1864ab','#1e6fe0','#4263eb','#7048e8','#ae3ec9','#e64980'];
const cssColor=c=>c==='ink'?'var(--ink)':c;
const pop=$('#pop');let popOwner=null;
function closePop(){pop.style.display='none';popOwner=null}
// place: 'right' (barra izquierda), 'above' (barra inferior) o 'below' (barra superior)
function openPop(owner,anchor,cols,nodes,place){
  if(popOwner===owner){closePop();return}
  if(place===true)place='above';
  pop.replaceChildren(...nodes);pop.style.gridTemplateColumns=`repeat(${cols},auto)`;
  pop.style.display='grid';popOwner=owner;
  const r=anchor.getBoundingClientRect();
  if(place==='above'||place==='below'){
    pop.style.left=clamp(r.left,8,innerWidth-pop.offsetWidth-8)+'px';
    pop.style.top=(place==='above'?Math.max(8,r.top-pop.offsetHeight-10):r.bottom+10)+'px';
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
  dr.style.cursor=T.tool==='text'?'text':T.tool==='select'?'move':'crosshair';
  if(T.tool!=='select')setSel(null);
}
const fillLabel=()=>T.fill?'◼ Con relleno':'◻ Sin relleno';
const shapeNodes=()=>[
  ...SHAPES.map(([id,ic,nm])=>h('button',{title:nm,'aria-label':nm,class:id===T.shape?'on':'',onclick:()=>{T.shape=id;T.tool='shape';refreshTools();closePop()}},ic)),
  h('button',{class:'wide'+(T.fill?' on':''),onclick:e=>{T.fill=!T.fill;e.currentTarget.classList.toggle('on',T.fill);e.currentTarget.textContent=fillLabel()}},fillLabel())
];
const colorNodes=()=>[
  ...PALETTE.map(c=>h('button',{class:'psw'+(c===T.color?' on':''),title:c==='ink'?'Tinta (se adapta al tema)':c,'aria-label':'Color',style:`background:${cssColor(c)}`,onclick:()=>{setColor(c,true);closePop()}})),
  h('label',{class:'custom'},h('input',{type:'color',value:/^#[0-9a-f]{6}$/i.test(T.color)?T.color:'#1e6fe0',onchange:e=>{setColor(e.target.value,true);closePop()}}),'Color personalizado')
];
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
    h('button',{class:'tool','data-pop':'color',onclick:e=>openPop('color',e.currentTarget,6,colorNodes())},h('span',{class:'curc'}),h('small',{},'Colores')),
    h('div',{class:'grid2',id:'recent'}),
    h('div',{class:'sep'}),
    ...[[3,'Fino',6],[6,'Medio',12],[12,'Grueso',22]].map(([s,n,d])=>h('button',{class:'sz','data-s':s,'aria-label':n,onclick:()=>{T.size=s;refreshTools();if(editor){editor.fs=FS[s];editor.ta.style.fontSize=FS[s]+'px';sizeEditor()}}},h('i',{style:`width:${d}px;height:${d}px`}))));
  renderRecent();refreshTools();updatePageUI();
}
const pick=(a,b)=>typeof a==='function'?a:b; // usa la versión con pictogramas si está disponible
const RAIL=[
  ['picker','dice','Elegir','Alumno al azar',mPicker,440],
  ['groups','users','Grupos','Parejas y grupos',mGroups,560],
  ['roles','roles','Encargados','Encargados del día',pick(typeof mRolesP!=='undefined'&&mRolesP,mRoles),500],
  ['sched','calendar','Horario','Horario de hoy',pick(typeof mScheduleP!=='undefined'&&mScheduleP,mSchedule),540],
  ['asam','sun','Asamblea','Asamblea',typeof mAsamblea!=='undefined'?mAsamblea:null,640],
  ['sema','traffic','Semáforo','Semáforo de trabajo',typeof mSemaforo!=='undefined'?mSemaforo:null,520],
  ['timer','timer','Tiempo','Temporizador',mTimer,400],
  ['noise','sound','Ruido','Medidor de ruido',mNoise,420],
  ['score','trophy','Puntos','Contadores de equipos',mScore,560]
].filter(r=>r[4]);
function buildRight(){
  $('#right').replaceChildren(
    ...RAIL.map(([id,ic,lb,title,fn,w])=>h('button',{class:'tool','data-win':id,onclick:()=>openWin(id,title,fn,w)},ico(ic),h('small',{},lb))),
    h('div',{class:'sep'}),
    h('button',{class:'tool','data-win':'spot',onclick:()=>toggleSpot()},ico('spot'),h('small',{},'Foco')),
    h('button',{class:'tool',onclick:addNote},ico('note'),h('small',{},'Nota')));
}
const BGS=[['plain','Liso'],['grid','Cuadrícula'],['dots','Puntos'],['lines','Pauta doble línea'],['montessori','Pauta Montessori'],['cuadrovia','Cuadrovía']];
// Herramientas de matemáticas: [id, etiqueta, acción, ¿activa?]
function mathTools(){
  const W=(id,label,title,fn,w,icon)=>({id,icon,label,run:()=>openWin(id,title,fn,w),on:()=>wins.has(id)});
  const MI={prot:'protractor',line:'numline',frac:'frac',hundred:'grid',dice:'dice',geo:'geo'};
  const list=[
    W('b10','Base 10','Base 10',mB10,580,'b10'),
    W('clock','Reloj','Reloj',mClock,460,'clock'),
    {id:'ruler',icon:'ruler',label:'Regla',run:toggleRuler,on:()=>!!ruler},
    W('eur','Dinero','Monedas y billetes',mEur,640,'euro'),
    W('cuis','Regletas','Regletas de Cuisenaire',mCuis,620,'rods'),
    W('tan','Tangram','Tangram',mTangram,640,'tangram')];
  if(typeof MATH_EXTRA!=='undefined')MATH_EXTRA.forEach(m=>{const lb=m.label;list.push(m.toggle?{id:m.id,icon:MI[m.id]||'sigma',label:lb,run:m.toggle,on:m.isOn}:W(m.id,lb,m.title,m.build,m.w,MI[m.id]||'sigma'))});
  return list;
}
function buildDock(){
  const dock=$('#dock');
  const bgLabel=()=>`${BGS.find(b=>b[0]===P().bg)[1]}${P().img?' + imagen':''} ▾`;
  const setBg=()=>bgBtn.replaceChildren(...ib('layers',bgLabel()));
  const bgBtn=h('button',{class:'dbtn','data-pop':'bg',id:'bgBtn',onclick:e=>openPop('bg',e.currentTarget,1,[
    ...BGS.map(([id,lb])=>h('button',{class:'wide'+(P().bg===id?' on':''),onclick:()=>{P().bg=id;drawBg();persist();setBg();closePop()}},lb)),
    h('button',{class:'wide',onclick:()=>{
      closePop();
      if(P().img){P().img=null;drawBg();persist();setBg()}
      else $('#bgFile').click();
    }},...ib('image',P().img?'Quitar imagen de fondo':'Poner imagen de fondo')),
    h('div',{class:'popsep'},'Pizarra dividida'),
    ...[[1,'Una sola zona'],[2,'Dividir en 2 zonas'],[3,'Dividir en 3 zonas']].map(([n,lb])=>h('button',{class:'wide'+(ZN.n===n?' on':''),onclick:()=>{closePop();setZones(n)}},...ib('zones'+n,lb)))],'above')});
  $('#bgFile').addEventListener('change',async e=>{
    const f=e.target.files[0];if(!f)return;e.target.value='';
    await setBgImage(f);setBg();
  });
  const mathBtn=h('button',{class:'dbtn','data-pop':'math',onclick:e=>openPop('math',e.currentTarget,2,
    mathTools().map(m=>h('button',{class:'wide'+(m.on()?' on':''),style:'grid-column:auto;text-align:left;padding:0 16px',onclick:()=>{closePop();m.run();refreshRail()}},...ib(m.icon,m.label))),'above')},...ib('sigma','Matemáticas ▾'));
  const pageBtn=h('button',{class:'dbtn','data-pop':'page',id:'pageLbl',onclick:e=>openPop('page',e.currentTarget,1,[
    h('button',{class:'wide',onclick:()=>{closePop();addPage(false)}},...ib('plus','Página nueva')),
    h('button',{class:'wide',onclick:()=>{closePop();addPage(true)}},...ib('copy','Duplicar esta página')),
    h('button',{class:'wide',onclick:()=>{closePop();deletePage()}},...ib('trash','Borrar esta página')),
    h('button',{class:'wide',onclick:()=>{closePop();exportPNG()}},...ib('image','Guardar página como imagen')),
    h('button',{class:'wide',onclick:()=>{closePop();exportPDF()}},...ib('pdf','Guardar todas en PDF')),
    ...REG.pageMenu.map(f=>f())],'above')});
  dock.replaceChildren(
    bgBtn,h('button',{class:'dbtn','data-pop':'ins',onclick:e=>openPop('ins',e.currentTarget,1,insertNodes(),'above')},...ib('plus','Insertar ▾')),mathBtn,h('span',{id:'tray'}),h('span',{class:'dsep'}),
    h('button',{class:'dbtn nav','aria-label':'Página anterior',onclick:()=>gotoPage(cur-1)},ico('left')),
    pageBtn,
    h('button',{class:'dbtn nav','aria-label':'Página siguiente',onclick:()=>cur<pages.length-1?gotoPage(cur+1):addPage(false)},ico('right')),
    h('span',{class:'sp'}),
    h('button',{class:'dbtn',onclick:()=>{
      commitEditor();closeAllWins();b10Clear();eurClear();if(ruler)toggleRuler();
      if(typeof mathExtraClear==='function')mathExtraClear();cuisClear();tanClear();
      $$('.note').forEach(n=>n.remove());if(sp.on)toggleSpot(false);closePop();setSel(null);refreshRail();toast('Herramientas reiniciadas');
    }},...ib('reset','Reiniciar')),
    h('button',{class:'dbtn danger',onclick:clearBoard},...ib('trash','Limpiar')));
  // al cambiar de página se actualiza la etiqueta del fondo
  const upd=updatePageUI;updatePageUI=()=>{upd();setBg()};
  updatePageUI();
}

