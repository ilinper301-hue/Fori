/* ============ Tangram ============ */
const TK=65; // px por unidad: el cuadrado completo mide 4 × 4 unidades
// Piezas en la posición del cuadrado resuelto: 2 triángulos grandes, 1 mediano, 2 pequeños, cuadrado y romboide
const TANS=[
  ['L1','#e03131',[[0,0],[4,0],[2,2]]],
  ['L2','#1e6fe0',[[0,0],[2,2],[0,4]]],
  ['M','#2f9e44',[[4,2],[4,4],[2,4]]],
  ['S1','#fcc419',[[4,0],[4,2],[3,1]]],
  ['S2','#ae3ec9',[[2,2],[3,3],[1,3]]],
  ['SQ','#f08c00',[[2,2],[3,1],[4,2],[3,3]]],
  ['PA','#15aabf',[[0,4],[1,3],[3,3],[2,4]]]];
const TAN={};
TANS.forEach(([id,col,pts])=>{
  const xs=pts.map(p=>p[0]),ys=pts.map(p=>p[1]),x0=Math.min(...xs),y0=Math.min(...ys);
  const w=(Math.max(...xs)-x0)*TK,hh=(Math.max(...ys)-y0)*TK;
  const loc=pts.map(([x,y])=>[(x-x0)*TK,(y-y0)*TK]);
  const cx=loc.reduce((s,p)=>s+p[0],0)/loc.length,cy=loc.reduce((s,p)=>s+p[1],0)/loc.length;
  TAN[id]={x0:x0*TK,y0:y0*TK,loc,cx,cy};
  KINDS['tan'+id]={w,h:hh,g:'tan',tan:true,svg:`<svg width="${w}" height="${hh}" viewBox="0 0 ${w} ${hh}" style="overflow:visible"><polygon points="${loc.map(p=>p.join(',')).join(' ')}" fill="${col}" stroke="rgba(0,0,0,.45)" stroke-width="2" stroke-linejoin="round"/></svg>`};
});
const TAN_SQUARE=TANS.map(([id])=>({id,x:TAN[id].x0,y:TAN[id].y0,r:0,f:0}));
const tanSil=h('div',{class:'tansil'});manip.prepend(tanSil);
const tanEl=id=>{let el=pieces('tan'+id)[0];if(!el){el=addPiece('tan'+id,0,0);el.classList.add('tan')}return el};
function tanApply(el){const t=TAN[el.dataset.k.slice(3)];el.style.transformOrigin=`${t.cx}px ${t.cy}px`;el.style.transform=`rotate(${el.dataset.r||0}deg) scaleX(${el.dataset.f==='1'?-1:1})`}
function tanRotate(el){el.dataset.r=String(((Number(el.dataset.r)||0)+45)%360);tanApply(el)}
function tanFlip(){const el=tanEl('PA');el.dataset.f=el.dataset.f==='1'?'0':'1';tanApply(el)}
function tanPlace(arr,ox,oy){
  arr.forEach(a=>{const el=tanEl(a.id);el.dataset.r=String(a.r);el.dataset.f=a.f?'1':'0';el.classList.add('anim');el.style.left=(ox+a.x)+'px';el.style.top=(oy+a.y)+'px';tanApply(el)});
  setTimeout(()=>pieces(null,'tan').forEach(p=>p.classList.remove('anim')),400);
}
function tanSquare(){tanPlace(TAN_SQUARE,stage.clientWidth*.55-2*TK,stage.clientHeight/2-2*TK)}
let tanAct=null; // reto activo: {name,arr,ox,oy,polys:[{id,pts}],box:[x0,y0,x1,y1]}
// Desordena las piezas en una zona visible: fuera de la silueta, de la ventana del tangram (si sigue visible) y sin montarse entre sí
function tanScatter(){
  const W=stage.clientWidth,H=stage.clientHeight,sr=stage.getBoundingClientRect(),M=14;
  const sil=tanAct&&tanSil.firstChild?tanAct.box:null;
  const wr=wins.get('tan')?.win.getBoundingClientRect();
  const wb=wr&&wr.width>0&&wr.height>0?[wr.left-sr.left-12,wr.top-sr.top-12,wr.right-sr.left+12,wr.bottom-sr.top+12]:null;
  const hit=(a,b)=>a[0]<b[2]&&a[2]>b[0]&&a[1]<b[3]&&a[3]>b[1];
  const placed=[];
  TANS.forEach(([id])=>{
    const el=tanEl(id),r=45*Math.floor(Math.random()*8),pp=tanPoly(id,0,0,r,false);
    const bx0=Math.min(...pp.map(p=>p[0])),bx1=Math.max(...pp.map(p=>p[0])),by0=Math.min(...pp.map(p=>p[1])),by1=Math.max(...pp.map(p=>p[1]));
    let L=M-bx0,T=M-by0;
    for(let t=0;t<400;t++){
      const l=M-bx0+Math.random()*Math.max(0,W-2*M-(bx1-bx0)),tp=M-by0+Math.random()*Math.max(0,H-2*M-(by1-by0));
      const bb=[l+bx0,tp+by0,l+bx1,tp+by1];
      if(sil&&hit(bb,sil))continue;
      if(t<300&&wb&&hit(bb,wb))continue;
      if(t<150&&placed.some(q=>hit(bb,[q[0]-8,q[1]-8,q[2]+8,q[3]+8])))continue;
      L=l;T=tp;break;
    }
    placed.push([L+bx0,T+by0,L+bx1,T+by1]);
    el.dataset.r=String(r);el.dataset.f='0';el.classList.add('anim');
    el.style.left=L+'px';el.style.top=T+'px';tanApply(el);
  });
  setTimeout(()=>pieces(null,'tan').forEach(p=>p.classList.remove('anim')),400);
}
// Polígono de una pieza en coordenadas de la pizarra (misma cuenta que hace el CSS: volteo y luego giro)
function tanPoly(id,left,top,r,f){
  const t=TAN[id],a=r*Math.PI/180,c=Math.cos(a),s=Math.sin(a);
  return t.loc.map(([x,y])=>{let dx=x-t.cx;const dy=y-t.cy;if(f)dx=-dx;return[left+t.cx+dx*c-dy*s,top+t.cy+dx*s+dy*c]});
}
function tanCurrent(){
  const arr=TANS.map(([id])=>{const el=tanEl(id);return{id,x:el.offsetLeft,y:el.offsetTop,r:Number(el.dataset.r)||0,f:el.dataset.f==='1'?1:0}});
  const all=arr.flatMap(a=>tanPoly(a.id,a.x,a.y,a.r,a.f)),mx=Math.min(...all.map(p=>p[0])),my=Math.min(...all.map(p=>p[1]));
  return arr.map(a=>({...a,x:Math.round(a.x-mx),y:Math.round(a.y-my)}));
}
function tanChallenge(arr,name){
  const polys=arr.map(a=>tanPoly(a.id,a.x,a.y,a.r,a.f)),all=polys.flat();
  const fw=Math.max(...all.map(p=>p[0])),fh=Math.max(...all.map(p=>p[1]));
  const W=stage.clientWidth,H=stage.clientHeight,ox=Math.min(W*.75-fw/2,W-fw-20),oy=(H-fh)/2;
  tanAct={name:name||'',arr,ox,oy,polys:arr.map((a,i)=>({id:a.id,pts:polys[i].map(([x,y])=>[x+ox,y+oy])})),
    box:[ox+Math.min(...all.map(p=>p[0]))-16,oy+Math.min(...all.map(p=>p[1]))-16,ox+fw+16,oy+fh+16]};
  minimizeWin('tan');
  tanSil.innerHTML=`<svg width="${W}" height="${H}"><g fill="rgba(110,110,110,.38)" stroke="rgba(110,110,110,.38)" stroke-width="1.5" stroke-linejoin="round">${polys.map(p=>`<polygon points="${p.map(([x,y])=>`${(x+ox).toFixed(1)},${(y+oy).toFixed(1)}`).join(' ')}"/>`).join('')}</g></svg>`;
  tanScatter();
  toast('Reto «'+(name||'Cuadrado')+'»: coloca las piezas sobre la silueta');
}
// Comprueba si cada polígono de la silueta tiene una pieza del mismo tipo con los vértices a menos de 18 px (en cualquier orden)
const TAN_GRP={L1:'L',L2:'L',S1:'S',S2:'S'};
function tanCheck(){
  if(!tanAct)return null;
  const ps=pieces(null,'tan');if(!ps.length)return null;
  const tol=18,num=s=>{const v=parseFloat(s);return isNaN(v)?0:v};
  const pcs=TANS.map(([id])=>{const el=tanEl(id);return{g:TAN_GRP[id]||id,pts:tanPoly(id,el.style.left?num(el.style.left):el.offsetLeft,el.style.top?num(el.style.top):el.offsetTop,Number(el.dataset.r)||0,el.dataset.f==='1')}});
  const T=tanAct.polys,near=(a,b)=>a.length===b.length&&a.every(p=>b.some(q=>Math.hypot(p[0]-q[0],p[1]-q[1])<=tol));
  const best=(i,used)=>{
    if(i===T.length)return 0;
    let m=best(i+1,used);
    pcs.forEach((p,j)=>{if(!(used>>j&1)&&p.g===(TAN_GRP[T[i].id]||T[i].id)&&near(T[i].pts,p.pts))m=Math.max(m,1+best(i+1,used|1<<j))});
    return m;
  };
  return T.length-best(0,0);
}
function tanClear(){pieces(null,'tan').forEach(p=>p.remove());tanSil.replaceChildren();tanAct=null}
function mTangram(body){
  if(!pieces(null,'tan').length)tanSquare();
  const list=h('div',{class:'row c'}),res=h('div',{class:'tanres','aria-live':'polite'});
  const renderList=()=>{const figs=S.tanFigs||[];list.replaceChildren(...(figs.length?figs.map((f,i)=>h('span',{class:'tanfig'},
      h('button',{class:'btn ghost',onclick:()=>{res.textContent='';tanChallenge(f.arr,f.name)}},...ib('tangram',f.name)),
      h('button',{class:'btn ghost tdel','aria-label':'Borrar reto '+f.name,onclick:()=>{S.tanFigs.splice(i,1);save();renderList()}},ico('x')))):
    [h('span',{class:'muted',style:'font-size:15px'},'Aún no tienes retos. Forma una figura y pulsa «Guardar figura actual».')]))};
  const check=()=>{
    const m=tanCheck();
    const t=m===null?'Elige primero un reto':m===0?'¡Conseguido!':m===1?'Aún falta 1 pieza por encajar':'Aún faltan '+m+' piezas por encajar';
    res.textContent=t;res.classList.toggle('ok',m===0);toast(t);
  };
  body.append(
    h('div',{class:'row c'},
      h('button',{class:'btn',onclick:()=>{tanSil.replaceChildren();tanAct=null;res.textContent='';tanSquare()}},...ib('square','Formar cuadrado')),
      h('button',{class:'btn ghost',onclick:tanScatter},...ib('shuffle','Desordenar')),
      h('button',{class:'btn ghost',onclick:tanFlip},...ib('flip','Voltear romboide'))),
    h('div',{class:'lbl',style:'margin-top:16px'},'Retos: aparece la silueta y las piezas se desordenan'),
    h('div',{class:'row c'},h('button',{class:'btn ghost',onclick:()=>{res.textContent='';tanChallenge(TAN_SQUARE,'Cuadrado')}},...ib('square','Cuadrado'))),
    h('div',{class:'lbl',style:'margin-top:12px'},'Mis retos'),list,
    h('div',{class:'row c',style:'margin-top:10px'},
      h('button',{class:'btn ghost',onclick:()=>{const n=prompt('Nombre de la figura:','Mi figura');if(!n||!n.trim())return;(S.tanFigs=S.tanFigs||[]).push({name:n.trim(),arr:tanCurrent()});save();renderList();toast('Figura guardada como reto')}},...ib('save','Guardar figura actual'))),
    h('div',{class:'row c',style:'margin-top:16px'},
      h('button',{class:'btn tancheck',onclick:check},...ib('check','Comprobar')),res),
    h('div',{class:'row c',style:'margin-top:10px'},
      h('button',{class:'btn ghost',onclick:()=>tanSil.replaceChildren()},...ib('eye-off','Ocultar silueta')),
      h('button',{class:'btn ghost',onclick:()=>{tanClear();res.textContent=''}},...ib('trash','Quitar tangram'))),
    h('p',{class:'muted',style:'font-size:15px;margin:12px 0 0'},'Arrastra las piezas · Toca dos veces una pieza para girarla 45° · Para crear un reto, forma una figura y pulsa «Guardar figura actual»'));
  renderList();
}
tool({id:'tan',group:'mates',order:60,icon:'tangram',label:'Tangram',title:'Tangram',build:mTangram,w:640,clear:tanClear});
