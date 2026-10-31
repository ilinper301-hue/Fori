/* ============ Módulo: alumno al azar ============ */
let pool=[];
function mPicker(body){
  let iv=null;
  const out=h('div',{class:'pick'},'—');
  const info=h('div',{class:'muted'});
  const nr=h('input',{type:'checkbox',checked:''});
  const upd=()=>info.textContent=S.students.length?(nr.checked?`Quedan ${pool.length||S.students.length} por salir`:`${S.students.length} alumnos`):'Añade alumnos en Ajustes';
  nr.addEventListener('change',()=>{pool=[];upd()});
  const go=h('button',{class:'btn',style:'min-width:200px;min-height:68px;font-size:28px',onclick:()=>{
    if(!S.students.length||iv)return;
    if(nr.checked&&!pool.length)pool=[...S.students];
    const list=nr.checked?pool:S.students,fin=list[Math.floor(Math.random()*list.length)];
    let i=0;out.classList.add('spin');
    iv=setInterval(()=>{
      out.textContent=S.students[Math.floor(Math.random()*S.students.length)];
      if(++i>14){clearInterval(iv);iv=null;out.textContent=fin;out.classList.remove('spin');
        if(nr.checked)pool.splice(pool.indexOf(fin),1);
        upd();}
    },80);
  }},...ib('dice','¡Elegir!'));
  body.append(out,h('div',{class:'row c'},go,h('button',{class:'btn ghost','aria-label':'Reiniciar',onclick:()=>{pool=[];out.textContent='—';upd()}},ico('reset'))),
    h('label',{class:'chk'},nr,'No repetir hasta que salgan todos'),info);
  upd();
  return()=>clearInterval(iv);
}

