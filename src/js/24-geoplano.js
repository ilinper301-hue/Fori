/* ============ Geoplano ============ */
function mGeo(body){
  let n=7,bands=[];
  const V=560,PD=40,sp=()=>(V-2*PD)/(n-1),pos=k=>PD+k*sp();
  const view=h('div'),list=h('div',{class:'row c',style:'margin-top:10px;min-height:44px'});
  const area=p=>Math.abs(p.reduce((s,a,i)=>{const b=p[(i+1)%p.length];return s+a[0]*b[1]-b[0]*a[1]},0))/2; // fórmula de Gauss
  const cur=()=>{const b=bands[bands.length-1];return b&&!b.closed&&!b.done?b:null};
  function draw(){
    let s=`<rect x="2" y="2" width="${V-4}" height="${V-4}" rx="16" fill="var(--board)" stroke="var(--line)" stroke-width="3"/>`,hits='';
    for(let i=0;i<n;i++)for(let j=0;j<n;j++){
      s+=`<circle cx="${pos(i)}" cy="${pos(j)}" r="6" fill="var(--muted)"/>`;
      hits+=`<circle data-x="${i}" data-y="${j}" cx="${pos(i)}" cy="${pos(j)}" r="${Math.min(sp()/2,28)}" fill="transparent"/>`;
    }
    bands.forEach((b,bi)=>{
      const c=MCOL[bi%MCOL.length],pts=b.pts.map(([x,y])=>`${pos(x)},${pos(y)}`).join(' ');
      if(b.closed)s+=`<polygon points="${pts}" fill="${c}" fill-opacity=".3" stroke="${c}" stroke-width="6" stroke-linejoin="round"/>`;
      else if(b.pts.length>1)s+=`<polyline points="${pts}" fill="none" stroke="${c}" stroke-width="6" stroke-linejoin="round" stroke-linecap="round"/>`;
      b.pts.forEach(([x,y])=>s+=`<circle cx="${pos(x)}" cy="${pos(y)}" r="10" fill="${c}"/>`);
      if(!b.closed&&!b.done&&b.pts.length>=3)s+=`<circle cx="${pos(b.pts[0][0])}" cy="${pos(b.pts[0][1])}" r="19" fill="none" stroke="${c}" stroke-width="4" stroke-dasharray="5 4"/>`;
      if(b.closed){
        const mx=b.pts.reduce((a,p)=>a+p[0],0)/b.pts.length,my=b.pts.reduce((a,p)=>a+p[1],0)/b.pts.length;
        s+=`<text x="${pos(mx)}" y="${pos(my)}" text-anchor="middle" dominant-baseline="central" font-size="26" font-weight="800" fill="var(--ink)" stroke="var(--board)" stroke-width="5" paint-order="stroke">${mFmt(area(b.pts))}</text>`;
      }
    });
    view.innerHTML=`<svg viewBox="0 0 ${V} ${V}" style="display:block;width:100%;max-width:min(100%,56vh);margin:0 auto;touch-action:none">${s}${hits}</svg>`;
    const cl=bands.map((b,bi)=>[b,bi]).filter(([b])=>b.closed);
    list.replaceChildren(...(cl.length?cl.map(([b,bi],k)=>{const a=area(b.pts);
      return h('div',{class:'gchip',style:`border-color:${MCOL[bi%MCOL.length]}`},`Goma ${k+1}: ${mFmt(a)} ${a===1?'cuadradito':'cuadraditos'}`)}):[h('span',{class:'muted'},'Toca los pinchos para tender la goma · toca el primero para cerrarla')]));
  }
  view.addEventListener('pointerdown',e=>{
    const t=e.target;if(t.dataset.x==null)return;
    const p=[+t.dataset.x,+t.dataset.y];let b=cur();
    if(!b){b={pts:[],closed:false,done:false};bands.push(b)}
    const last=b.pts[b.pts.length-1];
    if(last&&last[0]===p[0]&&last[1]===p[1])return;
    if(b.pts.length>=3&&b.pts[0][0]===p[0]&&b.pts[0][1]===p[1])b.closed=true;
    else if(!b.pts.length||!(b.pts.length<3&&b.pts[0][0]===p[0]&&b.pts[0][1]===p[1]))b.pts.push(p);
    draw();
  });
  const undo=()=>{
    const b=bands[bands.length-1];if(!b)return;
    if(b.closed)b.closed=false;else{b.pts.pop();if(!b.pts.length)bands.pop()}
    draw();
  };
  const newBand=()=>{const b=cur();if(b){if(b.pts.length)b.done=true;else bands.pop()}draw()};
  const seg=h('div',{class:'seg'},[5,7,10].map(k=>h('button',{class:k===n?'on':'',onclick:e=>{n=k;bands=[];$$('button',seg).forEach(x=>x.classList.toggle('on',x===e.currentTarget));draw()}},`${k}×${k}`)));
  body.append(seg,h('div',{style:'height:10px'}),view,list,
    h('div',{class:'row c',style:'margin-top:10px'},
      h('button',{class:'btn ghost',onclick:undo},...ib('undo','Deshacer punto')),
      h('button',{class:'btn ghost',onclick:newBand},...ib('plus','Nueva goma')),
      h('button',{class:'btn danger',onclick:()=>{bands=[];draw()}},...ib('trash','Borrar todo'))));
  draw();
}
tool({id:'geo',group:'mates',order:120,icon:'geo',label:'Geoplano',title:'Geoplano',build:mGeo,w:620});
