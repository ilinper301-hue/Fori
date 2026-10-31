/* ============ Módulo: parejas y grupos ============ */
function mGroups(body){
  let mode='pairs',n=3;
  const res=h('div',{class:'groups'});
  const nv=h('b',{style:'font-size:28px;min-width:40px;text-align:center'},String(n));
  const step=h('div',{class:'row c',style:'display:none;margin-top:10px'},
    h('span',{style:'font-size:20px'},'Nº de grupos:'),
    h('button',{class:'btn ghost','aria-label':'Menos grupos',onclick:()=>{n=Math.max(2,n-1);nv.textContent=n}},ico('minus')),nv,
    h('button',{class:'btn ghost','aria-label':'Más grupos',onclick:()=>{n=Math.min(12,n+1);nv.textContent=n}},ico('plus')));
  const sg=h('div',{class:'seg'},
    h('button',{class:'on',onclick:e=>set('pairs',e.currentTarget)},...ib('pair','Parejas')),
    h('button',{onclick:e=>set('groups',e.currentTarget)},...ib('users','Grupos')));
  function set(m,b){mode=m;$$('button',sg).forEach(x=>x.classList.toggle('on',x===b));step.style.display=m==='groups'?'flex':'none'}
  function mix(){
    const st=shuffle(S.students);
    if(!st.length){res.textContent='Añade alumnos en Ajustes';return}
    const g=mode==='pairs'?Math.max(1,Math.floor(st.length/2)):Math.min(n,st.length);
    const bins=Array.from({length:g},()=>[]);st.forEach((s,i)=>bins[i%g].push(s));
    res.replaceChildren(...bins.map((b,i)=>h('div',{class:'gcard'},h('b',{},(mode==='pairs'?'Pareja ':'Grupo ')+(i+1)),...b.map(x=>h('div',{},x)))));
  }
  body.append(sg,step,h('div',{class:'row c',style:'margin-top:12px'},h('button',{class:'btn',onclick:mix},...ib('shuffle','Mezclar'))),res);
}

