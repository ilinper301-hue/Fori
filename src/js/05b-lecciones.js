/* ============ Lecciones: preparar la clase en casa y abrirla en la PDI ============ */
/* Biblioteca en IndexedDB (base 'fori', almacén 'kv'):
   'lessons'      -> lista ligera [{id,name,date,n,thumb}]
   'lesson:<id>'  -> páginas de esa lección [{strokes,bg,img}]
   No toca la clave 'board'. Archivo .fori = JSON {app:'fori',type:'lesson',version:1,name,date,pages}. */
const LES={KEY:'lessons',VER:1,MAXP:300,sig:null,refresh:null};

const lesPlain=ps=>ps.map(p=>({strokes:p.strokes,bg:p.bg,img:p.img||null,size:p.size||null}));
const lesSig=()=>{ // huella del contenido actual, para saber si hay cambios sin guardar como lección
  const s=JSON.stringify(lesPlain(pages));let x=5381;
  for(let i=0;i<s.length;i++)x=((x<<5)+x+s.charCodeAt(i))|0;
  return s.length+':'+x;
};
const lesHasContent=()=>pages.some(p=>p.strokes.length||p.img);
const lesUnsaved=()=>lesHasContent()&&lesSig()!==LES.sig;
const lesId=()=>(crypto.randomUUID?crypto.randomUUID():Date.now().toString(36)+Math.random().toString(36).slice(2,8));
const lesN=n=>n===1?'1 página':n+' páginas';
const lesDate=iso=>{try{return new Date(iso).toLocaleDateString('es-ES',{day:'numeric',month:'short',year:'numeric'})}catch{return ''}};

// Escritura con aviso real de fallo (cuota llena, etc.)
function lesPut(k,v){
  return new Promise(r=>{
    if(!DB.db)return r(false);
    try{const t=DB.db.transaction('kv','readwrite');t.objectStore('kv').put(v,k);t.oncomplete=()=>r(true);t.onerror=t.onabort=()=>r(false)}catch{r(false)}
  });
}
function lesDel(k){
  return new Promise(r=>{
    if(!DB.db)return r(false);
    try{const t=DB.db.transaction('kv','readwrite');t.objectStore('kv').delete(k);t.oncomplete=()=>r(true);t.onerror=t.onabort=()=>r(false)}catch{r(false)}
  });
}
const lesList=async()=>{const l=await DB.get(LES.KEY);return Array.isArray(l)?l:[]};
const lesPages=async id=>{const d=await DB.get('lesson:'+id);return Array.isArray(d)?d:null};

async function lesThumb(p){
  try{
    const c=await renderPage({strokes:p.strokes,bg:p.bg,img:p.img},Math.min(1,220/Math.max(1,stage.clientWidth)));
    return c.toDataURL('image/jpeg',.6);
  }catch{return null}
}

// Guarda páginas como lección nueva (o sustituye la de id dado). Devuelve la ficha o null si falla.
async function lesStore(name,ps,date,id){
  id=id||lesId();
  const meta={id,name,date:date||new Date().toISOString(),n:ps.length,thumb:await lesThumb(ps[0])};
  if(!await lesPut('lesson:'+id,ps)){toast('No se ha podido guardar: no hay espacio suficiente en el equipo');return null}
  const list=(await lesList()).filter(l=>l.id!==id);
  list.unshift(meta);
  if(!await lesPut(LES.KEY,list)){await lesDel('lesson:'+id);toast('No se ha podido guardar la lección');return null}
  LES.refresh&&LES.refresh();
  return meta;
}

async function saveLesson(){
  commitEditor();
  if(!DB.db){toast('Este navegador no permite guardar lecciones');return}
  const def='Lección '+new Date().toLocaleDateString('es-ES',{day:'numeric',month:'long'});
  const n=prompt('Nombre de la lección:',def);
  if(n===null)return;
  const name=n.trim().slice(0,80)||def;
  const list=await lesList(),same=list.find(l=>l.name.toLowerCase()===name.toLowerCase());
  if(same&&!confirm(`Ya hay una lección llamada «${same.name}». ¿Quieres sustituirla?`))return;
  const m=await lesStore(name,structuredClone(lesPlain(pages)),null,same&&same.id);
  if(m){LES.sig=lesSig();toast(`Lección «${name}» guardada (${lesN(m.n)})`)}
}

// Abrir: sustituye las páginas actuales; «añadir» las pone al final.
async function lesOpen(l,add){
  commitEditor();
  const ps=await lesPages(l.id);
  if(!ps||!ps.length){toast('No se ha podido leer la lección');return}
  const fresh=ps.map(p=>({strokes:structuredClone(p.strokes||[]),bg:p.bg||'plain',img:p.img||null,size:p.size||null,undo:[],redo:[]}));
  if(add){
    const at=pages.length;pages.push(...fresh);cur=at;
    showPage();persist();toast(`Añadidas ${lesN(fresh.length)} al final`);
  }else{
    if(lesUnsaved()&&!confirm('Las páginas actuales no están guardadas como lección y se perderán. ¿Abrir «'+l.name+'» de todos modos?'))return;
    pages=fresh;cur=0;showPage();persist();LES.sig=lesSig();toast(`Lección «${l.name}» abierta`);
  }
}

async function lesRename(l){
  const n=prompt('Nuevo nombre:',l.name);if(n===null||!n.trim())return;
  const list=await lesList(),x=list.find(q=>q.id===l.id);if(!x)return;
  x.name=n.trim().slice(0,80);
  if(!await lesPut(LES.KEY,list))toast('No se ha podido renombrar');
  LES.refresh&&LES.refresh();
}
async function lesDup(l){
  const ps=await lesPages(l.id);if(!ps){toast('No se ha podido leer la lección');return}
  const m=await lesStore(l.name+' (copia)',ps,new Date().toISOString());
  if(m)toast('Lección duplicada');
}
async function lesRemove(l){
  if(!confirm(`¿Borrar la lección «${l.name}»? No se puede deshacer.`))return;
  const list=(await lesList()).filter(q=>q.id!==l.id);
  await lesPut(LES.KEY,list);await lesDel('lesson:'+l.id);
  LES.refresh&&LES.refresh();toast('Lección borrada');
}

// Archivo .fori
async function lesFile(l){
  const ps=await lesPages(l.id);if(!ps)return null;
  const data={app:'fori',type:'lesson',version:LES.VER,name:l.name,date:l.date,pages:ps};
  const base=(l.name.replace(/[\\/:*?"<>|\u0000-\u001f]+/g,' ').trim().replace(/\s+/g,'-')||'leccion').slice(0,60);
  return{blob:new Blob([JSON.stringify(data)],{type:'application/json'}),name:base+'.fori'};
}
async function lesExport(l){
  const f=await lesFile(l);if(!f){toast('No se ha podido leer la lección');return}
  const a=h('a',{href:URL.createObjectURL(f.blob),download:f.name});
  document.body.append(a);a.click();a.remove();setTimeout(()=>URL.revokeObjectURL(a.href),5000);
  toast(`Archivo «${f.name}» descargado`);
}
const lesCanShare=()=>{
  try{return!!navigator.share&&!!navigator.canShare&&navigator.canShare({files:[new File(['{}'],'a.fori',{type:'application/json'})]})}catch{return false}
};
async function lesShare(l){
  const f=await lesFile(l);if(!f){toast('No se ha podido leer la lección');return}
  const file=new File([f.blob],f.name,{type:'application/json'});
  try{await navigator.share({files:[file],title:l.name,text:'Lección de Fori: '+l.name})}
  catch(e){if(e&&e.name!=='AbortError')toast('No se ha podido compartir. Prueba con «Exportar».')}
}

// Validación del archivo: devuelve {name,date,pages} o lanza Error con un mensaje claro
const lesNum=v=>typeof v==='number'&&isFinite(v);
const lesPt=p=>p&&lesNum(p.x)&&lesNum(p.y);
function lesCheckStroke(s){
  if(!s||typeof s!=='object')return false;
  if(s.type==='text')return typeof s.text==='string'&&lesNum(s.x)&&lesNum(s.y)&&lesNum(s.fs);
  if(s.type==='img')return typeof s.src==='string'&&/^data:image\//.test(s.src)&&lesNum(s.x)&&lesNum(s.y)&&lesNum(s.w)&&lesNum(s.h);
  if(!lesNum(s.size))return false;
  if(s.type==='shape')return typeof s.shape==='string'&&lesPt(s.a)&&lesPt(s.b);
  return Array.isArray(s.pts)&&s.pts.length>0&&s.pts.every(lesPt);
}
function lesParse(text){
  let d;
  try{d=JSON.parse(text)}catch{throw new Error('El archivo no se puede leer: no es una lección de Fori.')}
  if(!d||d.app!=='fori'||d.type!=='lesson')throw new Error('Este archivo no es una lección de Fori.');
  if(!lesNum(d.version)||d.version>LES.VER)throw new Error('Esta lección es de una versión más nueva de Fori. Actualiza la aplicación e inténtalo de nuevo.');
  if(!Array.isArray(d.pages)||!d.pages.length)throw new Error('La lección no tiene ninguna página.');
  if(d.pages.length>LES.MAXP)throw new Error('La lección tiene demasiadas páginas.');
  const pagesOk=d.pages.map((p,i)=>{
    if(!p||!Array.isArray(p.strokes)||!p.strokes.every(lesCheckStroke))throw new Error(`La página ${i+1} está dañada.`);
    const img=p.img==null?null:p.img;
    if(img!==null&&!(typeof img==='string'&&/^data:image\//.test(img)))throw new Error(`La imagen de fondo de la página ${i+1} no es válida.`);
    return{strokes:p.strokes,bg:typeof p.bg==='string'?p.bg:'plain',img,size:(p.size&&lesNum(p.size.w)&&lesNum(p.size.h)?{w:p.size.w,h:p.size.h}:null)};
  });
  const date=typeof d.date==='string'&&!isNaN(Date.parse(d.date))?d.date:new Date().toISOString();
  return{name:(typeof d.name==='string'&&d.name.trim()?d.name.trim():'Lección importada').slice(0,80),date,pages:pagesOk};
}
async function lesImport(file){
  if(!file)return;
  if(!DB.db){toast('Este navegador no permite guardar lecciones');return}
  let d;
  try{d=lesParse(await file.text())}catch(e){alert(e.message);return}
  const m=await lesStore(d.name,d.pages,d.date);
  if(!m)return;
  toast(`Lección «${m.name}» importada`);
  if(confirm(`Lección «${m.name}» importada (${lesN(m.n)}). ¿Quieres abrirla ahora?`))lesOpen(m,false);
}

// Panel «Mis lecciones»
function lessonsPanel(body){
  const input=h('input',{type:'file',accept:'.fori,.json,application/json',style:'display:none',onchange:e=>{const f=e.target.files[0];e.target.value='';lesImport(f)}});
  const list=h('div',{class:'les-list'});
  const share=lesCanShare();
  async function render(){
    const ls=await lesList();
    if(!list.isConnected&&!body.contains(list))return;
    if(!ls.length){list.replaceChildren(h('div',{class:'les-empty'},ico('book'),h('p',{},'Todavía no hay lecciones.'),h('p',{class:'les-sub'},'Prepara las páginas y usa «Guardar como lección» en el menú Página, o importa un archivo .fori.')));return}
    list.replaceChildren(...ls.map(l=>h('div',{class:'les-item'},
      h('div',{class:'les-th'},l.thumb?h('img',{src:l.thumb,alt:''}):ico('page')),
      h('div',{class:'les-main'},
        h('div',{class:'les-name',title:l.name},l.name),
        h('div',{class:'les-sub'},`${lesDate(l.date)} · ${lesN(l.n)}`),
        h('div',{class:'les-acts'},
          h('button',{class:'btn',onclick:()=>lesOpen(l,false)},...ib('book','Abrir')),
          h('button',{class:'btn ghost',onclick:()=>lesOpen(l,true)},...ib('plus','Añadir al final')),
          h('span',{class:'les-sep'}),
          h('button',{class:'btn ghost les-i',title:'Renombrar','aria-label':'Renombrar',onclick:()=>lesRename(l)},ico('pen')),
          h('button',{class:'btn ghost les-i',title:'Duplicar','aria-label':'Duplicar',onclick:()=>lesDup(l)},ico('copy')),
          h('button',{class:'btn ghost les-i',title:'Exportar (.fori)','aria-label':'Exportar',onclick:()=>lesExport(l)},ico('download')),
          share?h('button',{class:'btn ghost les-i',title:'Compartir','aria-label':'Compartir',onclick:()=>lesShare(l)},ico('share')):null,
          h('button',{class:'btn ghost les-i les-del',title:'Borrar','aria-label':'Borrar',onclick:()=>lesRemove(l)},ico('trash'))
        ))
    )));
  }
  body.append(
    h('div',{class:'les-bar'},
      h('button',{class:'btn',onclick:saveLesson},...ib('save','Guardar como lección')),
      h('button',{class:'btn ghost',onclick:()=>input.click()},...ib('upload','Importar lección'))),
    list,input);
  LES.refresh=render;render();
  return()=>{LES.refresh=null};
}
function openLessons(){openWin('lessons','Mis lecciones',lessonsPanel,600)}

REG.pageMenu.push(
  ()=>h('button',{class:'wide',onclick:()=>{closePop();saveLesson()}},...ib('save','Guardar como lección')),
  ()=>h('button',{class:'wide',onclick:()=>{closePop();openLessons()}},...ib('book','Mis lecciones'))
);
