/* ============ Transportador ============ */
const PR={R:200,cx:260,cy:260,W:520,H:360};
let prot=null;
function protSvg(){
  const {R,cx,cy,W,H}=PR,P=(r,a)=>[cx+r*Math.cos(a*Math.PI/180),cy-r*Math.sin(a*Math.PI/180)];
  let t='';
  for(let a=0;a<=180;a++){
    const big=a%10===0,len=big?24:a%5===0?17:9,[x1,y1]=P(R,a),[x2,y2]=P(R-len,a);
    t+=`<line x1="${x1.toFixed(1)}" y1="${y1.toFixed(1)}" x2="${x2.toFixed(1)}" y2="${y2.toFixed(1)}" stroke="var(--ink)" stroke-width="${big?2.2:1.1}"/>`;
    if(big){ // doble escala: exterior 0→180 de derecha a izquierda, interior al revés
      const [ox,oy]=P(R-42,a),[ix,iy]=P(R-72,a);
      t+=`<text x="${ox.toFixed(1)}" y="${oy.toFixed(1)}" transform="rotate(${a>90?180-a:-a} ${ox.toFixed(1)} ${oy.toFixed(1)})" text-anchor="middle" dominant-baseline="central" font-size="18" font-weight="800" fill="var(--ink)">${a}</text>`;
      t+=`<text x="${ix.toFixed(1)}" y="${iy.toFixed(1)}" transform="rotate(${a>90?180-a:-a} ${ix.toFixed(1)} ${iy.toFixed(1)})" text-anchor="middle" dominant-baseline="central" font-size="18" font-weight="800" fill="var(--accent)">${180-a}</text>`;
    }
  }
  return `<svg width="${W}" height="${H}" viewBox="0 0 ${W} ${H}">
    <path class="pbody" d="M${cx-R-14} ${cy+48}V${cy}H${cx-R}A${R} ${R} 0 0 1 ${cx+R} ${cy}H${cx+R+14}V${cy+48}Z" fill="rgba(110,170,255,.2)" stroke="var(--ink)" stroke-width="2.5" stroke-linejoin="round"/>
    <path d="M${cx-R+96} ${cy}A${R-96} ${R-96} 0 0 1 ${cx+R-96} ${cy}" fill="none" stroke="var(--ink)" stroke-opacity=".35" stroke-width="1.5"/>
    ${t}<line x1="${cx-R-14}" y1="${cy}" x2="${cx+R+14}" y2="${cy}" stroke="var(--ink)" stroke-width="2"/>
    <path d="M${cx-16} ${cy}H${cx+16}M${cx} ${cy-16}V${cy}" stroke="var(--ink)" stroke-width="2"/>
    <text class="plab" x="${cx}" y="${cy+36}" text-anchor="middle" font-size="34" font-weight="800" fill="var(--ink)"></text>
    <g class="pray"><line class="pl" x1="${cx}" y1="${cy}" stroke="#e03131" stroke-width="4" stroke-linecap="round"/>
    <circle class="ph" r="26" fill="#e03131" stroke="#fff" stroke-width="3"/></g></svg>`;
}
function protRay(a){
  const {R,cx,cy}=PR,x=cx+(R+34)*Math.cos(a*Math.PI/180),y=cy-(R+34)*Math.sin(a*Math.PI/180);
  prot.ang=a;
  const l=$('.pl',prot.el),c=$('.ph',prot.el);
  l.setAttribute('x2',x);l.setAttribute('y2',y);c.setAttribute('cx',x);c.setAttribute('cy',y);
  $('.plab',prot.el).textContent=a+'°';
}
function protPlace(){const p=prot;p.el.style.left=p.x+'px';p.el.style.top=p.y+'px';p.el.style.transform=`rotate(${p.a}deg)`}
function toggleProt(){
  if(prot){prot.el.remove();prot=null;refreshRail();return}
  const {R,cx,cy,W,H}=PR;
  const rot=h('div',{class:'prot-h','aria-label':'Girar el transportador',style:`left:${cx+R-38}px;top:${cy+38}px`},ico('rotate'));
  const x=h('button',{class:'prot-h prot-x','aria-label':'Quitar el transportador',style:`left:${cx-R+16}px;top:${cy+42}px`,onclick:toggleProt},ico('x'));
  const el=h('div',{class:'prot',html:protSvg(),style:`width:${W}px;height:${H}px;transform-origin:${cx}px ${cy}px`});
  el.append(rot,x);manip.append(el);
  prot={el,x:Math.max(0,(stage.clientWidth-W)/2),y:Math.max(0,stage.clientHeight-H-10),a:0,ang:45};
  protPlace();protRay(45);
  const sr=()=>stage.getBoundingClientRect(),front=()=>{if(manip.lastChild!==el)manip.append(el)}; // reinsertar suelta la captura, solo si hace falta
  // mover por el cuerpo
  let d=null;
  $('.pbody',el).addEventListener('pointerdown',e=>{front();el.setPointerCapture(e.pointerId);d={dx:e.clientX-prot.x,dy:e.clientY-prot.y}});
  el.addEventListener('pointermove',e=>{if(!d)return;prot.x=e.clientX-d.dx;prot.y=e.clientY-d.dy;protPlace()});
  const end=()=>d=null;el.addEventListener('pointerup',end);el.addEventListener('pointercancel',end);
  // brazo medidor: ángulo en el sistema local (descontando el giro)
  const ph=$('.ph',el);let rd=false;
  ph.addEventListener('pointerdown',e=>{e.stopPropagation();front();ph.setPointerCapture(e.pointerId);rd=true});
  ph.addEventListener('pointermove',e=>{
    if(!rd)return;const r=sr();
    const dx=e.clientX-(r.left+prot.x+cx),dy=e.clientY-(r.top+prot.y+cy);
    let v=Math.atan2(-dy,dx)*180/Math.PI+prot.a;v=((v+180)%360+360)%360-180;
    protRay(v<0?(v<-90?180:0):Math.round(clamp(v,0,180)));
  });
  const rend=()=>rd=false;ph.addEventListener('pointerup',rend);ph.addEventListener('pointercancel',rend);
  // giro libre con el asa
  let g=false;const a0=Math.atan2(cy+38+28-cy,cx+R-38+28-cx);
  rot.addEventListener('pointerdown',e=>{e.stopPropagation();rot.setPointerCapture(e.pointerId);g=true});
  rot.addEventListener('pointermove',e=>{
    if(!g)return;const r=sr();
    prot.a=Math.round((Math.atan2(e.clientY-(r.top+prot.y+cy),e.clientX-(r.left+prot.x+cx))-a0)*180/Math.PI);protPlace();
  });
  const gend=()=>g=false;rot.addEventListener('pointerup',gend);rot.addEventListener('pointercancel',gend);
  x.addEventListener('pointerdown',e=>e.stopPropagation());
  refreshRail();
}

