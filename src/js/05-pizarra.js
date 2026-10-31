/* ============ Pizarra ============ */
const stage=$('#stage'),bg=$('#bg'),dr=$('#draw'),lv=$('#live');
const cb=bg.getContext('2d'),cd=dr.getContext('2d'),cl=lv.getContext('2d');
const T={tool:'pen',color:'ink',size:6,shape:'line',fill:false};
const FONT='system-ui,-apple-system,"Segoe UI",Roboto,Arial,sans-serif';
const FS={3:32,6:48,12:72}; // tamaño de letra según el grosor elegido
const active=new Map();
const inkColor=()=>document.documentElement.dataset.theme==='dark'?'#ffffff':'#111111';

/* --- Páginas y guardado automático (IndexedDB) --- */
const newPage=bgType=>({strokes:[],bg:bgType||'plain',img:null,undo:[],redo:[]});
let pages=[newPage()],cur=0,sel=null;
const P=()=>pages[cur];
const DB={db:null,
  open(){return new Promise(r=>{try{const q=indexedDB.open('fori',1);q.onupgradeneeded=()=>q.result.createObjectStore('kv');q.onsuccess=()=>{this.db=q.result;r()};q.onerror=()=>r()}catch{r()}})},
  get(k){return new Promise(r=>{if(!this.db)return r(null);try{const q=this.db.transaction('kv').objectStore('kv').get(k);q.onsuccess=()=>r(q.result===undefined?null:q.result);q.onerror=()=>r(null)}catch{r(null)}})},
  set(k,v){return new Promise(r=>{if(!this.db)return r(false);try{const t=this.db.transaction('kv','readwrite');t.objectStore('kv').put(v,k);t.oncomplete=()=>r(true);t.onerror=()=>r(false)}catch{r(false)}})}
};
let persistT=null;
function persist(){
  clearTimeout(persistT);
  persistT=setTimeout(()=>DB.set('board',{cur,pages:pages.map(p=>({strokes:p.strokes,bg:p.bg,img:p.img}))}),600);
}
async function loadBoard(){
  await DB.open();
  const d=await DB.get('board');
  if(d&&Array.isArray(d.pages)&&d.pages.length){
    pages=d.pages.map(p=>({strokes:p.strokes||[],bg:p.bg||'plain',img:p.img||null,undo:[],redo:[]}));
    cur=clamp(d.cur|0,0,pages.length-1);
  }
  showPage();
}

/* --- Fondos y pautas --- */
function fit(){
  const dpr=window.devicePixelRatio||1,w=stage.clientWidth,hh=stage.clientHeight;
  for(const [c,x] of [[bg,cb],[dr,cd],[lv,cl]]){c.width=Math.round(w*dpr);c.height=Math.round(hh*dpr);x.setTransform(dpr,0,0,dpr,0,0)}
  drawBg();redraw();
}
function paintBg(ctx,w,hh,type,dark){
  const k=S.pautaSize||1;
  const soft=dark?'rgba(255,255,255,.22)':'rgba(30,80,160,.28)';
  const strong=dark?'rgba(255,255,255,.5)':'rgba(30,80,160,.6)';
  const red=dark?'rgba(255,120,120,.6)':'rgba(214,40,40,.55)';
  const line=(y,c,wd,dash)=>{ctx.beginPath();ctx.setLineDash(dash||[]);ctx.strokeStyle=c;ctx.lineWidth=wd||1.5;ctx.moveTo(0,y);ctx.lineTo(w,y);ctx.stroke()};
  ctx.save();ctx.lineWidth=1.5;ctx.strokeStyle=soft;ctx.fillStyle=soft;
  if(type==='grid'){
    const c=40*k;
    for(let x=0;x<w;x+=c){ctx.beginPath();ctx.moveTo(x,0);ctx.lineTo(x,hh);ctx.stroke()}
    for(let y=0;y<hh;y+=c)line(y,soft);
  }else if(type==='dots'){
    const c=40*k;
    for(let x=c/2;x<w;x+=c)for(let y=c/2;y<hh;y+=c){ctx.beginPath();ctx.arc(x,y,2.4,0,7);ctx.fill()}
  }else if(type==='lines'){ // pauta de doble línea con línea intermedia discontinua
    for(let y=0;y<hh;y+=130*k){line(y+18*k,soft);line(y+38*k,strong);line(y+63*k,soft,1.5,[8,8]);line(y+88*k,strong);line(y+108*k,soft)}
  }else if(type==='montessori'){ // 4 líneas: ascendentes · cuerpo (sombreado) · descendentes
    const s=32*k;
    for(let y=0;y<hh;y+=s*5){
      ctx.fillStyle=dark?'rgba(255,120,120,.10)':'rgba(214,40,40,.07)';ctx.fillRect(0,y+s*1.5,w,s);
      line(y+s*.5,strong);line(y+s*1.5,red,2);line(y+s*2.5,red,2);line(y+s*3.5,strong);
    }
  }else if(type==='cuadrovia'){ // cuadrícula en grupos de 3 filas con la fila central (cuerpo) marcada
    const c=22*k;
    for(let x=0;x<w;x+=c){ctx.beginPath();ctx.moveTo(x,0);ctx.lineTo(x,hh);ctx.stroke()}
    for(let r=0;r*c<hh;r++)line(r*c,soft,1);
    for(let y=0;y<hh;y+=c*3){
      ctx.fillStyle=dark?'rgba(120,180,255,.10)':'rgba(30,111,224,.07)';ctx.fillRect(0,y+c,w,c);
      line(y+c,strong,2.2);line(y+2*c,strong,2.2);
    }
  }
  ctx.restore();
}
function drawBg(){
  const w=stage.clientWidth,hh=stage.clientHeight;
  cb.clearRect(0,0,w,hh);
  paintBg(cb,w,hh,P().bg,document.documentElement.dataset.theme==='dark');
  $('#bgimg').style.backgroundImage=P().img?`url(${P().img})`:'';
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
  if(s.type==='text')return drawText(ctx,s);
  if(s.type==='shape')return drawShape(ctx,s);
  if(s.pts.length===1)return seg(ctx,s,s.pts[0],s.pts[0]);
  ctx.save();setStyle(ctx,s);ctx.beginPath();
  s.pts.forEach((p,i)=>i?ctx.lineTo(p.x,p.y):ctx.moveTo(p.x,p.y));
  ctx.stroke();ctx.restore();
}
function redraw(){cd.clearRect(0,0,stage.clientWidth,stage.clientHeight);P().strokes.forEach(s=>drawStroke(cd,s))}
const pt=e=>{const r=dr.getBoundingClientRect();return{x:e.clientX-r.left,y:e.clientY-r.top}};

/* --- Selección: caja envolvente y detección de toque --- */
function bbox(s){
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
  if(s.type==='text'){s.x+=dx;s.y+=dy}
  else if(s.type==='shape'){s.a={x:s.a.x+dx,y:s.a.y+dy};s.b={x:s.b.x+dx,y:s.b.y+dy}}
  else s.pts.forEach(p=>{p.x+=dx;p.y+=dy});
}

/* --- Historial por página: deshacer / rehacer --- */
function applyOp(op,rev){
  const st=P().strokes;
  switch(op.t){
    case 'add':if(!rev)st.push(op.s);else{const i=st.lastIndexOf(op.s);if(i>=0)st.splice(i,1)}break;
    case 'del':if(!rev)st.splice(st.indexOf(op.s),1);else st.splice(Math.min(op.i,st.length),0,op.s);break;
    case 'move':translate(op.s,rev?-op.dx:op.dx,rev?-op.dy:op.dy);break;
    case 'rep':{const i=st.indexOf(rev?op.b:op.a);if(i>=0)st[i]=rev?op.a:op.b;break}
    case 'clear':P().strokes=rev?op.backup:[];break;
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
function setSel(s){sel=s;grp=null;drawLive();placeSelbar()}
function setGrp(g){grp=g&&(g.strokes.length||g.pieces.length)?g:null;sel=null;drawLive();placeSelbar()}
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
  if(T.tool==='shape')s={type:'shape',shape:T.shape,fill:T.fill,color:T.color,size:T.size,a:p,b:p};
  else{
    const size=T.tool==='eraser'?Math.max(30,T.size*5):T.tool==='marker'?T.size*4+10:T.size;
    s={type:'free',tool:T.tool,color:T.color,size,pts:[p]};
    if(!previewed(s))seg(cd,s,p,p);
  }
  s.pen=e.pointerType==='pen';
  active.set(e.pointerId,s);drawLive();
  // mantener pulsado sin mover: se convierte en bolsa de selección
  if(T.tool!=='eraser'){
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
  for(const ev of (evs.length?evs:[e])){const p=pt(ev),last=s.pts[s.pts.length-1];s.pts.push(p);if(!previewed(s))seg(cd,s,last,p)}
  if(previewed(s))drawLive();
});
function endStroke(e){
  const s=active.get(e.pointerId);if(!s)return;active.delete(e.pointerId);
  if(s.pen)pensDown=Math.max(0,pensDown-1);
  if(s.lp)clearTimeout(s.lp);
  if(s.lasso){lassoSelect(s.lasso);drawLive();return}
  if(s.grpDrag){if(grp&&grp.strokes.length&&(s.dx||s.dy))record({t:'multi',ops:grp.strokes.map(t=>({t:'move',s:t,dx:s.dx,dy:s.dy}))});placeSelbar();return}
  if(s.sel!==undefined){if(s.sel&&(s.dx||s.dy))record({t:'move',s:s.sel,dx:s.dx,dy:s.dy});return}
  delete s.pen;delete s.lp;delete s.moved;
  if(s.type==='shape'&&s.a.x===s.b.x&&s.a.y===s.b.y){drawLive();return}
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
function showPage(){setSel(null);active.clear();drawBg();redraw();drawLive();updatePageUI()}
function gotoPage(i){commitEditor();cur=clamp(i,0,pages.length-1);showPage();persist()}
function addPage(copy){
  commitEditor();
  const p=copy?{...newPage(P().bg),strokes:structuredClone(P().strokes),img:P().img}:newPage(P().bg);
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
  const l=$('#pageLbl');if(l)l.textContent=`Página ${cur+1}/${pages.length} ▾`;
  const u=$('#btnUndo'),r=$('#btnRedo');
  if(u)u.disabled=!P().undo.length;if(r)r.disabled=!P().redo.length;
}

/* --- Exportar: imagen PNG de la página o PDF de todas (vía imprimir) --- */
const loadImg=src=>new Promise(r=>{const i=new Image();i.onload=()=>r(i);i.onerror=()=>r(null);i.src=src});
async function renderPage(p,scale=2){
  const w=stage.clientWidth,hh=stage.clientHeight,dark=document.documentElement.dataset.theme==='dark';
  const c=document.createElement('canvas');c.width=w*scale;c.height=hh*scale;
  const x=c.getContext('2d');x.scale(scale,scale);
  x.fillStyle=getComputedStyle(stage).backgroundColor;x.fillRect(0,0,w,hh);
  if(p.img){const im=await loadImg(p.img);if(im){const k=Math.min(w/im.width,hh/im.height);x.drawImage(im,(w-im.width*k)/2,(hh-im.height*k)/2,im.width*k,im.height*k)}}
  paintBg(x,w,hh,p.bg,dark);
  const ink=document.createElement('canvas');ink.width=c.width;ink.height=c.height; // capa aparte para que el borrador no borre el fondo
  const ix=ink.getContext('2d');ix.scale(scale,scale);p.strokes.forEach(s=>drawStroke(ix,s));
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
  try{P().img=await shrinkImage(file,1920);drawBg();persist()}catch{toast('No se pudo cargar la imagen')}
}

