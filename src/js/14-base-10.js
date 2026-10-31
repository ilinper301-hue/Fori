/* ============ Base 10 ============ */
const manip=$('#manip'),mat=$('#mat'),trash=$('#trash');
const U=22; // lado de una unidad en px
const B10={h:{w:U*10,h:U*10,c:'#2f9e44',d:'#1b6b2c'},t:{w:U,h:U*10,c:'#e03131',d:'#a51d24'},u:{w:U,h:U,c:'#1e6fe0',d:'#124a9c'}};
// Registro común de piezas manipulables (base 10 y dinero): tamaño, dibujo SVG y grupo
const KINDS={};
for(const [k,p] of Object.entries(B10)){
  let r='';
  for(let x=0;x<p.w;x+=U)for(let y=0;y<p.h;y+=U)r+=`<rect x="${x+1}" y="${y+1}" width="${U-2}" height="${U-2}" rx="3"/>`;
  KINDS[k]={w:p.w,h:p.h,g:'b10',svg:`<svg width="${p.w}" height="${p.h}" viewBox="0 0 ${p.w} ${p.h}"><g fill="${p.c}" stroke="${p.d}" stroke-width="1.5">${r}</g></svg>`};
}
let b10ui=null,addN=0;
const pieces=(k,g='b10')=>$$('.piece',manip).filter(p=>k?p.dataset.k===k:p.dataset.g===g);
const overTrash=e=>{const r=trash.getBoundingClientRect();return e.clientX>=r.left&&e.clientX<=r.right&&e.clientY>=r.top&&e.clientY<=r.bottom};
const updateCounts=()=>{updateB10();updateEur();updateCuis()};
function addPiece(k,x,y){
  const p=KINDS[k],el=h('div',{class:'piece',html:p.svg});el.dataset.k=k;el.dataset.g=p.g;
  el.style.left=clamp(x,0,stage.clientWidth-p.w)+'px';el.style.top=clamp(y,0,stage.clientHeight-p.h)+'px';
  manip.append(el);
  let d=null,lastTap=0;
  el.addEventListener('pointerdown',e=>{
    if(manip.lastElementChild!==el)manip.append(el);el.setPointerCapture(e.pointerId);
    d={dx:e.clientX-el.offsetLeft,dy:e.clientY-el.offsetTop,x0:e.clientX,y0:e.clientY,moved:false};
  });
  el.addEventListener('pointermove',e=>{
    if(!d)return;
    if(!d.moved&&Math.hypot(e.clientX-d.x0,e.clientY-d.y0)>6){d.moved=true;el.classList.add('drag');if(!p.tan)trash.style.display='grid'}
    if(!d.moved)return;
    el.style.left=clamp(e.clientX-d.dx,-p.w/2,stage.clientWidth-p.w/2)+'px';
    el.style.top=clamp(e.clientY-d.dy,-p.h/2,stage.clientHeight-p.h/2)+'px';
    trash.classList.toggle('hot',overTrash(e));
  });
  const end=(e,ok)=>{
    if(!d)return;const moved=d.moved;d=null;
    const hit=ok&&moved&&!p.tan&&overTrash(e);
    el.classList.remove('drag');trash.style.display='none';trash.classList.remove('hot');
    if(hit){el.remove();updateCounts();return}
    if(ok&&!moved){const now=Date.now();if(now-lastTap<400){lastTap=0;if(p.rot)rotatePiece(el);else if(p.tan)tanRotate(el);else breakPiece(el)}else lastTap=now}
  };
  el.addEventListener('pointerup',e=>end(e,true));
  el.addEventListener('pointercancel',e=>end(e,false));
  updateCounts();return el;
}
function addNew(k){
  if(B10[k]){const q=b10Slot(k,pieces(k).length);addPiece(k,q.x,q.y);return}
  const p=KINDS[k],j=(addN++%8)*18;addPiece(k,stage.clientWidth*.55-p.w/2+j,stage.clientHeight*.4-p.h/2+j);
}
// Posición de la pieza n.º i de cada tipo: centenas apiladas en montones de 10, decenas en filas de 10, unidades en filas de 10.
// Empieza por debajo de las letras C, D, U del tablero.
function b10Slot(k,i){
  const W=stage.clientWidth,cw=W/3,top=96;
  if(k==='h'){
    const st=12,pw=U*10+9*st,ph=U*10+9*st+24,pile=Math.floor(i/10),j=i%10;
    const per=Math.max(1,Math.floor((cw-20)/(pw+20))),col=pile%per,row=Math.floor(pile/per);
    const x0=Math.max(10,(cw-per*(pw+20)+20)/2);
    return{x:x0+col*(pw+20)+j*st,y:top+row*ph+j*st};
  }
  if(k==='t'){const sx=U+8,row=Math.floor(i/10);return{x:cw+Math.max(10,(cw-10*sx)/2)+(i%10)*sx,y:top+row*(U*10+16)}}
  const sx=U+6,row=Math.floor(i/10);return{x:2*cw+Math.max(10,(cw-10*sx)/2)+(i%10)*sx,y:top+row*sx};
}
// Doble toque: una centena → 10 decenas; una decena → 10 unidades; dinero → cambio en piezas menores
function breakPiece(el){
  const k=el.dataset.k;
  if(CHANGE[k]){
    const x=el.offsetLeft,y=el.offsetTop;el.remove();
    CHANGE[k].forEach((n,i)=>addPiece(n,x+i*(KINDS[n].w*.55+10),y+i*12));return;
  }
  if(k!=='h'&&k!=='t')return;
  const x=el.offsetLeft,y=el.offsetTop;el.remove();
  for(let i=0;i<10;i++){
    if(k==='h')addPiece('t',x+i*(U+4),y);
    else addPiece('u',x+(i%2)*(U+6),y+Math.floor(i/2)*(U+6));
  }
}
function regroup(){
  let changed=false;
  for(const [small,big] of [['u','t'],['t','h']]){
    const list=pieces(small);
    while(list.length>=10){
      const g=list.splice(0,10),x=g[0].offsetLeft,y=g[0].offsetTop;
      g.forEach(p=>p.remove());addPiece(big,x,y);changed=true;
    }
  }
  if(!changed)toast('Hacen falta 10 piezas iguales para agrupar');
  updateB10();
}
function arrange(){
  ['h','t','u'].forEach(k=>pieces(k).forEach((p,i)=>{const q=b10Slot(k,i);p.classList.add('anim');p.style.left=q.x+'px';p.style.top=q.y+'px';manip.append(p)}));
  setTimeout(()=>pieces().forEach(p=>p.classList.remove('anim')),400);
}
function makeNumber(v){
  const n=clamp(Math.floor(Number(v))||0,0,999);
  pieces().forEach(p=>p.remove());
  const counts={h:Math.floor(n/100),t:Math.floor(n/10)%10,u:n%10};
  for(const k in counts)for(let i=0;i<counts[k];i++)addPiece(k,0,0);
  arrange();updateB10();
}
function updateB10(){
  if(!b10ui)return;
  const c=pieces('h').length,d=pieces('t').length,u=pieces('u').length;
  b10ui.c.textContent=c;b10ui.d.textContent=d;b10ui.u.textContent=u;
  b10ui.tot.textContent=b10ui.show?String(c*100+d*10+u):'?';
}
function b10Clear(){pieces().forEach(p=>p.remove());mat.classList.remove('on');updateB10()}
function mB10(body){
  const cell=(lbl,col)=>{const b=h('b',{style:`color:${col}`},'0');return [h('div',{},b,h('span',{},lbl)),b]};
  const [cc,c]=cell('Centenas','#2f9e44'),[dd,d]=cell('Decenas','#e03131'),[uu,u]=cell('Unidades','#1e6fe0');
  const tot=h('b',{},'0');
  b10ui={c,d,u,tot,show:true};
  const addBtn=(k,lbl,col,iw,ih)=>h('button',{class:'addp',style:`background:${col}`,onclick:()=>addNew(k)},h('i',{style:`width:${iw}px;height:${ih}px`}),lbl);
  const vis=h('button',{class:'btn ghost tog on',onclick:()=>{b10ui.show=!b10ui.show;vis.classList.toggle('on',b10ui.show);updateB10()}},...ib('eye','Total'));
  const matB=h('button',{class:'btn ghost tog'+(mat.classList.contains('on')?' on':''),onclick:()=>matB.classList.toggle('on',mat.classList.toggle('on'))},...ib('view','Tablero'));
  const num=h('input',{type:'number',min:'0',max:'999',class:'numin',placeholder:'345',inputmode:'numeric'});
  body.append(
    h('div',{class:'row c'},addBtn('h','Centena','#2f9e44',26,26),addBtn('t','Decena','#e03131',8,30),addBtn('u','Unidad','#1e6fe0',12,12)),
    h('div',{class:'pv'},cc,dd,uu,h('div',{class:'tot'},tot,h('span',{},'Total'))),
    h('div',{class:'row c'},vis,matB,
      h('button',{class:'btn ghost',onclick:regroup},...ib('magnet','Agrupar')),
      h('button',{class:'btn ghost',onclick:arrange},...ib('sort','Ordenar')),
      h('button',{class:'btn ghost',onclick:()=>{pieces().forEach(p=>p.remove());updateB10()}},...ib('trash','Vaciar'))),
    h('div',{class:'row c',style:'margin-top:12px'},num,h('button',{class:'btn',onclick:()=>makeNumber(num.value)},'Representar número')),
    h('p',{class:'muted',style:'font-size:16px;margin:12px 0 0'},'Arrastra las piezas por la pizarra · Toca dos veces una pieza para desagruparla · Llévala a la papelera para quitarla'));
  updateB10();
  return()=>{b10ui=null};
}

