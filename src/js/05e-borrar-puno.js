/* ============ Borrar con el puño ============ */
// Un contacto táctil grande (puño o palma) o tres dedos muy juntos actúan como un borrador grande.
// Reutiliza el borrador de siempre: crea un trazo 'eraser', así que deshacer/rehacer funcionan igual.
const FIST_DEFAULT=40;     // px CSS de contacto a partir de los cuales se considera un puño
const FIST_GROUP_DIST=190; // px: tres contactos así de juntos cuentan como un puño (pantallas que no informan del tamaño)
const FIST_STALE=15000;    // ms: se olvidan contactos que no llegaron a soltarse
const fistPx=()=>S.fistPx===undefined?FIST_DEFAULT:(Number(S.fistPx)||0); // 0 = desactivado
const fistTouches=new Map(); // contactos táctiles apoyados: id -> {x,y,t}
let fistNow=null;            // gesto en curso: {ids:Set, s:trazo borrador, last:{x,y}}

function fistCenter(ids){
  const ps=ids.map(i=>fistTouches.get(i)).filter(Boolean);
  if(!ps.length)return fistNow?fistNow.last:{x:0,y:0};
  return{x:ps.reduce((a,q)=>a+q.x,0)/ps.length,y:ps.reduce((a,q)=>a+q.y,0)/ps.length};
}
function fistBox(ids){
  const ps=ids.map(i=>fistTouches.get(i)).filter(Boolean);if(!ps.length)return 0;
  const xs=ps.map(q=>q.x),ys=ps.map(q=>q.y);
  return Math.max(Math.max(...xs)-Math.min(...xs),Math.max(...ys)-Math.min(...ys));
}
function fistStart(ids,p,contact){
  commitEditor();setSel(null);
  const size=clamp(Math.round(contact?contact*1.2:fistBox(ids)+70),70,280);
  const s={type:'free',tool:'eraser',color:'ink',size,pts:[p]};
  const zi=zoneAt(p.x);
  if(zi>=0){const [x0,x1]=zoneRange(zi);s.zone=[x0+3,x1-3]} // en pizarra dividida no se sale de su zona
  seg(cd,s,p,p);
  fistNow={ids:new Set(ids),s,last:p};
}
// Devuelve true si el contacto es (parte de) un puño y la pizarra no debe tratarlo como un dedo.
function fistDown(e,p){
  if(e.pointerType!=='touch'||!fistPx())return false;
  const now=Date.now();
  for(const [id,q] of fistTouches)if(now-q.t>FIST_STALE)fistTouches.delete(id);
  fistTouches.set(e.pointerId,{x:p.x,y:p.y,t:now});
  if(fistNow){ // otro dedo del mismo puño; uno lejano (otro alumno) se trata como un dedo normal
    if(Math.hypot(p.x-fistNow.last.x,p.y-fistNow.last.y)>FIST_GROUP_DIST*1.5)return false;
    fistNow.ids.add(e.pointerId);dr.setPointerCapture(e.pointerId);return true;
  }
  const contact=Math.max(e.width||0,e.height||0);
  if(contact>=fistPx()){fistStart([e.pointerId],p,contact);dr.setPointerCapture(e.pointerId);return true}
  const near=[...fistTouches].filter(([,q])=>Math.hypot(q.x-p.x,q.y-p.y)<=FIST_GROUP_DIST).map(([id])=>id);
  if(near.length>=3){
    for(const id of near){const s=active.get(id);if(s){clearTimeout(s.lp);active.delete(id)}} // descarta los trazos sueltos que ya habían empezado
    redraw();drawLive();
    fistStart(near,fistCenter(near),0);dr.setPointerCapture(e.pointerId);return true;
  }
  return false;
}
dr.addEventListener('pointermove',e=>{
  if(!fistNow||!fistNow.ids.has(e.pointerId))return;
  const solo=fistNow.ids.size===1,evs=solo&&e.getCoalescedEvents?e.getCoalescedEvents():[];
  for(const ev of (evs.length?evs:[e])){
    const q=pt(ev);fistTouches.set(e.pointerId,{x:q.x,y:q.y,t:Date.now()});
    let p=solo?q:fistCenter([...fistNow.ids]);
    const s=fistNow.s;
    if(s.zone)p={x:clamp(p.x,s.zone[0],s.zone[1]),y:p.y};
    seg(cd,s,fistNow.last,p);s.pts.push(p);fistNow.last=p;
  }
});
function fistUp(e){
  fistTouches.delete(e.pointerId);
  if(!fistNow||!fistNow.ids.has(e.pointerId))return;
  const s=fistNow.s;fistNow=null; // al soltar el primer dedo termina el gesto
  delete s.zone;
  P().strokes.push(s);record({t:'add',s});
}
dr.addEventListener('pointerup',fistUp);dr.addEventListener('pointercancel',fistUp);

// Opción en Ajustes (junto al tamaño de pauta)
(()=>{
  const a=$('#sPauta');if(!a||!a.closest('label'))return;
  a.closest('label').after(h('label',{class:'inl'},'Borrar con el puño ',
    h('select',{id:'sFist'},...[['0','Desactivado'],['30','Muy sensible'],['40','Normal'],['55','Poco sensible']].map(([v,t])=>h('option',{value:v},t)))));
})();
