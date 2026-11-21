/* ============ Copia completa: todo Fori en un solo archivo ============ */
/* Para pasarlo todo a otro equipo (o del Chrome de la PDI a la app de Android) en un paso.
   Archivo .foricopia = JSON {app:'fori',type:'copia',version:1,date,ls:{'fori-v1':texto},kv:[[clave,valor],…]}
   - ls: los ajustes y alumnos (localStorage 'fori-v1'), sin el PIN, como «Exportar datos».
   - kv: todo el almacén IndexedDB 'fori' → 'kv' tal cual (pizarra 'board2', 'page:…', 'img:…'; lecciones 'lessons', 'lesson:…').
     Las imágenes guardadas como Blob (solo están en el primer nivel, en 'img:…') van como {$blob:tipo,b64:…}.
   Abrir una copia sustituye todo lo de este equipo (se pregunta antes), en una sola transacción, y recarga.
   Si falla (sin espacio), no cambia nada. «Exportar datos» y las lecciones .fori siguen igual. */
const COPIA={VER:1};
const cpB64=b=>new Promise((r,j)=>{const f=new FileReader();f.onload=()=>r(String(f.result).split(',')[1]||'');f.onerror=()=>j(f.error);f.readAsDataURL(b)});
const cpBlob=(b64,type)=>{const s=atob(b64),u=new Uint8Array(s.length);for(let i=0;i<s.length;i++)u[i]=s.charCodeAt(i);return new Blob([u],{type})};
const cpIsBlob=v=>!!v&&typeof v==='object'&&typeof v.$blob==='string'&&typeof v.b64==='string';
// Todo el almacén: [[clave,valor],…] (null si no se puede leer)
function cpAll(){
  return new Promise(r=>{
    if(!DB.db)return r(null);
    try{const st=DB.db.transaction('kv').objectStore('kv'),a=st.getAllKeys(),v=st.getAll();
      v.onsuccess=()=>r(a.result.map((k,i)=>[k,v.result[i]]));v.onerror=a.onerror=()=>r(null)}catch{r(null)}
  });
}
async function copiaExport(){
  commitEditor();syncClass();
  boardFlush(); // lo último que se ha pintado entra en la copia (la lectura va después de esta escritura)
  toast('Preparando la copia…');
  const all=await cpAll();if(!all){toast('No se ha podido leer lo guardado');return}
  const kv=[];
  try{for(const [k,v] of all)kv.push([k,v instanceof Blob?{$blob:v.type,b64:await cpB64(v)}:v])}
  catch{toast('No se ha podido leer una imagen guardada');return}
  const data={app:'fori',type:'copia',version:COPIA.VER,date:new Date().toISOString(),ls:{[KEY]:JSON.stringify({...S,pinHash:undefined})},kv};
  const name=`fori-copia-${data.date.slice(0,10)}.foricopia`;
  const a=h('a',{href:URL.createObjectURL(new Blob([JSON.stringify(data)],{type:'application/octet-stream'})),download:name});
  document.body.append(a);a.click();a.remove();setTimeout(()=>URL.revokeObjectURL(a.href),60000);
  toast(`Copia «${name}» descargada`);
}
// Comprueba el archivo: devuelve {date,ls,kv} o lanza Error con un mensaje claro
function copiaCheck(d){
  if(d&&d.app==='fori'&&d.type==='lesson')throw new Error('Es una lección: ábrela en Lecciones → Importar lección');
  if(!d||d.app!=='fori'||d.type!=='copia'||!Array.isArray(d.kv)||!d.ls||typeof d.ls!=='object')throw new Error('No es una copia completa de Fori');
  if(!(d.version<=COPIA.VER))throw new Error('La copia es de una versión más nueva de Fori: actualiza Fori');
  if(!d.kv.every(e=>Array.isArray(e)&&e.length===2&&typeof e[0]==='string'))throw new Error('La copia está dañada');
  let st=null;
  if(typeof d.ls[KEY]==='string'){try{st=JSON.parse(d.ls[KEY])}catch{}if(!st||typeof st!=='object'||Array.isArray(st))throw new Error('La copia está dañada')}
  return{date:d.date,st,kv:d.kv};
}
async function copiaImport(file){
  if(!file)return;
  let c;
  try{let d;try{d=JSON.parse(await file.text())}catch{throw new Error('Archivo no válido')}c=copiaCheck(d)}
  catch(e){toast(e.message);return}
  if(!DB.db){toast('Este navegador no deja guardar la pizarra');return}
  const when=c.date?lesDate(c.date):'';
  if(!confirm(`¿Abrir la copia${when?' del '+when:''}? Se sustituirán la pizarra, las lecciones, los alumnos y los ajustes de este equipo.`))return;
  BD.ready=false;clearTimeout(persistT);persistT=null; // ya no se guarda nada de lo que hay en pantalla
  let ok=false;
  try{
    const kv=c.kv.map(([k,v])=>[k,cpIsBlob(v)?cpBlob(v.b64,v.$blob):v]);
    ok=await new Promise(r=>{try{const t=DB.db.transaction('kv','readwrite'),st=t.objectStore('kv');st.clear();for(const [k,v] of kv)st.put(v,k);t.oncomplete=()=>r(true);t.onerror=t.onabort=()=>r(false)}catch{r(false)}});
  }catch{ok=false}
  if(!ok){BD.ready=true;toast('No se ha podido abrir la copia (¿falta espacio?). No se ha cambiado nada.');return}
  if(c.st){S={...structuredClone(DEF),...c.st,pinHash:S.pinHash};save()}
  toast('Copia abierta');
  setTimeout(()=>location.reload(),300);
}
$('#sAllExport').onclick=()=>{copiaExport()};
$('#sAllImport').onclick=()=>$('#sAllFile').click();
$('#sAllFile').addEventListener('change',e=>{const f=e.target.files[0];e.target.value='';copiaImport(f)});
