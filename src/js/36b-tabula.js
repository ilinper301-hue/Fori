/* ============ Importar clases y horario desde Tabula ============ */
// Tabula (mismo dominio) guarda sus datos en este navegador:
//   IndexedDB «tabula-data» → almacén «cols» → claves «groups», «students», «schedule» (cada una, una lista de objetos)
//   (o, si no hay IndexedDB, localStorage «tabula:v1:groups» / «:students» / «:schedule», con la lista en JSON).
// Solo se LEE; no se escribe nada en Tabula ni se envía nada a ningún servidor.
// También se acepta una copia de Tabula (.zip con «tabula.json», o un .json antiguo): {app:'tabula', data:{groups:'[...]', ...}}.
const TAB_AREA={
  'Lengua Castellana y Literatura':'Lengua','Matemáticas':'Matemáticas','Conocimiento del Medio Natural, Social y Cultural':'Conocimiento del Medio',
  'Lengua Extranjera (Inglés)':'Inglés','Educación Artística':'Educación Artística','Educación Física':'Educación Física',
  'Religión / Atención educativa':'Religión','Segunda Lengua Extranjera':'Francés','Educación en Valores Cívicos y Éticos':'Valores','Tutoría':'Tutoría'
};
const tabTime=/^(\d{1,2}):(\d{2})$/;
const tabArr=v=>Array.isArray(v)?v.filter(x=>x&&typeof x==='object'):[];
const tabStr=v=>typeof v==='string'?v.trim():'';

// Lee IndexedDB de Tabula sin crearla si no existe (si no existía, se cancela su creación).
function tabReadIdb(){
  return new Promise(res=>{
    let done=false;const end=v=>{if(!done){done=true;res(v)}};
    setTimeout(()=>end(null),4000);
    if(typeof indexedDB==='undefined')return end(null);
    let req;try{req=indexedDB.open('tabula-data')}catch{return end(null)}
    req.onupgradeneeded=()=>{try{req.transaction.abort()}catch{}};
    req.onerror=()=>end(null);req.onblocked=()=>end(null);
    req.onsuccess=()=>{
      const db=req.result;
      try{
        if(!db.objectStoreNames.contains('cols')){db.close();return end(null)}
        const t=db.transaction('cols','readonly'),out={};
        ['groups','students','schedule'].forEach(k=>{const r=t.objectStore('cols').get(k);r.onsuccess=()=>{out[k]=r.result}});
        t.oncomplete=()=>{db.close();end(out)};t.onerror=t.onabort=()=>{db.close();end(null)};
      }catch{try{db.close()}catch{}end(null)}
    };
  });
}
function tabReadLs(){
  const out={};
  for(const k of ['groups','students','schedule']){try{const v=JSON.parse(localStorage.getItem('tabula:v1:'+k));if(Array.isArray(v))out[k]=v}catch{}}
  return out;
}
async function tabReadLocal(){
  let a=null;try{a=await tabReadIdb()}catch{}
  const b=tabReadLs(),out={};
  for(const k of ['groups','students','schedule'])out[k]=Array.isArray(a&&a[k])&&a[k].length?a[k]:(b[k]||[]);
  return out;
}

// Copia de Tabula: .zip (sin comprimir o deflate) o .json
async function tabUnzip(buf){
  const u8=new Uint8Array(buf),dv=new DataView(u8.buffer,u8.byteOffset,u8.byteLength);
  let eocd=-1;
  for(let i=u8.length-22;i>=Math.max(0,u8.length-65557);i--)if(dv.getUint32(i,true)===0x06054b50){eocd=i;break}
  if(eocd<0)throw new Error('zip');
  const count=dv.getUint16(eocd+10,true);let p=dv.getUint32(eocd+16,true);
  const dec=new TextDecoder();
  for(let n=0;n<count;n++){
    if(dv.getUint32(p,true)!==0x02014b50)throw new Error('zip');
    const method=dv.getUint16(p+10,true),csize=dv.getUint32(p+20,true);
    const nlen=dv.getUint16(p+28,true),xlen=dv.getUint16(p+30,true),clen=dv.getUint16(p+32,true),lho=dv.getUint32(p+42,true);
    const name=dec.decode(u8.subarray(p+46,p+46+nlen));
    if(name==='tabula.json'){
      const start=lho+30+dv.getUint16(lho+26,true)+dv.getUint16(lho+28,true),raw=u8.subarray(start,start+csize);
      if(method===0)return dec.decode(raw);
      if(method===8&&typeof DecompressionStream!=='undefined'){
        const ds=new Blob([raw]).stream().pipeThrough(new DecompressionStream('deflate-raw'));
        return dec.decode(new Uint8Array(await new Response(ds).arrayBuffer()));
      }
      throw new Error('compresion');
    }
    p+=46+nlen+xlen+clen;
  }
  throw new Error('sin-datos');
}
async function tabReadFile(f){
  const buf=await f.arrayBuffer(),b=new Uint8Array(buf);
  const text=(b[0]===0x50&&b[1]===0x4b)?await tabUnzip(buf):new TextDecoder().decode(b);
  const j=JSON.parse(text);
  if(!j||j.app!=='tabula'||!j.data||typeof j.data!=='object')throw new Error('no-tabula');
  const out={};
  for(const k of ['groups','students','schedule']){let v=j.data[k];if(typeof v==='string'){try{v=JSON.parse(v)}catch{v=[]}}out[k]=Array.isArray(v)?v:[]}
  return out;
}

// Nombre como Tabula lo muestra en clase: «María»; si hay otro igual en el grupo, «María G.»; y si aún coincide, «María García».
function tabNames(list){
  const nm=s=>tabStr(s.nombre)||tabStr(s.apellidos),low=s=>nm(s).toLowerCase();
  const first=s=>tabStr(s.apellidos).split(/\s+/)[0]||'';
  const base=list.map(s=>{
    const dup=list.some(x=>x!==s&&low(x)===low(s)),ap=tabStr(s.apellidos);
    return dup&&tabStr(s.nombre)&&ap?`${nm(s)} ${ap[0].toUpperCase()}.`:nm(s);
  });
  return list.map((s,i)=>base.filter(x=>x.toLowerCase()===base[i].toLowerCase()).length>1&&first(s)&&tabStr(s.nombre)?`${nm(s)} ${first(s)}`:base[i]).filter(Boolean);
}
function tabModel(raw){
  const groups=tabArr(raw.groups).filter(g=>g.id!=null&&tabStr(g.nombre)).map(g=>({id:String(g.id),name:tabStr(g.nombre),curso:Number(g.curso)||0,archived:!!g.archivado}))
    .sort((a,b)=>(a.archived-b.archived)||(a.curso-b.curso)||a.name.localeCompare(b.name,'es'));
  const studs=tabArr(raw.students).filter(s=>s.groupId!=null&&(tabStr(s.nombre)||tabStr(s.apellidos)));
  groups.forEach(g=>{
    const l=studs.filter(s=>String(s.groupId)===g.id).sort((a,b)=>(Number(a.orden)||0)-(Number(b.orden)||0)||(tabStr(a.nombre)+tabStr(a.apellidos)).localeCompare(tabStr(b.nombre)+tabStr(b.apellidos),'es'));
    g.students=tabNames(l);
  });
  const ids=new Set(groups.map(g=>g.id));
  const sess=tabArr(raw.schedule).map(x=>({dia:Number(x.dia),ini:tabStr(x.inicio),fin:tabStr(x.fin),tipo:tabStr(x.tipo)||'clase',area:tabStr(x.area),titulo:tabStr(x.titulo),gid:x.groupId!=null&&ids.has(String(x.groupId))?String(x.groupId):null}))
    .filter(x=>x.dia>=1&&x.dia<=5&&tabTime.test(x.ini)&&tabTime.test(x.fin));
  return {groups,sess};
}
// Horario de Tabula → líneas «HH:MM-HH:MM Asignatura». gid = clase concreta, o null = todo (con el nombre de la clase si hay varias).
function tabSchedule(m,gid){
  const hhmm=t=>{const x=tabTime.exec(t);return pad(x[1])+':'+x[2]};
  const many=new Set(m.sess.filter(x=>x.tipo==='clase'&&x.gid).map(x=>x.gid)).size>1;
  const gname=Object.fromEntries(m.groups.map(g=>[g.id,g.name]));
  const out={1:[],2:[],3:[],4:[],5:[]};
  const rows={1:[],2:[],3:[],4:[],5:[]};
  m.sess.forEach(x=>{
    if(gid&&x.gid&&x.gid!==gid)return;
    let name=x.tipo==='recreo'?(x.titulo||'Recreo'):x.tipo==='otro'?(x.titulo||'Otra actividad'):(TAB_AREA[x.area]||x.area||x.titulo||'Clase');
    if(!gid&&many&&x.gid&&x.tipo==='clase')name+=` (${gname[x.gid]})`;
    rows[x.dia].push({k:hhmm(x.ini),l:`${hhmm(x.ini)}-${hhmm(x.fin)} ${name}`});
  });
  for(const d of [1,2,3,4,5])out[d]=[...new Set(rows[d].sort((a,b)=>a.k.localeCompare(b.k)).map(r=>r.l))];
  return out;
}
const tabCount=sch=>[1,2,3,4,5].reduce((n,d)=>n+sch[d].length,0);

(()=>{
  const plural=(n,a,b)=>`${n} ${n===1?a:b}`;
  const norm=s=>s.trim().toLowerCase();
  let dlgT=null;
  function closeT(){if(dlgT){dlgT.close();dlgT.remove();dlgT=null}}
  function applyUI(){fillClassUI();[1,2,3,4,5].forEach(d=>$('#sd'+d).value=(S.schedule[d]||[]).join('\n'));renderClassChip()}

  async function openTabula(){
    closeT();
    dlgT=h('dialog',{class:'tabdlg','aria-label':'Importar desde Tabula'});
    dlgT.addEventListener('cancel',e=>{e.preventDefault();closeT()});
    document.body.append(dlgT);dlgT.showModal();
    dlgT.replaceChildren(h('h2',{},'Importar desde Tabula'),h('p',{class:'tab-note'},'Buscando datos de Tabula en este navegador…'));
    let raw=null;try{raw=await tabReadLocal()}catch{}
    show(raw,'local');
  }
  function fileBtn(label){
    const inp=h('input',{type:'file',accept:'.zip,.json,application/zip,application/json',hidden:''});
    inp.addEventListener('change',async()=>{
      const f=inp.files[0];if(!f)return;
      try{show(await tabReadFile(f),'archivo')}
      catch(e){show(null,'archivo',e&&e.message==='no-tabula'?'Ese archivo no parece una copia de Tabula.':'No he podido leer ese archivo. Elige el .zip que descarga Tabula en Ajustes → Copia de seguridad.')}
    });
    return [h('button',{class:'btn ghost',type:'button',onclick:()=>inp.click()},ico('upload'),' '+label),inp];
  }
  function show(raw,from,err){
    if(!dlgT)return;
    let m=null;try{if(raw)m=tabModel(raw)}catch{}
    const cancel=h('button',{class:'btn ghost',type:'button',onclick:closeT},'Cancelar');
    if(!m||!m.groups.length){
      dlgT.replaceChildren(h('h2',{},'Importar desde Tabula'),
        ...(err?[h('p',{class:'tab-note bad'},err)]:[]),
        h('p',{class:'tab-note'},from==='archivo'&&!err?'Ese archivo no tiene clases ni alumnos.':'No he encontrado clases de Tabula en este navegador.'),
        h('div',{class:'tab-help'},
          h('p',{},'Esto pasa si:'),
          h('ul',{},h('li',{},'Tabula no se ha usado en este navegador o en este equipo.'),h('li',{},'Tus datos están solo en la nube (has entrado con tu cuenta en otro equipo).'),h('li',{},'Estás en una ventana privada.')),
          h('p',{},'Qué hacer:'),
          h('ol',{},h('li',{},'Abre Tabula en este mismo navegador y entra con tu cuenta; cuando cargue tus clases, vuelve aquí.'),
            h('li',{},'O bien, en Tabula ve a Ajustes → Copia de seguridad → «Descargar copia» y elige aquí ese archivo.')),
          h('p',{},'Fori solo lee los datos de este equipo; no envía nada a ningún servidor.')),
        h('div',{class:'row end'},cancel,...fileBtn('Elegir archivo de copia de Tabula')));
      return;
    }
    const exists=g=>S.classes.some(c=>norm(c.name)===norm(g.name));
    const checks=m.groups.map(g=>{
      const cb=h('input',{type:'checkbox',checked:'',id:'tbg_'+g.id});cb.checked=!g.archived;
      return {g,cb,row:h('label',{class:'tab-row',for:'tbg_'+g.id},cb,h('span',{class:'tab-name'},g.name,g.archived?h('em',{},' (archivada)'):null),
        h('span',{class:'tab-meta'},plural(g.students.length,'alumno','alumnos')+(exists(g)?' · ya existe: se actualizará su lista':' · clase nueva')))};
    });
    const sessIds=[...new Set(m.sess.filter(x=>x.gid).map(x=>x.gid))];
    const withSch=m.groups.filter(g=>sessIds.includes(g.id));
    const schSel=h('select',{id:'tbSchSel','aria-label':'Horario de qué clase'},
      ...withSch.map(g=>h('option',{value:g.id},'Horario de '+g.name)),h('option',{value:''},'Horario completo (todas las clases)'));
    const first=checks.find(c=>c.cb.checked&&sessIds.includes(c.g.id));
    schSel.value=withSch.length===1?withSch[0].id:first?first.g.id:'';
    const hasSch=m.sess.length>0;
    const schCb=h('input',{type:'checkbox',id:'tbSch'});schCb.checked=hasSch;schCb.disabled=!hasSch;
    const schInfo=h('span',{class:'tab-meta'});
    const upd=()=>{const n=tabCount(tabSchedule(m,schSel.value||null));schInfo.textContent=hasSch?`${plural(n,'sesión','sesiones')} por semana. Sustituirá el horario actual de Fori.`:''};
    schSel.onchange=upd;upd();
    const go=h('button',{class:'btn',type:'button',onclick:()=>doImport(m,checks,schCb.checked&&hasSch?(schSel.value||null):undefined)},'Importar');
    dlgT.replaceChildren(h('h2',{},'Importar desde Tabula'),
      h('p',{class:'tab-note'},from==='archivo'?'Datos leídos del archivo. Elige qué importar.':'He encontrado estos datos de Tabula en este navegador. Elige qué importar.'),
      h('h3',{},'Clases y alumnos'),h('div',{class:'tab-list'},checks.map(c=>c.row)),
      h('h3',{},'Horario semanal'),
      hasSch?h('div',{class:'tab-sch'},h('label',{class:'tab-row',for:'tbSch'},schCb,h('span',{class:'tab-name'},'Importar el horario')),schSel,schInfo)
            :h('p',{class:'tab-note'},'Tabula no tiene horario guardado.'),
      h('p',{class:'tab-note'},'No se borra nada sin tu permiso: las clases con el mismo nombre se actualizan y las demás se dejan como están.'),
      h('div',{class:'row end'},...fileBtn('Usar un archivo de copia'),cancel,go));
  }

  function doImport(m,checks,schGid){
    const chosen=checks.filter(c=>c.cb.checked).map(c=>c.g);
    if(!chosen.length&&schGid===undefined){toast('No has elegido nada para importar');return}
    const upd=chosen.filter(g=>S.classes.some(c=>norm(c.name)===norm(g.name)));
    let sch=null;if(schGid!==undefined){sch=tabSchedule(m,schGid);if(!tabCount(sch))sch=null}
    const warn=[];
    if(upd.length)warn.push(`Se sustituirá la lista de alumnos de: ${upd.map(g=>'«'+g.name+'»').join(', ')}.`);
    if(sch)warn.push('Se sustituirá el horario semanal actual.');
    if(warn.length&&!confirm(warn.join('\n')+'\n\nPodrás deshacerlo justo después. ¿Continuar?'))return;
    try{
      const prev=structuredClone({classes:S.classes,cls:S.cls,students:S.students,roles:S.roles,offset:S.offset,schedule:S.schedule});
      // Primero se recoge lo que haya a medias en el diálogo de Ajustes
      readClassUI();
      const act=S.classes[S.cls];if(act){S.students=act.students;S.roles=act.roles;S.offset=act.offset||0}
      let nNew=0,nUpd=0,nAl=0;
      chosen.forEach(g=>{
        const i=S.classes.findIndex(c=>norm(c.name)===norm(g.name));
        if(i>=0){S.classes[i].students=[...g.students];nUpd++;if(i===S.cls){S.students=S.classes[i].students}}
        else{S.classes.push({name:g.name,students:[...g.students],roles:[...S.roles],offset:0});nNew++}
        nAl+=g.students.length;
      });
      if(sch){S.schedule=sch}
      pool=[];save();applyUI();
      const parts=[];
      if(chosen.length){parts.push(plural(chosen.length,'clase','clases')+(nNew&&nUpd?` (${plural(nNew,'nueva','nuevas')} y ${plural(nUpd,'actualizada','actualizadas')})`:nUpd?' (actualizadas)':''));parts.push(plural(nAl,'alumno','alumnos'))}
      if(sch)parts.push('el horario');
      const msg=(chosen.length===1?'Importada ':chosen.length?'Importadas ':'Importado ')+(parts.length>1?parts.slice(0,-1).join(', ')+' y '+parts[parts.length-1]:parts[0]);
      closeT();
      showSummary(msg,()=>{
        S.classes=prev.classes;S.cls=prev.cls;S.students=prev.students;S.roles=prev.roles;S.offset=prev.offset;S.schedule=prev.schedule;
        dlgCls=clamp(dlgCls,0,S.classes.length-1);pool=[];save();applyUI();toast('Importación deshecha');
      });
    }catch(e){console.warn('Fori: error al importar de Tabula',e);toast('No se ha podido importar. No se ha cambiado nada importante.')}
  }
  function showSummary(msg,undo){
    const d=h('dialog',{class:'tabdlg small','aria-label':'Resumen de la importación'},h('h2',{},'Importación terminada'),h('p',{class:'tab-note'},msg+'.'),
      h('p',{class:'tab-note'},'Ya está guardado. Si no te convence, pulsa «Deshacer».'),
      h('div',{class:'row end'},h('button',{class:'btn ghost',type:'button',onclick:()=>{d.close();d.remove();undo()}},'Deshacer'),h('button',{class:'btn',type:'button',onclick:()=>{d.close();d.remove()}},'Aceptar')));
    d.addEventListener('cancel',e=>{e.preventDefault();d.close();d.remove()});
    document.body.append(d);d.showModal();
  }
  $('#sTabula').onclick=()=>{openTabula().catch(e=>{console.warn('Fori: Tabula',e);closeT();toast('No se ha podido leer Tabula')})};
})();
