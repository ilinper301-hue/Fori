/* ============ Notas adhesivas ============ */
const NOTE_COLORS=['#ffe66d','#ff9fb2','#9be7a5','#9fd3ff','#ffc078','#d0bfff'];let noteN=0;
function addNote(){
  let ci=noteN%NOTE_COLORS.length;const k=noteN++%6;
  const nb=h('div',{class:'nb',contenteditable:'true',spellcheck:'false'});
  const n=h('div',{class:'note',style:`background:${NOTE_COLORS[ci]};left:${120+k*40}px;top:${70+k*36}px;z-index:${++zTop}`});
  const head=h('div',{class:'nh'},
    h('button',{'aria-label':'Color',onclick:()=>{ci=(ci+1)%NOTE_COLORS.length;n.style.background=NOTE_COLORS[ci]}},ico('palette')),
    h('button',{'aria-label':'Borrar',onclick:()=>n.remove()},ico('x')));
  n.append(head,nb);floaters.append(n);makeDrag(head,n);
  n.addEventListener('pointerdown',()=>n.style.zIndex=++zTop);nb.focus();
}
tool({id:'note',group:'apoyo',order:20,icon:'note',label:'Nota',run:addNote,clear:()=>$$('.note').forEach(n=>n.remove())});
