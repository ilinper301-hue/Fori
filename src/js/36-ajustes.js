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
  pinUI();syncClass();dlgCls=S.cls;fillClassUI();
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
  const a=h('a',{href:URL.createObjectURL(new Blob([JSON.stringify({...S,pinHash:undefined},null,2)],{type:'application/json'})),download:'fori-datos.json'});document.body.append(a);a.click();a.remove();
};
$('#sImport').onclick=()=>$('#sFile').click();
$('#sFile').addEventListener('change',async e=>{
  const f=e.target.files[0];if(!f)return;
  try{const d=JSON.parse(await f.text());if(!d||typeof d!=='object'||Array.isArray(d))throw 0;S={...structuredClone(DEF),...d,pinHash:S.pinHash};save();location.reload()}catch{toast('Archivo no válido')}
});
/* ---- PIN opcional para abrir Ajustes ---- */
const PIN_SALT='fori·ajustes·v1·',PIN_LOCK='fori-pinlock',PIN_TRIES=5,PIN_WAIT=30000;
async function hashPin(p){
  try{if(window.crypto&&crypto.subtle){const b=await crypto.subtle.digest('SHA-256',new TextEncoder().encode(PIN_SALT+p));return [...new Uint8Array(b)].map(x=>x.toString(16).padStart(2,'0')).join('')}}catch{}
  let a=0x811c9dc5;for(const ch of PIN_SALT+p){a^=ch.charCodeAt(0);a=Math.imul(a,16777619)>>>0}return 'f'+a.toString(16);
}
const pinLock={
  get(){try{const v=JSON.parse(localStorage.getItem(PIN_LOCK));return v&&typeof v==='object'?{n:v.n|0,until:Number(v.until)||0}:{n:0,until:0}}catch{return{n:0,until:0}}},
  set(v){try{localStorage.setItem(PIN_LOCK,JSON.stringify(v))}catch{}}
};
const hasPin=()=>typeof S.pinHash==='string'&&S.pinHash.length>0;
const pinOk=async p=>(await hashPin(p))===S.pinHash;
// Teclado numérico grande. Devuelve el PIN escrito (4 dígitos) o null si se cancela. Con `verify`, solo acepta un PIN correcto.
function askPin({title,hint='',verify=null}){
  return new Promise(resolve=>{
    let val='',busy=false,tick=null;
    const dots=[0,1,2,3].map(()=>h('i'));
    const msg=h('p',{class:'pin-msg',role:'status','aria-live':'polite'},hint);
    const keyBtn=(label,aria,fn,cls='')=>h('button',{type:'button',class:'pin-key '+cls,'aria-label':aria,onclick:fn},label);
    const nums=[1,2,3,4,5,6,7,8,9,0].map(n=>keyBtn(String(n),String(n),()=>press(String(n))));
    const back=keyBtn(ico('backspace'),'Borrar',()=>{if(!busy&&val){val=val.slice(0,-1);paint()}},'fn');
    const cancel=keyBtn('Cancelar','Cancelar',()=>finish(null),'fn txt');
    const pad=h('div',{class:'pin-pad'},...nums.slice(0,9),cancel,nums[9],back);
    const d=h('dialog',{class:'pindlg','aria-label':title},h('div',{class:'pin-lock'},ico('lock')),h('h2',{},title),h('div',{class:'pin-dots'},dots),msg,pad);
    const paint=()=>dots.forEach((x,i)=>x.classList.toggle('on',i<val.length));
    const left=()=>Math.max(0,pinLock.get().until-Date.now());
    const lockUI=()=>{
      clearInterval(tick);
      const upd=()=>{
        const ms=left();
        if(ms<=0){clearInterval(tick);pad.classList.remove('locked');$$('button',pad).forEach(b=>{if(b!==cancel)b.disabled=false});msg.textContent='Ya puedes intentarlo de nuevo';msg.classList.remove('bad');return}
        pad.classList.add('locked');$$('button',pad).forEach(b=>{if(b!==cancel)b.disabled=true});
        msg.textContent=`Demasiados intentos. Espera ${Math.ceil(ms/1000)} s`;msg.classList.add('bad');
      };
      upd();if(left()>0)tick=setInterval(upd,500);
    };
    function finish(v){clearInterval(tick);document.removeEventListener('keydown',onKey,true);d.close();d.remove();resolve(v)}
    async function press(n){
      if(busy||left()>0||val.length>=4)return;
      val+=n;paint();if(val.length<4)return;
      if(!verify){finish(val);return}
      busy=true;let ok=false;try{ok=await verify(val)}catch{}
      if(ok){pinLock.set({n:0,until:0});finish(val);return}
      let st=pinLock.get();st.n++;
      if(st.n>=PIN_TRIES)st={n:0,until:Date.now()+PIN_WAIT};
      pinLock.set(st);
      val='';
      dots.forEach(x=>x.classList.add('on'));d.classList.remove('shake');void d.offsetWidth;d.classList.add('shake');
      setTimeout(()=>{paint();busy=false},350);
      if(left()>0)lockUI();else{msg.textContent=`PIN incorrecto. Te quedan ${PIN_TRIES-st.n} intento${PIN_TRIES-st.n===1?'':'s'}`;msg.classList.add('bad')}
    }
    function onKey(e){
      if(/^[0-9]$/.test(e.key)){e.preventDefault();e.stopPropagation();press(e.key)}
      else if(e.key==='Backspace'){e.preventDefault();e.stopPropagation();if(!busy&&val){val=val.slice(0,-1);paint()}}
    }
    d.addEventListener('cancel',e=>{e.preventDefault();finish(null)});
    document.body.append(d);document.addEventListener('keydown',onKey,true);
    d.showModal();if(left()>0)lockUI();
  });
}
let askingPin=false;
async function requestSettings(){
  if(!hasPin()){openSettings();return}
  if(askingPin||dlg.open)return;
  askingPin=true;
  try{if(await askPin({title:'PIN para abrir Ajustes',verify:pinOk}))openSettings()}finally{askingPin=false}
}
function pinUI(){
  $('#sPinState').textContent=hasPin()?'PIN activado: se pide al abrir Ajustes.':'Sin PIN: cualquiera puede abrir Ajustes manteniendo pulsado el botón.';
  $('#sPinOnLbl').textContent=hasPin()?'Cambiar PIN':'Activar PIN';
  $('#sPinOff').style.display=hasPin()?'':'none';
}
async function newPin(){
  const a=await askPin({title:'Elige un PIN de 4 dígitos'});if(!a)return null;
  const b=await askPin({title:'Repite el PIN',hint:'Para comprobar que no te has equivocado'});if(!b)return null;
  if(a!==b){toast('Los PIN no coinciden. No se ha cambiado nada');return null}
  return a;
}
$('#sPinOn').onclick=async()=>{
  const had=hasPin();
  if(had&&!await askPin({title:'Escribe el PIN actual',verify:pinOk}))return;
  const p=await newPin();if(!p)return;
  S.pinHash=await hashPin(p);save();pinUI();toast(had?'PIN cambiado':'PIN activado');
};
$('#sPinOff').onclick=async()=>{
  if(!hasPin())return;
  if(!await askPin({title:'Escribe el PIN actual para quitarlo',verify:pinOk}))return;
  delete S.pinHash;save();pinUI();toast('PIN quitado');
};
// Ajustes: pulsación larga para evitar toques accidentales
(()=>{
  const b=$('#btnSettings');let timer=null,fired=false;
  b.addEventListener('pointerdown',()=>{fired=false;b.classList.add('holding');timer=setTimeout(()=>{fired=true;b.classList.remove('holding');requestSettings()},700)});
  const cancel=()=>{clearTimeout(timer);b.classList.remove('holding')};
  b.addEventListener('pointerup',()=>{cancel();if(!fired)toast('Mantén pulsado el botón de Ajustes para abrirlos')});
  b.addEventListener('pointerleave',cancel);b.addEventListener('pointercancel',cancel);
})();

