/* ============ Fracciones ============ */
function mFrac(body){
  let den=4;const on=new Set();
  const circ=h('div'),bar=h('div'),fr=h('div',{class:'frbox'}),dec=h('div',{class:'muted'}),dn=h('b',{style:'font-size:36px;min-width:48px;text-align:center'});
  function draw(){
    [...on].forEach(i=>i>=den&&on.delete(i));
    const r=120,c=130,A=Math.PI*2/den;let s='',b='';
    for(let i=0;i<den;i++){
      const cl='fp'+(on.has(i)?' on':'');
      if(den===1)s=`<circle class="${cl}" data-i="0" cx="${c}" cy="${c}" r="${r}"/>`;
      else{const a0=-Math.PI/2+i*A,a1=a0+A;
        s+=`<path class="${cl}" data-i="${i}" d="M${c} ${c}L${(c+r*Math.cos(a0)).toFixed(2)} ${(c+r*Math.sin(a0)).toFixed(2)}A${r} ${r} 0 0 1 ${(c+r*Math.cos(a1)).toFixed(2)} ${(c+r*Math.sin(a1)).toFixed(2)}Z"/>`}
      b+=`<rect class="${cl}" data-i="${i}" x="${6+i*528/den}" y="6" width="${528/den}" height="70"/>`;
    }
    circ.innerHTML=`<svg viewBox="0 0 260 260" width="260" height="260" style="display:block">${s}</svg>`;
    bar.innerHTML=`<svg viewBox="0 0 540 82" width="100%" style="display:block;max-width:540px;margin:0 auto">${b}</svg>`;
    const k=on.size,q=k/den,ex=Math.abs(q*1000-Math.round(q*1000))<1e-9;
    fr.innerHTML=`<div class="fr"><b style="color:var(--coral)">${k}</b><i></i><b>${den}</b></div>`;
    dec.textContent=`${ex?'=':'≈'} ${mFmt(Math.round(q*1000)/1000)}`+(k===den?' · ¡el entero!':'');
    dn.textContent=den;
  }
  const hit=e=>{const t=e.target.dataset.i;if(t==null)return;const i=+t;on.has(i)?on.delete(i):on.add(i);draw()};
  circ.addEventListener('click',hit);bar.addEventListener('click',hit);
  const setD=d=>{den=clamp(d,1,12);draw()};
  body.append(
    h('div',{class:'row c'},h('span',{style:'font-size:20px'},'Partes (denominador):'),
      h('button',{class:'btn ghost big','aria-label':'Menos partes',onclick:()=>setD(den-1)},ico('minus')),dn,
      h('button',{class:'btn ghost big','aria-label':'Más partes',onclick:()=>setD(den+1)},ico('plus'))),
    h('div',{class:'row c',style:'justify-content:space-around;margin:12px 0'},circ,h('div',{},fr,dec)),
    bar,
    h('div',{class:'row c',style:'margin-top:12px'},
      h('button',{class:'btn',onclick:()=>{for(let i=0;i<den;i++)on.add(i);draw()}},'Rellenar todo'),
      h('button',{class:'btn ghost',onclick:()=>{on.clear();draw()}},'Vaciar')),
    h('p',{class:'muted',style:'margin:10px 0 0'},'Toca una parte para colorearla o quitarle el color'));
  draw();
}
tool({id:'frac',group:'mates',order:90,icon:'frac',label:'Fracciones',title:'Fracciones',build:mFrac,w:640});
