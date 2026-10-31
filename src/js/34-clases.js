/* ============ Clases (varias listas de alumnos) ============ */
// La clase activa vive en S.students / S.roles / S.offset; S.classes guarda todas.
if(!Array.isArray(S.classes)||!S.classes.length){S.classes=[{name:'Mi clase',students:S.students,roles:S.roles,offset:S.offset||0}];S.cls=0}
S.cls=clamp(S.cls|0,0,S.classes.length-1);
function syncClass(){const c=S.classes[S.cls];if(c){c.students=S.students;c.roles=S.roles;c.offset=S.offset}}
function switchClass(i){
  syncClass();S.cls=i;const c=S.classes[i];
  S.students=c.students||[];S.roles=c.roles||[];S.offset=c.offset||0;pool=[];save();
  ['picker','groups','roles'].forEach(id=>{if(wins.has(id)){const w=RAIL.find(r=>r[0]===id);closeWin(id);openWin(id,w[3],w[4],w[5])}});
  renderClassChip();toast('Clase: '+c.name);
}
function renderClassChip(){
  const ch=$('#clsChip');if(!ch)return;
  ch.style.display=S.classes.length>1?'inline-flex':'none';
  ch.replaceChildren(ico('users'),S.classes[S.cls].name+' ▾');
}
$('#clsChip').addEventListener('click',e=>openPop('cls',e.currentTarget,1,S.classes.map((c,i)=>h('button',{class:'wide'+(i===S.cls?' on':''),onclick:()=>{closePop();if(i!==S.cls)switchClass(i)}},c.name)),'below'));

