/* ============ Módulo: horario ============ */
function mSchedule(body){
  const draw=()=>{
    const now=new Date(),m=now.getHours()*60+now.getMinutes(),L=todayLines(now);
    body.replaceChildren(...(L.length?L.map(x=>h('div',{class:'srow'+(x.s!=null&&m>=x.s&&m<x.e?' now':'')},h('span',{class:'st'},x.time),h('span',{},x.name))):[h('p',{class:'muted'},'Hoy no hay horario. Configúralo en Ajustes.')]));
  };
  draw();const iv=setInterval(draw,30000);
  return()=>clearInterval(iv);
}

