/* ============ Pizarra ============ */
const stage=$('#stage'),bg=$('#bg'),dr=$('#draw'),lv=$('#live');
const cb=bg.getContext('2d'),cd=dr.getContext('2d'),cl=lv.getContext('2d');
const T={tool:'pen',color:'ink',size:6,shape:'line',fill:false};
const FONT="'Fredoka',system-ui,-apple-system,'Segoe UI',Roboto,Arial,sans-serif"; // letra de la herramienta Texto
const FS={3:32,6:48,12:72}; // tamaño de letra según el grosor elegido
const active=new Map();
let fistNow=null; // gesto de borrar con el puño en curso (05e-borrar-puno.js): {ids:Set, s:trazo borrador, last:{x,y}}
const inkColor=()=>document.documentElement.dataset.theme==='dark'?'#ffffff':'#111111';

/* --- Páginas y guardado automático (IndexedDB) --- */
const newPage=bgType=>({strokes:[],bg:bgType||'plain',img:null,undo:[],redo:[]});
let pages=[newPage()],cur=0,sel=null;
const P=()=>pages[cur];
/* --- Lienzo lógico de cada página ---
   Cada página tiene un tamaño fijo (p.size), que se decide mientras está vacía y ya no cambia.
   En memoria los trazos están en píxeles de la pantalla, según la «vista» p.v = {k,ox,oy}:
   pantalla = lógico·k + (ox,oy). La página se ve entera, centrada y sin deformar.
   Al cambiar el tamaño de la pizarra se pasa de una vista a otra con una cuenta exacta e invertible
   (ver fitPage), así que nada se encoge ni se desplaza por mucho que se cambie de modo de pantalla. */
const viewId=()=>({k:1,ox:0,oy:0});
const viewOk=v=>!!v&&[v.k,v.ox,v.oy].every(n=>typeof n==='number'&&isFinite(n))&&v.k>0;
function viewFor(size){
  const W=stage.clientWidth,H=stage.clientHeight,k=Math.min(W/size.w,H/size.h);
  return{k,ox:(W-k*size.w)/2,oy:(H-k*size.h)/2};
}
// Página sin vista (para lecciones y archivos .fori): trazos en coordenadas lógicas, redondeadas a centésimas
const r2=n=>Math.round(n*100)/100;
function strokeOut(s,v){
  const k=1/v.k,f=q=>({x:r2((q.x-v.ox)*k),y:r2((q.y-v.oy)*k)}),o={...s};
  if(s.type==='img'){Object.assign(o,f(s));o.w=r2(s.w*k);o.h=r2(s.h*k)}
  else if(s.type==='text'){Object.assign(o,f(s));o.fs=r2(s.fs*k)}
  else{o.size=r2(s.size*k);if(s.type==='shape'){o.a=f(s.a);o.b=f(s.b)}else o.pts=s.pts.map(f)}
  return o;
}
const pagePlain=p=>({strokes:p.strokes.map(s=>strokeOut(s,p.v||viewId())),bg:p.bg,img:p.img||null,size:p.size||null,ch:p.ch||null});
const DB={db:null,
  open(){return new Promise(r=>{try{const q=indexedDB.open('fori',1);q.onupgradeneeded=()=>q.result.createObjectStore('kv');q.onsuccess=()=>{this.db=q.result;r()};q.onerror=()=>r()}catch{r()}})},
  get(k){return new Promise(r=>{if(!this.db)return r(null);try{const q=this.db.transaction('kv').objectStore('kv').get(k);q.onsuccess=()=>r(q.result===undefined?null:q.result);q.onerror=()=>r(null)}catch{r(null)}})},
  set(k,v){return new Promise(r=>{if(!this.db)return r(false);try{const t=this.db.transaction('kv','readwrite');t.objectStore('kv').put(v,k);t.oncomplete=()=>r(true);t.onerror=()=>r(false)}catch{r(false)}})}
};
// El guardado de la pizarra (persist, loadBoard) está en 05a-guardado.js

/* --- Fondos y pautas --- */
function fit(){
  if(pages[cur])fitPage(P());
  const dpr=window.devicePixelRatio||1,w=stage.clientWidth,hh=stage.clientHeight;
  for(const [c,x] of [[bg,cb],[dr,cd],[lv,cl]]){c.width=Math.round(w*dpr);c.height=Math.round(hh*dpr);x.setTransform(dpr,0,0,dpr,0,0)}
  drawBg();redraw();
}
// Pinta la pauta en el rectángulo (x0,y0)-(x1,y1). Las líneas salen siempre de múltiplos del periodo,
// así que la pauta queda anclada al origen de la página y no al borde de la pantalla.
function paintBg(ctx,x0,y0,x1,y1,type,dark){
  const k=S.pautaSize||1,lw=k>=1.8?1.7:1; // en «Extra grande» las líneas también son más gruesas, para verlas desde el fondo
  const soft=dark?'rgba(255,255,255,.22)':'rgba(30,80,160,.28)';
  const strong=dark?'rgba(255,255,255,.5)':'rgba(30,80,160,.6)';
  const red=dark?'rgba(255,120,120,.6)':'rgba(214,40,40,.55)';
  const from=(a,per,off=0)=>Math.floor((a-off)/per)*per+off;
  const line=(y,c,wd,dash)=>{ctx.beginPath();ctx.setLineDash(dash||[]);ctx.lineDashOffset=dash?x0:0;ctx.strokeStyle=c;ctx.lineWidth=(wd||1.5)*lw;ctx.moveTo(x0,y);ctx.lineTo(x1,y);ctx.stroke()};
  const vline=x=>{ctx.beginPath();ctx.moveTo(x,y0);ctx.lineTo(x,y1);ctx.stroke()};
  ctx.save();ctx.lineWidth=1.5*lw;ctx.strokeStyle=soft;ctx.fillStyle=soft;
  if(type==='grid'){
    const c=40*k;
    for(let x=from(x0,c);x<x1;x+=c)vline(x);
    for(let y=from(y0,c);y<y1;y+=c)line(y,soft);
  }else if(type==='dots'){
    const c=40*k;
    for(let x=from(x0,c,c/2);x<x1;x+=c)for(let y=from(y0,c,c/2);y<y1;y+=c){ctx.beginPath();ctx.arc(x,y,2.4*lw,0,7);ctx.fill()}
  }else if(type==='lines'){ // pauta de doble línea con línea intermedia discontinua
    for(let y=from(y0,130*k);y<y1;y+=130*k){line(y+18*k,soft);line(y+38*k,strong);line(y+63*k,soft,1.5,[8,8]);line(y+88*k,strong);line(y+108*k,soft)}
  }else if(type==='montessori'){ // 4 líneas: ascendentes · cuerpo (sombreado) · descendentes
    const s=32*k;
    for(let y=from(y0,s*5);y<y1;y+=s*5){
      ctx.fillStyle=dark?'rgba(255,120,120,.10)':'rgba(214,40,40,.07)';ctx.fillRect(x0,y+s*1.5,x1-x0,s);
      line(y+s*.5,strong);line(y+s*1.5,red,2);line(y+s*2.5,red,2);line(y+s*3.5,strong);
    }
  }else if(type==='cuadrovia'){ // cuadrícula en grupos de 3 filas con la fila central (cuerpo) marcada
    const c=22*k;
    for(let x=from(x0,c);x<x1;x+=c)vline(x);
    for(let y=from(y0,c);y<y1;y+=c)line(y,soft,1);
    for(let y=from(y0,c*3);y<y1;y+=c*3){
      ctx.fillStyle=dark?'rgba(120,180,255,.10)':'rgba(30,111,224,.07)';ctx.fillRect(x0,y+c,x1-x0,c);
      line(y+c,strong,2.2);line(y+2*c,strong,2.2);
    }
  }
  ctx.restore();
}
// La pauta se pinta con la vista de la página: cubre toda la pizarra y acompaña a lo escrito al cambiar de tamaño
function paintBgView(ctx,w,hh,v,type,dark){
  ctx.save();ctx.translate(v.ox,v.oy);ctx.scale(v.k,v.k);
  paintBg(ctx,-v.ox/v.k,-v.oy/v.k,(w-v.ox)/v.k,(hh-v.oy)/v.k,type,dark);
  ctx.restore();
}
function drawBg(){
  const w=stage.clientWidth,hh=stage.clientHeight,p=P(),v=p.v||viewId();
  cb.clearRect(0,0,w,hh);
  paintBgView(cb,w,hh,v,p.bg,document.documentElement.dataset.theme==='dark');
  p.strokes.forEach(s=>{if(s.type==='img')drawImgObj(cb,s)}); // imágenes insertadas: debajo de la tinta
  drawZoneLines(cb,w,hh);
  // la imagen de fondo (ficha, PDF) ocupa el rectángulo de la página, igual que la tinta que lleva encima
  const im=$('#bgimg'),L=p.size||{w,h:hh};
  im.style.left=v.ox+'px';im.style.top=v.oy+'px';im.style.width=L.w*v.k+'px';im.style.height=L.h*v.k+'px';
  im.style.backgroundImage=p.img?`url(${p.img})`:'';
}

/* --- Dibujo de trazos, formas y textos --- */
function setStyle(ctx,s){
  ctx.lineCap=ctx.lineJoin='round';ctx.lineWidth=s.size;
  ctx.globalAlpha=s.tool==='marker'?.35:1;
  if(s.tool==='eraser'){ctx.globalCompositeOperation='destination-out';ctx.strokeStyle=ctx.fillStyle='#000'}
  else{ctx.globalCompositeOperation='source-over';ctx.strokeStyle=ctx.fillStyle=s.color==='ink'?inkColor():s.color}
}
function seg(ctx,s,p0,p1){
  ctx.save();setStyle(ctx,s);ctx.beginPath();
  if(p0===p1||(p0.x===p1.x&&p0.y===p1.y)){ctx.arc(p0.x,p0.y,s.size/2,0,7);ctx.fill()}
  else{ctx.moveTo(p0.x,p0.y);ctx.lineTo(p1.x,p1.y);ctx.stroke()}
  ctx.restore();
}
function polygon(ctx,n,cx,cy,rx,ry){
  ctx.beginPath();
  for(let i=0;i<n;i++){const a=-Math.PI/2+i*2*Math.PI/n;const x=cx+rx*Math.cos(a),y=cy+ry*Math.sin(a);i?ctx.lineTo(x,y):ctx.moveTo(x,y)}
  ctx.closePath();
}
function shapeEnd(s){ // cuadrado, círculo y polígonos regulares se mantienen proporcionados
  const a=s.a,b=s.b;
  if(!['square','circle','pentagon','hexagon'].includes(s.shape))return b;
  const dx=b.x-a.x,dy=b.y-a.y,m=Math.max(Math.abs(dx),Math.abs(dy));
  return{x:a.x+(dx<0?-m:m),y:a.y+(dy<0?-m:m)};
}
function drawShape(ctx,s){
  const a=s.a,b=shapeEnd(s);
  const x=Math.min(a.x,b.x),y=Math.min(a.y,b.y),w=Math.abs(b.x-a.x),hh=Math.abs(b.y-a.y),cx=x+w/2,cy=y+hh/2;
  ctx.save();setStyle(ctx,s);ctx.beginPath();
  switch(s.shape){
    case 'line':ctx.moveTo(a.x,a.y);ctx.lineTo(s.b.x,s.b.y);break;
    case 'rect':case 'square':ctx.rect(x,y,w,hh);break;
    case 'circle':case 'ellipse':ctx.ellipse(cx,cy,w/2,hh/2,0,0,7);break;
    case 'triangle':ctx.moveTo(cx,y);ctx.lineTo(x+w,y+hh);ctx.lineTo(x,y+hh);ctx.closePath();break;
    case 'pentagon':polygon(ctx,5,cx,cy,w/2,hh/2);break;
    case 'hexagon':polygon(ctx,6,cx,cy,w/2,hh/2);break;
  }
  if(s.fill&&s.shape!=='line'){ctx.save();ctx.globalAlpha=.3;ctx.fill();ctx.restore()}
  ctx.stroke();ctx.restore();
}
function drawText(ctx,s){
  ctx.save();ctx.globalAlpha=1;ctx.globalCompositeOperation='source-over';
  ctx.fillStyle=s.color==='ink'?inkColor():s.color;ctx.font=`600 ${s.fs}px ${FONT}`;ctx.textBaseline='top';
  s.text.split('\n').forEach((l,i)=>ctx.fillText(l,s.x,s.y+s.fs*.1+i*s.fs*1.2));
  ctx.restore();
}
function drawStroke(ctx,s){
  if(s.type==='img')return; // las imágenes se pintan en la capa de fondo
  if(s.type==='text')return drawText(ctx,s);
  if(s.type==='shape')return drawShape(ctx,s);
  if(s.pts.length===1)return seg(ctx,s,s.pts[0],s.pts[0]);
  ctx.save();setStyle(ctx,s);ctx.beginPath();
  s.pts.forEach((p,i)=>i?ctx.lineTo(p.x,p.y):ctx.moveTo(p.x,p.y));
  ctx.stroke();ctx.restore();
}
function redraw(){
  drawBg();cd.clearRect(0,0,stage.clientWidth,stage.clientHeight);P().strokes.forEach(s=>drawStroke(cd,s));
  // lo que se está dibujando en este momento (varios alumnos a la vez): no debe desaparecer al repintar
  for(const s of active.values())if(s.type==='free'&&!previewed(s))drawStroke(cd,s);
  if(fistNow)drawStroke(cd,fistNow.s);
}
const pt=e=>{const r=dr.getBoundingClientRect();return{x:e.clientX-r.left,y:e.clientY-r.top}};

/* --- Selección: caja envolvente y detección de toque --- */
function bbox(s){
  if(s.type==='img')return{x:s.x,y:s.y,w:s.w,h:s.h};
  if(s.type==='text'){
    cl.save();cl.font=`600 ${s.fs}px ${FONT}`;
    const w=Math.max(20,...s.text.split('\n').map(l=>cl.measureText(l).width));cl.restore();
    return{x:s.x,y:s.y,w,h:s.text.split('\n').length*s.fs*1.2};
  }
  const ps=s.type==='shape'?[s.a,shapeEnd(s)]:s.pts,m=s.size/2;
  const xs=ps.map(p=>p.x),ys=ps.map(p=>p.y),x=Math.min(...xs)-m,y=Math.min(...ys)-m;
  return{x,y,w:Math.max(...xs)+m-x,h:Math.max(...ys)+m-y};
}
const distSeg=(p,a,b)=>{const dx=b.x-a.x,dy=b.y-a.y,l=dx*dx+dy*dy,t=l?clamp(((p.x-a.x)*dx+(p.y-a.y)*dy)/l,0,1):0;return Math.hypot(p.x-a.x-t*dx,p.y-a.y-t*dy)};
function hitTest(p){
  const st=P().strokes;
  for(let i=st.length-1;i>=0;i--){
    const s=st[i];if(s.tool==='eraser')continue;
    const b=bbox(s),pad=14;
    if(p.x<b.x-pad||p.x>b.x+b.w+pad||p.y<b.y-pad||p.y>b.y+b.h+pad)continue;
    if(s.type==='free'){const tol=s.size/2+pad;if(s.pts.length===1?Math.hypot(p.x-s.pts[0].x,p.y-s.pts[0].y)<tol:s.pts.some((q,j)=>j&&distSeg(p,s.pts[j-1],q)<tol))return s;continue}
    if(s.type==='shape'&&s.shape==='line'){if(distSeg(p,s.a,s.b)<s.size/2+pad)return s;continue}
    return s;
  }
  return null;
}
function translate(s,dx,dy){
  if(s.type==='text'||s.type==='img'){s.x+=dx;s.y+=dy}
  else if(s.type==='shape'){s.a={x:s.a.x+dx,y:s.a.y+dy};s.b={x:s.b.x+dx,y:s.b.y+dy}}
  else s.pts.forEach(p=>{p.x+=dx;p.y+=dy});
}

/* --- Historial por página: deshacer / rehacer --- */
function applyOp(op,rev){
  const st=P().strokes;
  switch(op.t){
    case 'add':if(!rev){op.i!=null?st.splice(op.i,0,op.s):st.push(op.s)}else{const i=st.lastIndexOf(op.s);if(i>=0)st.splice(i,1)}break;
    case 'del':if(!rev)st.splice(st.indexOf(op.s),1);else st.splice(Math.min(op.i,st.length),0,op.s);break;
    case 'move':translate(op.s,rev?-op.dx:op.dx,rev?-op.dy:op.dy);break;
    case 'rep':{const i=st.indexOf(rev?op.b:op.a);if(i>=0)st[i]=rev?op.a:op.b;break}
    case 'clear':P().strokes=rev?op.backup:[];break;
    case 'size':Object.assign(op.s,rev?op.a:op.b);break;
    case 'multi':(rev?[...op.ops].reverse():op.ops).forEach(o=>applyOp(o,rev));break;
  }
}
function record(op){P().undo.push(op);if(P().undo.length>200)P().undo.shift();P().redo.length=0;changed()}
function doOp(op){applyOp(op,false);record(op)}
function changed(){redraw();drawLive();persist();updatePageUI()}
function undo(){commitEditor();const op=P().undo.pop();if(!op)return;applyOp(op,true);P().redo.push(op);setSel(null);changed()}
function redo(){commitEditor();const op=P().redo.pop();if(!op)return;applyOp(op,false);P().undo.push(op);setSel(null);changed()}
function clearBoard(){
  commitEditor();setSel(null);
  if(!P().strokes.length)return;
  const keep=P().strokes.filter(s=>s.type==='img');
  if(keep.length){doOp({t:'multi',ops:P().strokes.filter(s=>s.type!=='img').map(s=>({t:'del',s,i:0}))});toast('Página limpiada (las imágenes se conservan)',{label:ib('undo','Deshacer'),fn:undo});return}
  doOp({t:'clear',backup:P().strokes});
  toast('Página limpiada',{label:ib('undo','Deshacer'),fn:undo});
}

/* --- Vista previa (capa #live): formas, fluorescente y selección --- */
const previewed=s=>s.type==='shape'||s.tool==='marker';
function drawLive(){
  cl.clearRect(0,0,stage.clientWidth,stage.clientHeight);
  for(const s of active.values())if(s.type&&previewed(s))drawStroke(cl,s);
  const b=selBox();
  if(b){cl.save();cl.setLineDash([10,8]);cl.lineWidth=3;cl.strokeStyle='#27C1B0';cl.strokeRect(b.x-8,b.y-8,b.w+16,b.h+16);cl.restore()}
  for(const a of active.values())if(a.lasso&&a.lasso.length>1){ // la bolsa mientras se dibuja
    cl.save();cl.beginPath();a.lasso.forEach((q,i)=>i?cl.lineTo(q.x,q.y):cl.moveTo(q.x,q.y));cl.closePath();
    cl.fillStyle='rgba(39,193,176,.12)';cl.fill();cl.setLineDash([12,8]);cl.lineWidth=3;cl.strokeStyle='#27C1B0';cl.stroke();cl.restore();
  }
}
const selbar=h('div',{class:'selbar'});
stage.append(selbar);
/* --- Selección: un elemento (sel) o un grupo rodeado con la bolsa (grp: trazos + piezas) --- */
let grp=null;
function grpBox(){
  if(!grp)return null;
  const bs=[...grp.strokes.map(bbox),...grp.pieces.filter(p=>p.isConnected).map(p=>({x:p.offsetLeft,y:p.offsetTop,w:p.offsetWidth,h:p.offsetHeight}))];
  if(!bs.length)return null;
  const x=Math.min(...bs.map(b=>b.x)),y=Math.min(...bs.map(b=>b.y));
  return{x,y,w:Math.max(...bs.map(b=>b.x+b.w))-x,h:Math.max(...bs.map(b=>b.y+b.h))-y};
}
const selBox=()=>sel?bbox(sel):grpBox();
function setSel(s){sel=s;grp=null;drawLive();placeSelbar();placeHandle()}
function setGrp(g){grp=g&&(g.strokes.length||g.pieces.length)?g:null;sel=null;drawLive();placeSelbar();placeHandle()}
function deleteSelection(){
  if(sel){const s=sel;setSel(null);doOp({t:'del',s,i:P().strokes.indexOf(s)});return}
  if(!grp)return;
  const g=grp;setSel(null);
  g.pieces.forEach(p=>p.remove());updateCounts();
  if(g.strokes.length)doOp({t:'multi',ops:g.strokes.map(s=>({t:'del',s,i:P().strokes.indexOf(s)}))});
}
function placeSelbar(){
  const b=selBox();
  if(!b){selbar.style.display='none';return}
  const btns=[];
  if(sel)btns.push(h('button',{'aria-label':'Duplicar',onclick:()=>{const c=structuredClone(sel);translate(c,30,30);doOp({t:'add',s:c});setSel(c)}},ico('copy')));
  if(grp){
    const u=grp.pieces.filter(p=>p.dataset.k==='u').length,t=grp.pieces.filter(p=>p.dataset.k==='t').length;
    if(u>=10||t>=10)btns.push(h('button',{class:'wide',onclick:groupSelected},...ib('magnet',u>=10?'Agrupar en decenas':'Agrupar en centenas')));
  }
  btns.push(h('button',{'aria-label':'Borrar',onclick:deleteSelection},ico('trash')));
  selbar.replaceChildren(...btns);selbar.style.display='flex';
  selbar.style.left=clamp(b.x+b.w-selbar.offsetWidth+8,4,stage.clientWidth-selbar.offsetWidth-4)+'px';
  selbar.style.top=(b.y-72<4?b.y+b.h+16:b.y-72)+'px';
}
// ¿Está el punto dentro del polígono de la bolsa?
function inPoly(p,poly){let c=false;for(let i=0,j=poly.length-1;i<poly.length;j=i++){const a=poly[i],b=poly[j];if((a.y>p.y)!==(b.y>p.y)&&p.x<(b.x-a.x)*(p.y-a.y)/(b.y-a.y)+a.x)c=!c}return c}
function lassoSelect(poly){
  if(poly.length<3)return;
  const strokes=P().strokes.filter(s=>{
    if(s.tool==='eraser')return false;
    if(s.type==='free'){const n=s.pts.filter(q=>inPoly(q,poly)).length;return n>=s.pts.length*.6}
    const b=bbox(s);return inPoly({x:b.x+b.w/2,y:b.y+b.h/2},poly);
  });
  const pcs=$$('.piece',manip).filter(el=>inPoly({x:el.offsetLeft+el.offsetWidth/2,y:el.offsetTop+el.offsetHeight/2},poly));
  // Base 10: si se rodean exactamente 10 unidades (o 10 decenas) y nada más, se agrupan solas
  const ks=pcs.map(p=>p.dataset.k);
  if(!strokes.length&&pcs.length===10&&(ks.every(k=>k==='u')||ks.every(k=>k==='t'))){mergePieces(pcs,ks[0]==='u'?'t':'h');setSel(null);return}
  setGrp({strokes,pieces:pcs});
}
// Junta 10 piezas en el centro y las cambia por una pieza mayor (con animación)
function mergePieces(list,big){
  const cx=list.reduce((a,p)=>a+p.offsetLeft+p.offsetWidth/2,0)/list.length,cy=list.reduce((a,p)=>a+p.offsetTop+p.offsetHeight/2,0)/list.length;
  list.forEach(p=>{p.classList.add('anim');p.style.left=(cx-p.offsetWidth/2)+'px';p.style.top=(cy-p.offsetHeight/2)+'px'});
  setTimeout(()=>{
    list.forEach(p=>p.remove());const K=KINDS[big],q=b10Slot(big,pieces(big).length),el=addPiece(big,cx-K.w/2,cy-K.h/2);
    // la pieza nueva se va a su columna
    requestAnimationFrame(()=>{el.classList.add('anim');el.style.left=q.x+'px';el.style.top=q.y+'px';setTimeout(()=>el.classList.remove('anim'),400)});
    toast(big==='t'?'10 unidades = 1 decena':'10 decenas = 1 centena');
  },380);
}
function groupSelected(){
  if(!grp)return;
  const g=grp;setSel(null);
  for(const [small,big] of [['u','t'],['t','h']]){
    const list=g.pieces.filter(p=>p.dataset.k===small&&p.isConnected);
    for(let i=0;i+10<=list.length;i+=10)mergePieces(list.slice(i,i+10),big);
  }
}

/* --- Herramienta de texto --- */
let editor=null;
function sizeEditor(){
  if(!editor)return;const ta=editor.ta;
  cl.save();cl.font=`600 ${editor.fs}px ${FONT}`;
  const w=Math.max(...ta.value.split('\n').map(l=>cl.measureText(l).width));cl.restore();
  ta.style.width=Math.max(editor.fs*4,w+editor.fs)+'px';
  ta.style.height='auto';ta.style.height=ta.scrollHeight+'px';
}
function openEditor(x,y,orig){
  commitEditor();setSel(null);
  const fs=orig?orig.fs:FS[T.size],color=orig?orig.color:T.color;
  const ta=h('textarea',{class:'txted',spellcheck:'false',rows:'1'});
  ta.style.cssText=`left:${x-3}px;top:${y-3}px;font-size:${fs}px;color:${cssColor(color)}`;
  let idx=-1;
  if(orig){idx=P().strokes.indexOf(orig);P().strokes.splice(idx,1);redraw();ta.value=orig.text}
  stage.append(ta);
  editor={ta,x,y,fs,color,orig,idx};
  ta.addEventListener('input',sizeEditor);
  ta.addEventListener('keydown',e=>{if(e.key==='Escape'){e.preventDefault();commitEditor()}});
  sizeEditor();ta.focus();
}
function commitEditor(){
  if(!editor)return;
  const e=editor;editor=null;
  const text=e.ta.value.replace(/\s+$/,'');e.ta.remove();
  const st=P().strokes;
  if(e.orig){
    if(!text)record({t:'del',s:e.orig,i:e.idx});
    else if(text===e.orig.text){st.splice(e.idx,0,e.orig);changed()}
    else{const ns={...e.orig,text};st.splice(e.idx,0,ns);record({t:'rep',a:e.orig,b:ns})}
  }else if(text)doOp({t:'add',s:{type:'text',x:e.x,y:e.y,text,fs:e.fs,color:e.color}});
}

/* --- Entrada táctil / lápiz / ratón sobre el lienzo --- */
let pensDown=0;
dr.addEventListener('pointerdown',e=>{
  if(e.pointerType==='mouse'&&e.button!==0)return;
  if(e.pointerType==='touch'&&pensDown)return; // rechazo de palma: con un lápiz apoyado se ignora el dedo
  closePop();
  const p=pt(e);
  if(fistDown(e,p))return; // puño o palma: se comporta como un borrador grande (05e-borrar-puno.js)
  if(T.tool==='text'){
    e.preventDefault();
    if(editor){commitEditor();return}
    const hit=hitTest(p);
    if(hit&&hit.type==='text')openEditor(hit.x,hit.y,hit);else openEditor(p.x,p.y-FS[T.size]*.6);
    return;
  }
  commitEditor();
  if(e.pointerType==='pen')pensDown++;
  dr.setPointerCapture(e.pointerId);
  const isPen=e.pointerType==='pen';
  const gb=grp&&grpBox();
  if(gb&&p.x>=gb.x-14&&p.x<=gb.x+gb.w+14&&p.y>=gb.y-14&&p.y<=gb.y+gb.h+14){ // arrastrar el grupo
    active.set(e.pointerId,{grpDrag:true,last:p,dx:0,dy:0,pen:isPen});return;
  }
  if(T.tool==='select'){
    const s=hitTest(p);
    if(s){setSel(s);active.set(e.pointerId,{sel:s,last:p,dx:0,dy:0,pen:isPen});return}
    setSel(null);active.set(e.pointerId,{lasso:[p],pen:isPen});return; // en vacío: dibujar la bolsa
  }
  setSel(null);
  let s;
  const zi=zoneAt(p.x);
  if(zi>=0){ // pizarra dividida: cada zona dibuja con su color o su goma y no se sale de su parte
    const z=ZN.z[zi],[x0,x1]=zoneRange(zi);
    s={type:'free',tool:z.eraser?'eraser':'pen',color:z.color,size:z.eraser?40:6,pts:[p],zone:[x0+3,x1-3]};
    seg(cd,s,p,p);
  }else if(T.tool==='shape')s={type:'shape',shape:T.shape,fill:T.fill,color:T.color,size:T.size,a:p,b:p};
  else{
    const size=T.tool==='eraser'?Math.max(30,T.size*5):T.tool==='marker'?T.size*4+10:T.size;
    s={type:'free',tool:T.tool,color:T.color,size,pts:[p]};
    // junto al borde de la regla: el trazo sigue su borde
    if(T.tool!=='eraser'){const sn=rulerSnap(p,size);if(sn){s.snap=sn;s.pts=[sn(p)]}}
    if(!previewed(s))seg(cd,s,s.pts[0],s.pts[0]);
  }
  s.pen=e.pointerType==='pen';
  active.set(e.pointerId,s);drawLive();
  // mantener pulsado sin mover: se convierte en bolsa de selección
  if(T.tool!=='eraser'&&!s.zone&&!s.snap){
    const id=e.pointerId,start=p;
    s.lp=setTimeout(()=>{
      if(active.get(id)!==s||s.moved)return;
      active.set(id,{lasso:[start],pen:s.pen});redraw();drawLive();
      try{navigator.vibrate&&navigator.vibrate(15)}catch{}
      toast('Rodea los elementos para seleccionarlos');
    },550);
  }
});
dr.addEventListener('pointermove',e=>{
  const s=active.get(e.pointerId);if(!s)return;
  if(s.lasso){const q=pt(e),l=s.lasso[s.lasso.length-1];if(Math.hypot(q.x-l.x,q.y-l.y)>4){s.lasso.push(q);drawLive()}return}
  if(s.grpDrag){
    const q=pt(e),dx=q.x-s.last.x,dy=q.y-s.last.y;s.last=q;s.dx+=dx;s.dy+=dy;
    grp.strokes.forEach(t=>translate(t,dx,dy));
    grp.pieces.forEach(el=>{el.style.left=(el.offsetLeft+dx)+'px';el.style.top=(el.offsetTop+dy)+'px'});
    redraw();drawLive();placeSelbar();return;
  }
  if(s.lp&&!s.moved){const q=pt(e),o=s.pts?s.pts[0]:s.a;if(Math.hypot(q.x-o.x,q.y-o.y)>10)s.moved=true}
  if(s.sel!==undefined){ // arrastrando una selección
    if(!s.sel)return;const p=pt(e),dx=p.x-s.last.x,dy=p.y-s.last.y;
    translate(s.sel,dx,dy);s.dx+=dx;s.dy+=dy;s.last=p;redraw();setSel(s.sel);return;
  }
  if(s.type==='shape'){s.b=pt(e);drawLive();return}
  const evs=e.getCoalescedEvents?e.getCoalescedEvents():[e];
  for(const ev of (evs.length?evs:[e])){let p=pt(ev);if(s.snap)p=s.snap(p);if(s.zone)p={x:clamp(p.x,s.zone[0],s.zone[1]),y:p.y};const last=s.pts[s.pts.length-1];s.pts.push(p);if(!previewed(s))seg(cd,s,last,p)}
  if(previewed(s))drawLive();
});
function endStroke(e){
  const s=active.get(e.pointerId);if(!s)return;active.delete(e.pointerId);
  if(s.pen)pensDown=Math.max(0,pensDown-1);
  if(s.lp)clearTimeout(s.lp);
  if(s.lasso){lassoSelect(s.lasso);drawLive();return}
  if(s.grpDrag){if(grp&&grp.strokes.length&&(s.dx||s.dy))record({t:'multi',ops:grp.strokes.map(t=>({t:'move',s:t,dx:s.dx,dy:s.dy}))});placeSelbar();return}
  if(s.sel!==undefined){if(s.sel&&(s.dx||s.dy))record({t:'move',s:s.sel,dx:s.dx,dy:s.dy});return}
  delete s.pen;delete s.lp;delete s.moved;delete s.snap;delete s.zone;
  if(s.type==='shape'&&s.a.x===s.b.x&&s.a.y===s.b.y){drawLive();return}
  if(s.tool==='eraser'){eraseApply(s);return} // borrado real (05g-borrado-real.js)
  P().strokes.push(s);
  if(previewed(s))drawStroke(cd,s);
  record({t:'add',s});
}
dr.addEventListener('pointerup',endStroke);
dr.addEventListener('pointercancel',endStroke);
document.addEventListener('keydown',e=>{
  if(e.target.closest('textarea,input,[contenteditable]'))return;
  const k=e.key.toLowerCase();
  if((e.ctrlKey||e.metaKey)&&k==='z'){e.preventDefault();e.shiftKey?redo():undo()}
  else if((e.ctrlKey||e.metaKey)&&k==='y'){e.preventDefault();redo()}
  else if((k==='delete'||k==='backspace')&&(sel||grp)){e.preventDefault();deleteSelection()}
});

/* --- Navegación entre páginas --- */
// Cada página tiene su lienzo lógico (ver arriba). Aquí se pasa lo que hay en memoria de la vista anterior
// a la que toca con el tamaño actual de la pizarra: lección preparada en casa, otra PDI, cambio de modo…
function remapPage(p,ov,nv){
  const r=nv.k/ov.k,dx=nv.ox-ov.ox*r,dy=nv.oy-ov.oy*r;
  const seen=new Set(),shared=new Map(); // shared: los puntos que comparten dos copias de un trazo siguen compartidos
  const mp=q=>{let n=shared.get(q);if(!n){n={x:q.x*r+dx,y:q.y*r+dy};shared.set(q,n)}return n};
  const ms=s=>{
    if(!s||typeof s!=='object'||seen.has(s))return;seen.add(s);
    if(s.type==='img'){s.x=s.x*r+dx;s.y=s.y*r+dy;s.w*=r;s.h*=r}
    else if(s.type==='text'){s.x=s.x*r+dx;s.y=s.y*r+dy;s.fs*=r}
    else{
      s.size*=r;
      if(s.type==='shape'){s.a=mp(s.a);s.b=mp(s.b)}
      else{let n=shared.get(s.pts);if(!n){n=s.pts.map(q=>({x:q.x*r+dx,y:q.y*r+dy}));shared.set(s.pts,n)}s.pts=n}
    }
  };
  // también lo que guarda el historial, para que deshacer y rehacer devuelvan las cosas a su sitio
  const walk=op=>{
    switch(op.t){
      case 'multi':op.ops.forEach(walk);break;
      case 'move':ms(op.s);op.dx*=r;op.dy*=r;break;
      case 'size':ms(op.s);op.a={w:op.a.w*r,h:op.a.h*r};op.b={w:op.b.w*r,h:op.b.h*r};break;
      case 'rep':ms(op.a);ms(op.b);break;
      case 'clear':op.backup.forEach(ms);break;
      default:ms(op.s);
    }
  };
  p.strokes.forEach(ms);p.undo.forEach(walk);p.redo.forEach(walk);
  if(editor&&p===P()){ // texto que se está escribiendo
    ms(editor.orig);editor.x=editor.x*r+dx;editor.y=editor.y*r+dy;editor.fs*=r;
    editor.ta.style.left=(editor.x-3)+'px';editor.ta.style.top=(editor.y-3)+'px';editor.ta.style.fontSize=editor.fs+'px';sizeEditor();
  }
}
function fitPage(p){
  const W=stage.clientWidth,H=stage.clientHeight;if(!W||!H)return;
  if(!p.size||!(p.size.w>0)||!(p.size.h>0)){p.size={w:W,h:H};p.v=viewId()}
  const ov=viewOk(p.v)?p.v:viewId(),nv=viewFor(p.size);
  if(Math.abs(nv.k-ov.k)>1e-9||Math.abs(nv.ox-ov.ox)>1e-6||Math.abs(nv.oy-ov.oy)>1e-6){remapPage(p,ov,nv);persist(p)}
  p.v=nv;
  // una página sin nada dibujado toma el tamaño de la pizarra en la que está (no se mueve nada)
  if(!p.strokes.length&&!(editor&&p===P())){p.size={w:W,h:H};p.v=viewId()}
}
function showPage(){fitPage(P());setSel(null);active.clear();drawBg();redraw();drawLive();updatePageUI()}
function gotoPage(i){commitEditor();cur=clamp(i,0,pages.length-1);showPage();persist(null)}
function addPage(copy){
  commitEditor();
  const p=copy?{...newPage(P().bg),strokes:structuredClone(P().strokes),img:P().img,size:P().size?{...P().size}:null,v:P().v?{...P().v}:null,ch:P().ch?{...P().ch}:null}:newPage(P().bg);
  pages.splice(cur+1,0,p);gotoPage(cur+1);
}
function deletePage(){
  commitEditor();
  const removed=pages[cur],at=cur;
  if(pages.length===1)pages=[newPage(removed.bg)];else pages.splice(cur,1);
  gotoPage(Math.min(at,pages.length-1));
  toast('Página borrada',{label:ib('undo','Deshacer'),fn:()=>{if(pages.length===1&&!pages[0].strokes.length&&pages[0]!==removed)pages=[removed];else pages.splice(at,0,removed);gotoPage(at)}});
}
function updatePageUI(){
  const l=$('#pageLbl');if(l)l.replaceChildren(h('span',{},h('span',{class:'lbl-t'},'Página '),`${cur+1}/${pages.length}`,h('span',{class:'lbl-t'},' ▾')));
  const u=$('#btnUndo'),r=$('#btnRedo');
  if(u)u.disabled=!P().undo.length;if(r)r.disabled=!P().redo.length;
  REG.pageUI.forEach(f=>f());
}

/* --- Exportar: imagen PNG de la página o PDF de todas (vía imprimir) --- */
const loadImg=src=>new Promise(r=>{const i=new Image();i.onload=()=>r(i);i.onerror=()=>r(null);i.src=src});
// Dibuja una página (la actual u otra, o una de una lección) tal como se vería en esta pizarra, sin tocarla
async function renderPage(p,scale=2){
  const w=stage.clientWidth,hh=stage.clientHeight,dark=document.documentElement.dataset.theme==='dark';
  const L=p.size&&p.strokes.length?p.size:{w,h:hh},cv=viewOk(p.v)&&p.strokes.length?p.v:viewId(),tv=viewFor(L);
  const r=tv.k/cv.k,dx=tv.ox-cv.ox*r,dy=tv.oy-cv.oy*r; // de las coordenadas de la página a las de esta pizarra
  const c=document.createElement('canvas');c.width=w*scale;c.height=hh*scale;
  const x=c.getContext('2d');x.scale(scale,scale);
  x.fillStyle=getComputedStyle(stage).backgroundColor;x.fillRect(0,0,w,hh);
  if(p.img){const im=await loadImg(p.img);if(im){const pw=L.w*tv.k,ph=L.h*tv.k,k=Math.min(pw/im.width,ph/im.height);x.drawImage(im,tv.ox+(pw-im.width*k)/2,tv.oy+(ph-im.height*k)/2,im.width*k,im.height*k)}}
  paintBgView(x,w,hh,tv,p.bg,dark);
  x.save();x.translate(dx,dy);x.scale(r,r);
  for(const s of p.strokes)if(s.type==='img'){const im=await loadImg(s.src);if(im)x.drawImage(im,s.x,s.y,s.w,s.h)}
  x.restore();
  const ink=document.createElement('canvas');ink.width=c.width;ink.height=c.height; // capa aparte para que el borrador no borre el fondo
  const ix=ink.getContext('2d');ix.scale(scale,scale);ix.translate(dx,dy);ix.scale(r,r);p.strokes.forEach(s=>drawStroke(ix,s));
  x.setTransform(1,0,0,1,0,0);x.drawImage(ink,0,0);
  return c;
}
async function exportPNG(){
  commitEditor();
  const c=await renderPage(P());
  c.toBlob(b=>{const a=h('a',{href:URL.createObjectURL(b),download:`fori-pagina-${cur+1}.png`});document.body.append(a);a.click();a.remove();setTimeout(()=>URL.revokeObjectURL(a.href),5000)});
}
async function exportPDF(){
  commitEditor();toast('Preparando el PDF…');
  const imgs=[];for(const p of pages)imgs.push((await renderPage(p,1.5)).toDataURL('image/jpeg',.9));
  const fr=h('iframe',{style:'position:fixed;width:0;height:0;border:0;right:0;bottom:0'});
  fr.srcdoc=`<!doctype html><html><head><title>Fori</title><style>@page{size:A4 landscape;margin:8mm}body{margin:0}img{display:block;width:100%;height:calc(100vh - 2px);object-fit:contain;break-after:page}img:last-child{break-after:auto}</style></head><body>${imgs.map(s=>`<img src="${s}">`).join('')}</body></html>`;
  fr.onload=()=>{setTimeout(()=>{fr.contentWindow.focus();fr.contentWindow.print();setTimeout(()=>fr.remove(),60000)},300)};
  document.body.append(fr);
  toast('En el cuadro de impresión elige «Guardar como PDF»');
}
async function setBgImage(file){
  const p=P(); // la página en la que se pidió, aunque se cambie de página mientras se prepara la imagen
  try{p.img=await shrinkImage(file,1920);drawBg();persist(p)}catch{toast('No se pudo cargar la imagen')}
}

