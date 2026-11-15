/* ============ Recta numérica ============ */
function mLine(body){
  const L=S.mathLine=S.mathLine||{from:0,to:10,step:1};
  const W=860,PX=44,AY=190;
  let marks=[];
  const view=h('div'),info=h('div',{class:'mlinfo'}),msg=h('div',{class:'muted'}),labNote=h('div',{class:'muted',style:'font-size:15px;min-height:0'});
  const labSeg=h('div',{class:'seg',style:'max-width:420px'},[['all','Todas'],['main','Principales'],['none','Ninguna']].map(([k,t])=>h('button',{class:(L.labels||'all')===k?'on':'',onclick:e=>{
    L.labels=k;save();$$('button',labSeg).forEach(b=>b.classList.toggle('on',b===e.currentTarget));draw()}},t)));
  const mk=(v,lbl)=>h('input',{class:'numin',type:'text',inputmode:'decimal','aria-label':lbl,value:mFmt(v),onchange:apply});
  const inF=mk(L.from,'Desde'),inT=mk(L.to,'Hasta'),inS=mk(L.step,'Paso');
  function apply(){
    let f=mNum(inF.value),t=mNum(inT.value),s=mNum(inS.value);
    if(!(s>0)||!(t>f)||(t-f)/s>200){msg.textContent='Revisa los valores: «hasta» mayor que «desde», paso positivo y como máximo 200 marcas.';return}
    const n=Math.round((t-f)/s);t=f+n*s;
    Object.assign(L,{from:f,to:t,step:s});save();msg.textContent='';
    inF.value=mFmt(f);inT.value=mFmt(t);inS.value=mFmt(s);marks=[];draw();
  }
  const pre=[[0,10,1,'0–10'],[0,20,1,'0–20'],[0,100,10,'0–100 · de 10 en 10'],[-10,10,1,'−10 a 10'],[0,1,.1,'0–1 · de 0,1 en 0,1']];
  function draw(){
    const n=Math.round((L.to-L.from)/L.step),pitch=(W-2*PX)/n,X=i=>PX+i*pitch,V=i=>L.from+i*L.step;
    const maxc=Math.max(mFmt(V(0)).length,mFmt(V(n)).length,mFmt(V(Math.floor(n/2))).length);
    const k=[1,2,5,10,20,25,50,100].find(k=>k*pitch>=maxc*13+22)||200;
    // «Todas» solo si caben sin solaparse; si no, cae a «Principales»
    const fitsAll=pitch>=maxc*9.6+9;
    const lm=L.labels==='main'||L.labels==='none'?L.labels:'all',eff=lm==='all'&&!fitsAll?'main':lm;
    labNote.textContent=lm==='all'&&!fitsAll?'Hay demasiadas marcas para numerarlas todas: se muestran solo las principales.':'';
    let s=`<line x1="14" y1="${AY}" x2="${W-14}" y2="${AY}" stroke="var(--ink)" stroke-width="4" stroke-linecap="round"/>`;
    for(let i=0;i<=n;i++){
      const big=i%k===0;
      s+=`<line x1="${X(i)}" y1="${AY-(big?15:8)}" x2="${X(i)}" y2="${AY+(big?15:8)}" stroke="var(--ink)" stroke-width="${big?3:1.6}"/>`;
      if(eff==='none')continue;
      if(big)s+=`<text x="${X(i)}" y="${AY+50}" text-anchor="middle" font-size="24" font-weight="800" fill="var(--ink)">${mFmt(V(i))}</text>`;
      else if(eff==='all')s+=`<text x="${X(i)}" y="${AY+46}" text-anchor="middle" font-size="18" font-weight="700" fill="var(--muted)">${mFmt(V(i))}</text>`;
    }
    const top=AY-58;
    marks.forEach((i,j)=>{
      s+=`<line x1="${X(i)}" y1="${AY}" x2="${X(i)}" y2="${top}" stroke="var(--muted)" stroke-dasharray="4 5" stroke-width="2"/><circle cx="${X(i)}" cy="${AY}" r="9" fill="var(--accent)"/>`;
      if(!j)return;
      const a=X(marks[j-1]),b=X(i),dl=(i-marks[j-1])*L.step,col=dl>0?'#2f9e44':'#e03131',ch=clamp(Math.abs(b-a)*.9,50,170),cyy=top-ch;
      const ux=b-(a+b)/2,uy=top-cyy,m=Math.hypot(ux,uy),dx=ux/m,dy=uy/m;
      s+=`<path d="M${a} ${top}Q${(a+b)/2} ${cyy} ${b} ${top}" fill="none" stroke="${col}" stroke-width="4.5" stroke-linecap="round"/>
        <path d="M${b} ${top}l${-14*dx+7*dy} ${-14*dy-7*dx}l${-14*dy} ${14*dx}Z" fill="${col}"/>
        <text x="${(a+b)/2}" y="${top-ch/2-8}" text-anchor="middle" font-size="26" font-weight="800" fill="${col}" stroke="var(--panel)" stroke-width="5" paint-order="stroke">${dl>0?'+':'−'}${mFmt(Math.abs(dl))}</text>`;
    });
    if(marks.length)s+=`<text x="${X(marks[marks.length-1])}" y="${AY-12}" text-anchor="middle" font-size="40">🐸</text>`;
    view.innerHTML=`<svg viewBox="0 0 ${W} 260" width="100%" style="display:block;touch-action:none;background:var(--board);border-radius:14px">${s}</svg>`;
    view.dataset.n=n;view.dataset.pitch=pitch;
    info.textContent=marks.length?(marks.length>1?marks.map(i=>mFmt(V(i))).join(' → '):'Estás en '+mFmt(V(marks[0]))):'Toca la recta para colocar la rana';
  }
  view.addEventListener('pointerdown',e=>{
    const svg=$('svg',view);if(!svg)return;
    const r=svg.getBoundingClientRect(),n=Number(view.dataset.n),pitch=Number(view.dataset.pitch);
    const i=clamp(Math.round(((e.clientX-r.left)/r.width*W-PX)/pitch),0,n);
    if(marks[marks.length-1]===i)return;
    marks.push(i);draw();
  });
  body.append(
    h('div',{class:'row c'},h('label',{class:'row'},'Desde',inF),h('label',{class:'row'},'Hasta',inT),h('label',{class:'row'},'Paso',inS)),
    h('div',{class:'row c',style:'margin:10px 0'},pre.map(([f,t,s,l])=>h('button',{class:'btn ghost',onclick:()=>{inF.value=mFmt(f);inT.value=mFmt(t);inS.value=mFmt(s);apply()}},l))),
    h('div',{class:'row c',style:'margin-bottom:8px'},h('span',{class:'lbl',style:'margin:0'},'Números'),labSeg),labNote,
    msg,view,info,
    h('div',{class:'row c',style:'margin-top:10px'},
      h('button',{class:'btn ghost',onclick:()=>{marks.pop();draw()}},...ib('undo','Quitar último')),
      h('button',{class:'btn ghost',onclick:()=>{marks=[];draw()}},...ib('eraser','Borrar saltos'))));
  draw();
}
tool({id:'line',group:'mates',order:80,icon:'numline',label:'Recta numérica',title:'Recta numérica',build:mLine,w:900});
