/* ============ Guardado de la pizarra: cada página por separado ============ */
/* IndexedDB 'fori' → almacén 'kv':
   'board2'      -> índice {f:2,cur,ids:[…],w,n,old}
                    (w,n: qué ventana lo escribió y en qué guardado; old: desde cuándo se conserva la copia antigua)
   'page:<id>'   -> una página {strokes,bg,img,size,v,ch} (ch: ficha de Charta con su paso de solución, ver 05f-charta.js)
   'img:<clave>' -> una imagen (Blob). En la página queda solo la referencia 'img:<clave>';
                    'ch:' en img significa «la ficha de Charta de esta página» (se vuelve a generar a partir de ch)
   'board'       -> formato anterior: toda la pizarra en un único registro, con las imágenes en base64 dentro.
                    Se lee si no hay 'board2'; al pasar al formato nuevo se conserva una semana como copia de seguridad.
   Así, escribir un trazo solo reescribe su página, y las imágenes y los PDF se guardan una sola vez.
   Cada guardado es una única transacción: o se guarda todo o no cambia nada.
   En memoria nada cambia: las imágenes siguen siendo direcciones «data:» y las lecciones y los .fori no se tocan. */
const BD={IDX:'board2',OLD:'board',KEEP:7*864e5,
  sid:Math.random().toString(36).slice(2,10),n:0, // esta ventana y su contador de guardados
  ready:false,   // la pizarra guardada ya está cargada (antes no se guarda nada: se pisaría lo guardado)
  pend:false,    // hay algo sin guardar
  seen:'',       // sello del índice tal como lo dejó o lo leyó esta ventana
  old:null,legacy:false,drop:false,text:false,fails:0,err:false,asked:false,
  dirty:new Set(), // páginas cambiadas desde el último guardado
  pg:new Set(),    // ids de las páginas que ya tienen registro
  img:new Set(),   // claves de las imágenes que ya están guardadas
  refs:new Map(),  // id de página -> claves de imagen que usa su registro
  keys:new Map(),  // dirección «data:» -> clave de imagen
  inline:new Set() // imágenes que se guardan dentro de la página (no se pueden pasar a Blob sin cambiarlas)
};
const bdId=()=>Date.now().toString(36)+Math.random().toString(36).slice(2,8);
const bdStamp=d=>d&&d.w?d.w+':'+d.n:'';

let persistT=null;
// Apunta que hay que guardar. p: la página que ha cambiado (por defecto, la actual); null: solo el índice (página en la que se está, orden)
function persist(p){
  if(p!==null)BD.dirty.add(p||P());
  BD.pend=true;
  clearTimeout(persistT);persistT=setTimeout(boardFlush,600);
}

// Imagen «data:…;base64,» -> Blob, solo si al volver a leerla sale exactamente la misma dirección
function bdBlob(u){
  const m=/^data:([a-z0-9.+-]+\/[a-z0-9.+-]+);base64,/.exec(u.slice(0,120));if(!m)return null;
  try{
    const b=atob(u.slice(m[0].length)),n=b.length,a=new Uint8Array(n);
    for(let i=0;i<n;i++)a[i]=b.charCodeAt(i);
    if(m[0]+btoa(b)!==u)return null;
    return new Blob([a],{type:m[1]});
  }catch{return null}
}
// Blob (o texto, si se guardó así) -> dirección «data:»
function bdUrl(v){
  if(typeof v==='string')return Promise.resolve(v.startsWith('data:')?v:null);
  if(typeof Blob==='undefined'||!(v instanceof Blob))return Promise.resolve(null);
  return new Promise(r=>{
    const f=new FileReader();
    f.onload=()=>r(typeof f.result==='string'&&f.result.startsWith('data:')?f.result:null);f.onerror=()=>r(null);
    try{f.readAsDataURL(v)}catch{r(null)}
  });
}
// Devuelve lo que se escribe en la página en lugar de la imagen u: su referencia (y la guarda si hace falta) o la propia u
function bdRef(u,st,full,refs){
  if(typeof u!=='string'||u.length<2048||!u.startsWith('data:')||BD.inline.has(u))return u;
  let k=BD.keys.get(u);
  if(!k||full||!BD.img.has(k)){
    const b=BD.text?u:bdBlob(u);
    if(!b){BD.inline.add(u);return u}
    if(!k){k='img:'+bdId();BD.keys.set(u,k)}
    st.put(b,k);BD.img.add(k);
  }
  refs.add(k);return k;
}
// Escribe el registro de una página
function bdPage(p,st,full){
  const refs=new Set(),r=u=>bdRef(u,st,full,refs);
  const rec={strokes:p.strokes.map(s=>s&&s.type==='img'?{...s,src:r(s.src)}:s),bg:p.bg,...bgoF(p.bgo),
    img:p.ch&&p.img&&p.img===chImg(p.ch)?'ch:':r(p.img||null),size:p.size||null,v:p.v||null,ch:p.ch||null};
  st.put(rec,'page:'+p.id);BD.refs.set(p.id,refs);
}
function bdIndex(ids){
  const d={f:2,cur:clamp(cur,0,Math.max(0,ids.length-1)),ids,w:BD.sid,n:++BD.n,old:BD.old};
  BD.seen=bdStamp(d);return d;
}
// Guarda lo pendiente. Todas las escrituras se piden en el momento (sirve también al cerrar la ventana).
function boardFlush(){
  clearTimeout(persistT);persistT=null;
  if(!DB.db||!BD.ready||!BD.pend)return;
  let t,st;
  try{t=DB.db.transaction('kv','readwrite');st=t.objectStore('kv')}catch{return bdFail()}
  const list=pages.slice(),prev=BD.seen,ids=new Set();
  try{
    for(const p of list){if(!p.id||ids.has(p.id)){p.id=bdId();BD.dirty.add(p)}ids.add(p.id)}
    // Si lo guardado no es lo último que dejó esta ventana (otra ventana de Fori abierta, o un guardado que falló),
    // se vuelve a escribir todo: vale lo de la última ventana que guarda, entero, como siempre.
    const q=st.get(BD.IDX);
    q.onsuccess=()=>{
      if(bdStamp(q.result)===prev)return;
      try{list.forEach(p=>bdPage(p,st,true))}catch{try{t.abort()}catch{}}
    };
    for(const p of list)if(BD.dirty.has(p)||!BD.pg.has(p.id))bdPage(p,st,false);
    for(const id of BD.pg)if(!ids.has(id)){st.delete('page:'+id);BD.refs.delete(id)}
    if(BD.legacy){if(BD.drop){st.delete(BD.OLD);BD.old=null}else if(!BD.old)BD.old=Date.now()}
    st.put(bdIndex(list.map(p=>p.id)),BD.IDX);
  }catch{try{t.abort()}catch{}return bdFail()}
  BD.pg=ids;BD.dirty.clear();BD.pend=false;
  t.oncomplete=()=>{BD.fails=0;BD.legacy=false;bdPrune();bdKeep()};
  t.onabort=bdFail;
}
// Si un guardado falla, lo guardado queda como estaba. Se reintenta escribiéndolo todo (el sello ya no coincide).
function bdFail(){
  BD.pend=true;BD.fails++;
  BD.text=true;               // por si el navegador no admite Blob: las imágenes, como texto
  if(BD.legacy)BD.drop=true;  // por si falta sitio: sin conservar la copia antigua
  if(BD.fails===2)toast('No se ha podido guardar la pizarra en este equipo. Puede que el almacenamiento esté lleno.');
  if(BD.fails<4){clearTimeout(persistT);persistT=setTimeout(boardFlush,3000)}
}
// Para que la lista de imágenes vistas no crezca sin fin en una sesión larga
function bdPrune(){
  if(BD.keys.size+BD.inline.size<60)return;
  const use=new Set();for(const id of BD.pg)for(const k of BD.refs.get(id)||[])use.add(k);
  for(const [u,k] of BD.keys)if(!use.has(k))BD.keys.delete(u);
  BD.inline.clear();
}
// Pide al navegador que no borre lo guardado si falta espacio en el equipo (una vez, sin molestar)
function bdKeep(){
  if(BD.asked)return;BD.asked=true;
  try{const s=navigator.storage;if(s&&s.persist&&s.persisted)s.persisted().then(ok=>{if(!ok)s.persist().catch(()=>{})}).catch(()=>{})}catch{}
}

// Lee el índice, las páginas y las imágenes en una sola transacción de lectura
function boardRead(){
  return new Promise(res=>{
    const out={idx:null,recs:[],imgs:new Map()};
    if(!DB.db)return res(out);
    let t,st;try{t=DB.db.transaction('kv');st=t.objectStore('kv')}catch{return res(out)}
    const get=(k,fn)=>{const q=st.get(k);q.onsuccess=()=>{try{fn(q.result)}catch{}}};
    const img=k=>{if(typeof k==='string'&&k.startsWith('img:')&&!out.imgs.has(k)){out.imgs.set(k,null);get(k,v=>out.imgs.set(k,v))}};
    get(BD.IDX,d=>{
      if(!d||d.f!==2||!Array.isArray(d.ids)||!d.ids.length)return;
      out.idx=d;
      d.ids.forEach((id,i)=>get('page:'+id,r=>{
        if(!r||!Array.isArray(r.strokes))return;
        out.recs[i]=r;img(r.img);r.strokes.forEach(s=>{if(s&&s.type==='img')img(s.src)});
      }));
    });
    t.oncomplete=()=>res(out);t.onabort=t.onerror=()=>res(out);
  });
}
async function loadBoard(){
  await DB.open();
  let d=null;
  const o=await boardRead();
  if(o.idx){
    const urls=new Map();
    await Promise.all([...o.imgs].map(async([k,v])=>{const u=await bdUrl(v);if(u)urls.set(k,u)}));
    const ps=[];
    o.idx.ids.forEach((id,i)=>{
      const r=o.recs[i];if(!r||typeof id!=='string'){BD.err=true;return}
      const refs=new Set();
      const u=x=>{
        if(typeof x!=='string'||!x.startsWith('img:'))return x;
        const y=urls.get(x);if(!y){BD.err=true;return null}
        refs.add(x);return y;
      };
      const ch=chClean(r.ch);
      const strokes=r.strokes.map(s=>s&&s.type==='img'?{...s,src:u(s.src)}:s).filter(s=>s&&(s.type!=='img'||typeof s.src==='string'));
      ps.push({id,strokes,bg:r.bg,...bgoF(r.bgo),img:r.img==='ch:'?(ch?chImg(ch):null):u(r.img),size:r.size,v:r.v,ch});
      BD.pg.add(id);BD.refs.set(id,refs);
    });
    BD.seen=bdStamp(o.idx);
    if(ps.length){
      d={cur:o.idx.cur,pages:ps};
      BD.old=typeof o.idx.old==='number'?o.idx.old:null;
      for(const [k,x] of urls){BD.keys.set(x,k);BD.img.add(k)}
    }
  }
  if(!d){ // formato anterior (o no se ha podido leer nada del nuevo y queda la copia antigua)
    const old=await DB.get(BD.OLD);
    if(old&&Array.isArray(old.pages)&&old.pages.length){d=old;BD.legacy=true;BD.pg.clear();BD.refs.clear()}
  }
  if(d){
    // v: vista con la que se guardaron los trazos (las copias antiguas no la traen: sus trazos valen para p.size tal cual)
    pages=d.pages.map(p=>({...(p.id?{id:p.id}:{}),strokes:p.strokes||[],bg:p.bg||'plain',...bgoF(p.bgo),img:p.img||null,size:p.size||null,v:viewOk(p.v)?{k:p.v.k,ox:p.v.ox,oy:p.v.oy}:null,ch:chClean(p.ch),undo:[],redo:[]}));
    cur=clamp(d.cur|0,0,pages.length-1);
  }
  BD.dirty.clear();BD.ready=true;
  showPage();
  if(BD.legacy||BD.pend)persist(null); // la pizarra en formato anterior se pasa al nuevo en el primer guardado
  if(BD.err)toast('No se ha podido leer alguna página o imagen guardada de la pizarra');
  setTimeout(boardSweep,5000);
}
// Limpieza al arrancar: borra páginas e imágenes que ya no usa nadie y, pasada una semana, la copia en formato anterior
function boardSweep(again){
  if(!DB.db||!BD.ready||BD.err)return;
  if(BD.pend||BD.legacy){if(!again)setTimeout(()=>boardSweep(true),20000);return}
  try{
    const t=DB.db.transaction('kv','readwrite'),st=t.objectStore('kv'),a=st.getAllKeys(),b=st.get(BD.IDX);
    let n=0;
    const go=()=>{
      if(++n<2)return;
      const idx=b.result;
      if(!idx||bdStamp(idx)!==BD.seen)return; // ha guardado otra ventana, o hay un guardado en marcha: no se toca nada
      const keep=new Set();for(const id of BD.pg)for(const k of BD.refs.get(id)||[])keep.add(k);
      for(const k of a.result){
        if(typeof k!=='string')continue;
        if(k.startsWith('page:')){if(!BD.pg.has(k.slice(5)))st.delete(k)}
        else if(k.startsWith('img:')&&!keep.has(k)){st.delete(k);BD.img.delete(k)}
      }
      if(BD.old&&Date.now()-BD.old>BD.KEEP){
        st.delete(BD.OLD);BD.old=null;
        const d={...idx,old:null,w:BD.sid,n:++BD.n};st.put(d,BD.IDX);BD.seen=bdStamp(d);
      }
    };
    a.onsuccess=go;b.onsuccess=go;
  }catch{}
}
