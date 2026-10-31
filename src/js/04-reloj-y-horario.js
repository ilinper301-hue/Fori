/* ============ Reloj y horario ============ */
function parseLine(t){
  const m=t.match(/^(\d{1,2}):(\d{2})\s*[-–]\s*(\d{1,2}):(\d{2})\s+(.+)$/);
  return m?{s:Number(m[1])*60+Number(m[2]),e:Number(m[3])*60+Number(m[4]),name:m[5],time:`${pad(m[1])}:${m[2]}–${pad(m[3])}:${m[4]}`}:{name:t,time:''};
}
const todayLines=(d=new Date())=>(S.schedule[d.getDay()]||[]).map(parseLine);
function tickClock(){
  const d=new Date(),m=d.getHours()*60+d.getMinutes();
  const ds=d.toLocaleDateString('es-ES',{weekday:'long',day:'numeric',month:'long'});
  $('#dateStr').textContent=ds.charAt(0).toUpperCase()+ds.slice(1);
  $('#clock').textContent=`${pad(d.getHours())}:${pad(d.getMinutes())}`;
  const cur=todayLines(d).find(x=>x.s!=null&&m>=x.s&&m<x.e);
  const sj=$('#subject');sj.style.display=cur?'inline-block':'none';if(cur)sj.textContent='Ahora: '+cur.name;
}

