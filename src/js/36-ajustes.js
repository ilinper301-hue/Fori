/* ============ Ajustes ============ */
const dlg=$('#settings');
['Lunes','Martes','Miércoles','Jueves','Viernes'].forEach((n,i)=>$('#sSched').append(h('div',{},h('label',{for:'sd'+(i+1)},n),h('textarea',{id:'sd'+(i+1),rows:8,spellcheck:'false'}))));
const lines=v=>v.split('\n').map(s=>s.trim()).filter(Boolean);
let dlgCls=0; // clase que se está editando en el diálogo
function fillClassUI(){
  $('#sClass').replaceChildren(...S.classes.map((c,i)=>h('option',{value:String(i)},c.name)));
  $('#sClass').value=String(dlgCls);
  const c=S.classes[dlgCls];
  $('#sStudents').value=(c.students||[]).join('\n');$('#sRoles').value=(c.roles||[]).join('\n');
}
function readClassUI(){const c=S.classes[dlgCls];c.students=lines($('#sStudents').value);c.roles=lines($('#sRoles').value)}
function openSettings(){
  syncClass();dlgCls=S.cls;fillClassUI();
  [1,2,3,4,5].forEach(d=>$('#sd'+d).value=(S.schedule[d]||[]).join('\n'));
  $('#sTheme').value=S.theme;$('#sUi').value=String(S.ui||1);$('#sPauta').value=String(S.pautaSize||1);
  $('#sPictos').checked=S.pictos!==false;
  $('#sStart').value=S.schoolStart||'';$('#sFest').value=(S.festivos||[]).join('\n');
  dlg.showModal();
}
$('#sClass').addEventListener('change',()=>{readClassUI();dlgCls=Number($('#sClass').value);fillClassUI()});
$('#sClsNew').onclick=()=>{readClassUI();const n=prompt('Nombre de la nueva clase:','Clase '+(S.classes.length+1));if(!n)return;S.classes.push({name:n.trim(),students:[],roles:[...S.roles],offset:0});dlgCls=S.classes.length-1;fillClassUI()};
$('#sClsRen').onclick=()=>{const c=S.classes[dlgCls];const n=prompt('Nuevo nombre:',c.name);if(n)c.name=n.trim();fillClassUI()};
$('#sClsDel').onclick=()=>{
  if(S.classes.length<2){toast('Tiene que quedar al menos una clase');return}
  if(!confirm(`¿Borrar la clase «${S.classes[dlgCls].name}» y su lista de alumnos?`))return;
  S.classes.splice(dlgCls,1);if(S.cls>=dlgCls&&S.cls>0)S.cls--;dlgCls=S.cls;fillClassUI();
};
$('#sSave').onclick=()=>{
  readClassUI();
  S.schedule={};[1,2,3,4,5].forEach(d=>S.schedule[d]=lines($('#sd'+d).value));
  S.theme=$('#sTheme').value;S.ui=Number($('#sUi').value);S.pautaSize=Number($('#sPauta').value);
  S.pictos=$('#sPictos').checked;S.schoolStart=$('#sStart').value||null;S.festivos=lines($('#sFest').value);
  const c=S.classes[dlgCls];S.cls=dlgCls;S.students=c.students;S.roles=c.roles;S.offset=c.offset||0;pool=[];
  save();dlg.close();closeAllWins();applyTheme();applyUi();tickClock();renderClassChip();toast('Ajustes guardados');
};
$('#sCancel').onclick=()=>dlg.close();
$('#sExport').onclick=()=>{
  syncClass();
  const a=h('a',{href:URL.createObjectURL(new Blob([JSON.stringify(S,null,2)],{type:'application/json'})),download:'fori-datos.json'});document.body.append(a);a.click();a.remove();
};
$('#sImport').onclick=()=>$('#sFile').click();
$('#sFile').addEventListener('change',async e=>{
  const f=e.target.files[0];if(!f)return;
  try{S={...structuredClone(DEF),...JSON.parse(await f.text())};save();location.reload()}catch{toast('Archivo no válido')}
});
// Ajustes: pulsación larga para evitar toques accidentales
(()=>{
  const b=$('#btnSettings');let timer=null,fired=false;
  b.addEventListener('pointerdown',()=>{fired=false;b.classList.add('holding');timer=setTimeout(()=>{fired=true;b.classList.remove('holding');openSettings()},700)});
  const cancel=()=>{clearTimeout(timer);b.classList.remove('holding')};
  b.addEventListener('pointerup',()=>{cancel();if(!fired)toast('Mantén pulsado el botón de Ajustes para abrirlos')});
  b.addEventListener('pointerleave',cancel);b.addEventListener('pointercancel',cancel);
})();

