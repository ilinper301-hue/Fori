/* ============ Selector de color: ruleta de color ============ */
// Rueda de tonos (ángulo = tono, distancia al centro = intensidad) con control de luminosidad,
// colores rápidos y recientes. El color se aplica en directo mientras se arrastra.
const QUICK_COLORS=['ink','#ffffff','#868e96','#e03131','#f76707','#fcc419','#2f9e44','#0ca678','#1e6fe0','#7048e8','#e64980','#8d5524'];
const hsv2rgb=(hu,s,v)=>{const f=n=>{const k=(n+hu/60)%6;return v-v*s*Math.max(0,Math.min(k,4-k,1))};return[f(5),f(3),f(1)].map(x=>Math.round(x*255))};
const rgb2hex=c=>'#'+c.map(x=>x.toString(16).padStart(2,'0')).join('');
function hex2hsv(hex){
  const n=parseInt(hex.slice(1),16),r=(n>>16&255)/255,g=(n>>8&255)/255,b=(n&255)/255,mx=Math.max(r,g,b),d=mx-Math.min(r,g,b);
  let hu=0;if(d){hu=mx===r?((g-b)/d)%6:mx===g?(b-r)/d+2:(r-g)/d+4;hu=(hu*60+360)%360}
  return{h:hu,s:mx?d/mx:0,v:mx};
}
function colorPicker(){
  const D=220,R=D/2,Q=2; // tamaño en pantalla y factor de resolución
  const cur=/^#[0-9a-f]{6}$/i.test(T.color)?hex2hsv(T.color):{h:200,s:.8,v:.9};
  let hu=cur.h,sa=cur.s,va=Math.max(.15,cur.v);
  const cv=h('canvas',{class:'cp-wheel',width:String(D*Q),height:String(D*Q)});
  const knob=h('div',{class:'cp-knob'}),wheel=h('div',{class:'cp-wrap'},cv,knob);
  const prev=h('div',{class:'cp-prev'}),hexT=h('span',{class:'cp-hex'});
  const vr=h('input',{type:'range',min:'15',max:'100',class:'cp-v','aria-label':'Luminosidad'});vr.value=String(Math.round(va*100));
  function paintWheel(){
    const x=cv.getContext('2d'),N=D*Q,img=x.createImageData(N,N),dt=img.data,RR=N/2;
    for(let j=0;j<N;j++)for(let i=0;i<N;i++){
      const dx=i-RR+.5,dy=j-RR+.5,r=Math.hypot(dx,dy);if(r>RR)continue;
      const [cr,cg,cb]=hsv2rgb((Math.atan2(dy,dx)*180/Math.PI+450)%360,r/RR,va),k=(j*N+i)*4;
      dt[k]=cr;dt[k+1]=cg;dt[k+2]=cb;dt[k+3]=r>RR-1.5?Math.round((RR-r)/1.5*255):255; // borde suave
    }
    x.putImageData(img,0,0);
  }
  function update(commit){
    const hex=rgb2hex(hsv2rgb(hu,sa,va)),a=(hu-90)*Math.PI/180;
    knob.style.left=(R+Math.cos(a)*sa*R)+'px';knob.style.top=(R+Math.sin(a)*sa*R)+'px';knob.style.background=hex;
    prev.style.background=hex;hexT.textContent=hex.toUpperCase();
    vr.style.setProperty('--full',rgb2hex(hsv2rgb(hu,sa,1)));
    setColor(hex,commit);
    box.querySelectorAll('.cp-sw').forEach(b=>b.classList.toggle('on',b.title===hex));
  }
  let drag=false;
  const pick=e=>{const r=cv.getBoundingClientRect(),dx=(e.clientX-r.left)/r.width*D-R,dy=(e.clientY-r.top)/r.height*D-R;
    hu=(Math.atan2(dy,dx)*180/Math.PI+450)%360;sa=Math.min(1,Math.hypot(dx,dy)/R);update(false)};
  wheel.addEventListener('pointerdown',e=>{drag=true;wheel.setPointerCapture(e.pointerId);pick(e)});
  wheel.addEventListener('pointermove',e=>{if(drag)pick(e)});
  const end=()=>{if(drag){drag=false;update(true);renderRecentRow()}};
  wheel.addEventListener('pointerup',end);wheel.addEventListener('pointercancel',end);
  vr.addEventListener('input',()=>{va=vr.value/100;paintWheel();update(false)});
  vr.addEventListener('change',()=>{update(true);renderRecentRow()});
  const sw=(c,cls)=>h('button',{class:cls+(c===T.color?' on':''),title:c==='ink'?'Tinta (se adapta al tema)':c,'aria-label':'Color',style:`background:${cssColor(c)}`,onclick:()=>{setColor(c,true);closePop()}});
  const recentRow=h('div',{class:'cp-row'});
  const renderRecentRow=()=>recentRow.replaceChildren(...S.recent.map(c=>sw(c,'cp-sw')));
  renderRecentRow();
  const box=h('div',{class:'cp'},
    h('div',{class:'cp-left'},wheel,h('div',{class:'cp-vrow'},ico('sun'),vr)),
    h('div',{class:'cp-right'},
      h('div',{class:'cp-cur'},prev,h('div',{},h('div',{class:'cp-lbl'},'Color actual'),hexT)),
      h('div',{class:'cp-lbl'},'Colores rápidos'),h('div',{class:'cp-grid'},...QUICK_COLORS.map(c=>sw(c,'cp-sw'))),
      h('div',{class:'cp-lbl'},'Recientes'),recentRow));
  requestAnimationFrame(()=>{paintWheel();
    const a=(hu-90)*Math.PI/180;knob.style.left=(R+Math.cos(a)*sa*R)+'px';knob.style.top=(R+Math.sin(a)*sa*R)+'px';
    const hex=T.color==='ink'?getComputedStyle(document.documentElement).getPropertyValue('--ink').trim():rgb2hex(hsv2rgb(hu,sa,va));
    knob.style.background=prev.style.background=T.color==='ink'?'var(--ink)':hex;hexT.textContent=T.color==='ink'?'Tinta':hex.toUpperCase();
    vr.style.setProperty('--full',rgb2hex(hsv2rgb(hu,sa,1)));
  });
  return box;
}

