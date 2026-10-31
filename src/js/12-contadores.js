/* ============ Módulo: contadores de equipos ============ */
const TEAM_COLORS=['#e03131','#1e6fe0','#2f9e44','#f08c00','#7048e8','#0ca678'];
function mScore(body){
  const wrap=h('div',{class:'teams'});
  function draw(){
    wrap.replaceChildren(...S.counters.map(t=>{
      const tv=h('div',{class:'tv'},String(t.v));
      const add=d=>()=>{t.v+=d;tv.textContent=t.v;save()};
      return h('div',{class:'team',style:`--c:${t.c}`},
        h('div',{class:'tn',contenteditable:'true',spellcheck:'false',oninput:e=>{t.n=e.target.textContent;save()}},t.n),
        tv,h('div',{class:'row c'},h('button',{class:'btn ghost big','aria-label':'Restar uno',onclick:add(-1)},ico('minus')),h('button',{class:'btn big','aria-label':'Sumar uno',onclick:add(1)},ico('plus'))));
    }));
  }
  body.append(wrap,h('div',{class:'row c',style:'margin-top:14px'},
    h('button',{class:'btn ghost',onclick:()=>{if(S.counters.length<6){const i=S.counters.length;S.counters.push({n:'Equipo '+(i+1),v:0,c:TEAM_COLORS[i%6]});save();draw()}}},...ib('plus','Equipo')),
    h('button',{class:'btn ghost',onclick:()=>{if(S.counters.length>1){S.counters.pop();save();draw()}}},...ib('minus','Equipo')),
    h('button',{class:'btn ghost',onclick:()=>{S.counters.forEach(t=>t.v=0);save();draw()}},...ib('reset','A cero'))));
  draw();
}

