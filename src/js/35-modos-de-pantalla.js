/* ============ Modos de pantalla: completa · mínima · libre ============ */
const VIEWS=[['full','view','Completa: todas las herramientas'],['mini','pen','Mínima: pantalla libre y barra pequeña'],['clean','full','Libre: sin herramientas']];
const mini=$('#mini');
const viewNodes=()=>VIEWS.map(([v,ic,lb])=>h('button',{class:'wide'+((S.view||'full')===v?' on':''),onclick:()=>{closePop();setView(v)}},...ib(ic,lb)));
function setView(v){
  commitEditor();S.view=v;save();
  document.body.classList.remove('v-mini','v-clean');if(v!=='full')document.body.classList.add('v-'+v);
  if(v==='mini')renderMini();
  if(v==='clean')toast('Mantén pulsado el botón de abajo a la derecha para volver a ver las herramientas');
}
function renderMini(){
  const tb=(tool,ic,lb)=>h('button',{'data-tool':tool,'aria-label':lb,title:lb,onclick:()=>{commitEditor();T.tool=tool;refreshTools();closePop()}},ico(ic));
  mini.replaceChildren(
    h('span',{class:'grip','aria-label':'Mover la barra'},ico('grip')),
    tb('pen','pen','Lápiz'),tb('marker','marker','Fluorescente'),tb('eraser','eraser','Borrador'),tb('text','text','Texto'),
    ...S.recent.slice(0,4).map(c=>h('button',{class:'sw msw','data-c':c,'aria-label':'Color',style:`background:${cssColor(c)}`,onclick:()=>setColor(c)})),
    h('button',{'data-pop':'color','aria-label':'Más colores',onclick:e=>openPop('color',e.currentTarget,6,colorNodes(),'above')},h('span',{class:'curc',style:'width:34px;height:34px;border-width:5px'})),
    h('button',{'aria-label':'Grosor',onclick:()=>{T.size=T.size===3?6:T.size===6?12:3;refreshTools();renderMini()}},h('i',{class:'mdot',style:`width:${T.size*1.6+4}px;height:${T.size*1.6+4}px`})),
    h('button',{'aria-label':'Deshacer',onclick:undo},ico('undo')),h('button',{'aria-label':'Rehacer',onclick:redo},ico('redo')),
    h('button',{'data-pop':'view','aria-label':'Modo de pantalla',onclick:e=>openPop('view',e.currentTarget,1,viewNodes(),'above')},ico('view')));
  refreshTools();placeMini();
}
function placeMini(){
  const p=S.miniPos||{x:(innerWidth-mini.offsetWidth)/2,y:innerHeight-mini.offsetHeight-16};
  mini.style.left=clamp(p.x,0,innerWidth-mini.offsetWidth)+'px';mini.style.top=clamp(p.y,0,innerHeight-mini.offsetHeight)+'px';
}
(()=>{ // arrastrar la barra mínima por su asa
  let d=null;
  mini.addEventListener('pointerdown',e=>{if(!e.target.closest('.grip'))return;d={dx:e.clientX-mini.offsetLeft,dy:e.clientY-mini.offsetTop};mini.setPointerCapture(e.pointerId)});
  mini.addEventListener('pointermove',e=>{if(!d)return;S.miniPos={x:e.clientX-d.dx,y:e.clientY-d.dy};placeMini()});
  const end=()=>{if(d){d=null;save()}};mini.addEventListener('pointerup',end);mini.addEventListener('pointercancel',end);
  addEventListener('resize',()=>{if(S.view==='mini')placeMini()});
})();
$('#btnView').addEventListener('click',e=>openPop('view',e.currentTarget,1,viewNodes(),'below'));
(()=>{ // modo libre: el botón de la esquina necesita pulsación larga (evita toques de los alumnos)
  const b=$('#cornerBtn');let t=null,fired=false;
  b.addEventListener('pointerdown',()=>{fired=false;b.classList.add('holding');t=setTimeout(()=>{fired=true;b.classList.remove('holding');openPop('view',b,1,viewNodes(),'above')},600)});
  const cancel=()=>{clearTimeout(t);b.classList.remove('holding')};
  b.addEventListener('pointerup',()=>{cancel();if(!fired)toast('Mantén pulsado para ver las herramientas')});
  b.addEventListener('pointerleave',cancel);b.addEventListener('pointercancel',cancel);
})();

