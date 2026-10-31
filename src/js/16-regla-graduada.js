/* ============ Regla graduada ============ */
const RUL=Object.assign({len:20,ppc:40,snap:true},S.ruler||{});
const RPAD=18,RH=112;
let ruler=null;
function applyRuler(){const r=ruler;r.el.style.left=r.x+'px';r.el.style.top=r.y+'px';r.el.style.transform=`rotate(${r.a}deg)`}
function renderRuler(){
  if(!ruler)return;
  const {len,ppc}=RUL,W=len*ppc+RPAD*2;let t='';
  for(let i=0;i<=len*10;i++){
    const x=(RPAD+i*ppc/10).toFixed(1),cm=i%10===0,half=i%5===0;
    if(!cm&&!half&&ppc<24)continue; // con centímetros muy pequeños se omiten los milímetros
    t+=`<line x1="${x}" y1="0" x2="${x}" y2="${cm?32:half?22:13}" stroke="#2b2108" stroke-width="${cm?2.2:1.2}"/>`;
    if(cm)t+=`<text x="${x}" y="50" text-anchor="middle" font-size="${ppc<30?14:20}" font-weight="800" fill="#2b2108">${i/10}</text>`;
  }
  ruler.body.innerHTML=`<svg width="${W}" height="${RH}" viewBox="0 0 ${W} ${RH}"><rect x="1" y="1" width="${W-2}" height="${RH-2}" rx="8" fill="rgba(255,222,100,.86)" stroke="#b8932a" stroke-width="2"/>${t}<text x="${RPAD}" y="${RH-16}" font-size="18" font-weight="800" fill="#2b2108">cm</text></svg>`;
  ruler.rot.style.left=(W+4)+'px';ruler.W=W;applyRuler();
}
function toggleRuler(){
  if(ruler){ruler.el.remove();ruler=null;closeWin('ruler-set');refreshRail();return}
  const el=h('div',{class:'ruler'}),body=h('div'),rot=h('div',{class:'rrot','aria-label':'Girar la regla'},ico('rotate')),ang=h('div',{class:'rang'});
  const btns=h('div',{class:'rbtns'},
    h('button',{'aria-label':'Ajustes de la regla',onclick:()=>openWin('ruler-set','Regla',mRuler,460)},ico('settings')),
    h('button',{'aria-label':'Quitar la regla',onclick:toggleRuler},ico('x')));
  el.append(body,rot,btns,ang);el.style.transformOrigin=`${RPAD}px 0px`; // gira alrededor del 0
  ruler={el,body,rot,ang,x:0,y:0,a:0,W:0};manip.append(el);renderRuler();
  ruler.x=Math.max(10,(stage.clientWidth-ruler.W)/2);ruler.y=stage.clientHeight*.5;applyRuler();
  // mover (doble toque: volver a horizontal)
  let d=null,lastTap=0;
  el.addEventListener('pointerdown',e=>{
    if(e.target.closest('.rrot,button'))return;
    if(manip.lastElementChild!==el)manip.append(el);el.setPointerCapture(e.pointerId);
    d={dx:e.clientX-ruler.x,dy:e.clientY-ruler.y};
    const now=Date.now();if(now-lastTap<350){ruler.a=0;applyRuler()}lastTap=now;
  });
  el.addEventListener('pointermove',e=>{if(!d)return;ruler.x=e.clientX-d.dx;ruler.y=e.clientY-d.dy;applyRuler()});
  const end=()=>d=null;el.addEventListener('pointerup',end);el.addEventListener('pointercancel',end);
  // girar con el asa azul
  let rd=null;
  rot.addEventListener('pointerdown',e=>{
    e.stopPropagation();rot.setPointerCapture(e.pointerId);
    const sr=stage.getBoundingClientRect();
    rd={ox:sr.left+ruler.x+RPAD,oy:sr.top+ruler.y,al:Math.atan2(55,ruler.W-RPAD+32)};
  });
  rot.addEventListener('pointermove',e=>{
    if(!rd)return;
    const st=RUL.snap?15:1;
    ruler.a=Math.round((Math.atan2(e.clientY-rd.oy,e.clientX-rd.ox)-rd.al)*180/Math.PI/st)*st;applyRuler();
    ang.textContent=(((ruler.a%360)+360)%360)+'°';ang.style.display='block';
  });
  const rend=()=>{rd=null;ang.style.display='none'};rot.addEventListener('pointerup',rend);rot.addEventListener('pointercancel',rend);
  refreshRail();
}
function mRuler(body){
  const lab=h('div',{class:'muted'});
  function saveRul(){S.ruler={...RUL};save();lab.textContent=`1 cm = ${RUL.ppc} px`;renderRuler()}
  const lenSeg=h('div',{class:'seg'},...[10,15,20,30].map(v=>h('button',{class:v===RUL.len?'on':'',onclick:e=>{RUL.len=v;$$('button',lenSeg).forEach(b=>b.classList.toggle('on',b===e.currentTarget));saveRul()}},v+' cm')));
  const sl=h('input',{type:'range',min:'20',max:'80',value:String(RUL.ppc),oninput:e=>{RUL.ppc=Number(e.target.value);saveRul()}});
  const snapB=h('button',{class:'btn ghost tog'+(RUL.snap?' on':''),onclick:()=>{RUL.snap=!RUL.snap;snapB.classList.toggle('on',RUL.snap);saveRul()}},'Girar de 15° en 15°');
  // además de girar, recoloca la regla en el centro por si había quedado fuera de la pantalla
  const setA=a=>()=>{if(!ruler)return;ruler.a=a;
    if(a===0){ruler.x=Math.max(10,(stage.clientWidth-ruler.W)/2);ruler.y=stage.clientHeight*.5}
    else{ruler.x=stage.clientWidth/2;ruler.y=10}
    applyRuler()};
  body.append(h('div',{class:'lbl'},'Longitud'),lenSeg,
    h('div',{class:'lbl',style:'margin-top:16px'},'Tamaño del centímetro'),sl,lab,
    h('p',{class:'muted',style:'font-size:15px'},'Para que mida de verdad, apoya una regla real sobre la pantalla y mueve el deslizador hasta que coincidan.'),
    h('div',{class:'row c'},snapB,h('button',{class:'btn ghost',onclick:setA(0)},...ib('arrows-h','Horizontal')),h('button',{class:'btn ghost',onclick:setA(90)},...ib('arrows-v','Vertical'))));
  lab.textContent=`1 cm = ${RUL.ppc} px`;
}

