/* ============ Módulo: encargados ============ */
function mRoles(body){
  const list=h('div');
  const draw=()=>{const st=S.students;list.replaceChildren(...S.roles.map((r,i)=>h('div',{class:'rrow'},h('span',{class:'rl'},r),h('b',{},st.length?st[(i+S.offset)%st.length]:'—'))))};
  body.append(list,h('div',{class:'row c',style:'margin-top:14px'},h('button',{class:'btn',onclick:()=>{S.offset=(S.offset+1)%Math.max(1,S.students.length);save();draw()}},...ib('rotate','Rotar encargados'))));
  draw();
}

