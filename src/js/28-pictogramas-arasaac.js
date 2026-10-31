/* ============ Pictogramas ARASAAC ============ */
const PICTO_CREDIT='Pictogramas: Sergio Palao. Origen: ARASAAC (https://arasaac.org). Licencia: CC BY-NC-SA. Propiedad: Gobierno de Aragón (España).';
const PICTO_API=['https://api.arasaac.org/v1/pictograms/es/bestsearch/','https://api.arasaac.org/v1/pictograms/es/search/','https://api.arasaac.org/api/pictograms/es/search/'];
const PC_STOP=new Set('de del la el los las un una unos unas y e o u en con para por al a'.split(' '));
// «Encargado/a de la clase (hoy)» → «encargado de la clase»
const pcClean=t=>String(t).replace(/\([^)]*\)/g,' ').replace(/\/[a-zñ]{1,2}(?![a-zñ])/gi,'').replace(/[^\p{L}\p{N} ]+/gu,' ').replace(/\s+/g,' ').trim().toLowerCase();
const pcNorm=t=>t.normalize('NFD').replace(/[̀-ͯ]/g,'');
const pcPending=new Map();let pcDown=0;
// → id | 0 (la API respondió y no hay resultado) | null (error: no se puede afirmar nada)
async function pcQuery(q){
  let err=false;
  for(const base of PICTO_API){
    try{
      const ac=new AbortController(),to=setTimeout(()=>ac.abort(),8000);
      let r;try{r=await fetch(base+encodeURIComponent(q),{signal:ac.signal})}finally{clearTimeout(to)}
      if(r.status===404)continue; // ARASAAC responde 404 cuando no hay resultados
      if(!r.ok){err=true;continue}
      const j=await r.json(),id=Array.isArray(j)&&j[0]&&(j[0]._id!=null?j[0]._id:j[0].id);
      if(id)return Number(id);
    }catch{err=true}
  }
  return err?null:0;
}
function pcLookup(text){
  const clean=pcClean(text),key=pcNorm(clean);
  if(!key)return Promise.resolve(0);
  if(!S.picto||typeof S.picto!=='object')S.picto={};
  if(key in S.picto)return Promise.resolve(S.picto[key]);
  if(pcPending.has(key))return pcPending.get(key);
  if(Date.now()<pcDown)return Promise.resolve(null); // sin red hace poco: no insistir
  const p=(async()=>{
    const first=clean.split(' ').find(w=>w.length>2&&!PC_STOP.has(w)),qs=[clean];
    if(first&&first!==clean)qs.push(first);
    let id=0,unknown=false;
    for(const q of qs){const r=await pcQuery(q);if(r){id=r;break}if(r===null)unknown=true}
    if(id||!unknown){S.picto[key]=id;save();return id}
    pcDown=Date.now()+30000;return null;
  })().finally(()=>pcPending.delete(key));
  pcPending.set(key,p);return p;
}
function pictoImg(word){
  if(S.pictos===false)return null;
  const img=h('img',{class:'picto',alt:'',draggable:'false'});
  img.onload=()=>img.classList.add('ok');img.onerror=()=>img.remove();
  pcLookup(word).then(id=>{if(id)img.src=`https://static.arasaac.org/pictograms/${id}/${id}_300.png`;else img.remove()},()=>img.remove());
  return img;
}
const pictoCredit=()=>S.pictos===false?null:h('p',{class:'credit'},PICTO_CREDIT);

function mScheduleP(body){
  let sig='';
  const draw=()=>{
    const now=new Date(),m=now.getHours()*60+now.getMinutes(),L=todayLines(now);
    const flags=L.map(x=>x.s!=null&&m>=x.s&&m<x.e),s=now.getDay()+'|'+flags.join()+'|'+JSON.stringify(L)+'|'+(S.pictos!==false);
    if(s===sig)return;sig=s;
    body.replaceChildren(...(L.length?L.map((x,i)=>h('div',{class:'srow p'+(flags[i]?' now':'')},pictoImg(x.name),h('span',{class:'st'},x.time),h('span',{},x.name))):[h('p',{class:'muted'},'Hoy no hay horario. Configúralo en Ajustes.')]),pictoCredit());
  };
  draw();const iv=setInterval(draw,30000);
  return()=>clearInterval(iv);
}

function mRolesP(body){
  const names=[],list=h('div');
  S.roles.forEach(r=>{const b=h('b');names.push(b);list.append(h('div',{class:'rrow p'},h('span',{class:'rg'},pictoImg(r),h('span',{class:'rl'},r)),b))});
  const draw=()=>{const st=S.students;names.forEach((b,i)=>b.textContent=st.length?st[(i+S.offset)%st.length]:'—')};
  body.append(list,h('div',{class:'row c',style:'margin-top:14px'},h('button',{class:'btn',onclick:()=>{S.offset=(S.offset+1)%Math.max(1,S.students.length);save();draw()}},...ib('rotate','Rotar encargados'))),pictoCredit());
  draw();
}


