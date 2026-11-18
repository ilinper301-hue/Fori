/* ============ Borrado real ============ */
// El borrador quita de verdad lo que toca, en vez de dejar un trazo «tapón» encima:
//  · trazos de lápiz y fluorescente, líneas y formas sin relleno: se corta el trozo por donde pasa;
//  · textos y formas con relleno: se borran enteros (se recuperan con Deshacer);
//  · imágenes: no se tocan (se borran con Mover).
// Así la página no engorda al borrar y lo borrado no «se queda atrás» al mover un dibujo.
// Las páginas antiguas pueden traer trazos 'eraser' del sistema anterior: se siguen pintando como antes.

// Contorno de una forma como líneas poligonales: una por pieza ({pts,closed,fill,dash,solid,nostroke}); los círculos se aproximan con segmentos
function shapeLines(s){
  return shapePolys(s).map(it=>{
    let pts=it.pts;
    if(it.ell){
      const e=it.ell,n=clamp(Math.ceil((e.rx+e.ry)*2/5),24,160);
      pts=Array.from({length:n},(_,i)=>{const t=-Math.PI/2+i*2*Math.PI/n;return{x:e.cx+e.rx*Math.cos(t),y:e.cy+e.ry*Math.sin(t)}});
    }else pts=pts.map(q=>({x:q.x,y:q.y}));
    if(it.closed)pts.push({x:pts[0].x,y:pts[0].y});
    return{pts,closed:!!it.closed,fill:!!it.fill,dash:!!it.dash,solid:!!it.solid,nostroke:!!it.nostroke};
  }).filter(l=>l.pts.length);
}
// Recorre la línea pts y devuelve los tramos que quedan fuera del borrador (a más de R de su recorrido).
// Devuelve null si el borrador no la toca. minLen: los restos más cortos se descartan (no dejan motas).
function eraseRuns(pts,closed,R,segs,minLen){
  const inside=p=>{for(const g of segs)if(distSeg(p,g[0],g[1])<=R)return true;return false};
  if(pts.length===1)return inside(pts[0])?[]:null;
  const lerp=(a,b,t)=>({x:a.x+(b.x-a.x)*t,y:a.y+(b.y-a.y)*t});
  const edge=(a,b,keep,gone)=>{for(let i=0;i<7;i++){const m=(keep+gone)/2;if(inside(lerp(a,b,m)))gone=m;else keep=m}return lerp(a,b,keep)};
  const step=Math.max(1.5,R/4),runs=[];
  const startKept=!inside(pts[0]);
  let prevIn=!startKept,hit=prevIn,run=prevIn?null:[{x:pts[0].x,y:pts[0].y}];
  for(let i=1;i<pts.length;i++){
    const a=pts[i-1],b=pts[i],n=Math.max(1,Math.ceil(Math.hypot(b.x-a.x,b.y-a.y)/step));
    let tPrev=0;
    for(let j=1;j<=n;j++){
      const t=j/n,now=inside(j===n?b:lerp(a,b,t));
      if(now!==prevIn){
        hit=true;
        if(now){run.push(edge(a,b,tPrev,t));runs.push(run);run=null}
        else run=[edge(a,b,t,tPrev)];
        prevIn=now;
      }
      tPrev=t;
    }
    if(!prevIn)run.push({x:b.x,y:b.y});
  }
  if(run)runs.push(run);
  if(!hit)return null;
  // en una forma cerrada, el último tramo continúa en el primero
  if(closed&&runs.length>1&&startKept&&!prevIn){const last=runs.pop();runs[0]=last.concat(runs[0].slice(1))}
  const len=r=>r.reduce((s,q,i)=>i?s+Math.hypot(q.x-r[i-1].x,q.y-r[i-1].y):0,0);
  return runs.filter(r=>len(r)>=minLen);
}
// Aplica el paso del borrador (trazo con size y pts) a la página actual, en una sola operación que se puede deshacer
function eraseApply(er){
  const st=P().strokes,R0=er.size/2,ep=er.pts;
  const segs=ep.length===1?[[ep[0],ep[0]]]:ep.slice(1).map((q,i)=>[ep[i],q]);
  const xs=ep.map(q=>q.x),ys=ep.map(q=>q.y),ex0=Math.min(...xs),ex1=Math.max(...xs),ey0=Math.min(...ys),ey1=Math.max(...ys);
  const ops=[];
  for(let i=st.length-1;i>=0;i--){ // de arriba abajo: así los índices de los que faltan no cambian
    const s=st[i];
    if(s.type==='img'||s.tool==='eraser')continue;
    const b=bbox(s),R=R0+(s.size||0)/4;
    if(b.x>ex1+R||b.x+b.w<ex0-R||b.y>ey1+R||b.y+b.h<ey0-R)continue;
    let pieces=null;
    if(s.type==='text'){
      const m=R0*.5;
      if(ep.some(q=>q.x>=b.x-m&&q.x<=b.x+b.w+m&&q.y>=b.y-m&&q.y<=b.y+b.h+m))pieces=[];
    }else{
      const near=segs.filter(g=>Math.max(g[0].x,g[1].x)>=b.x-R&&Math.min(g[0].x,g[1].x)<=b.x+b.w+R&&Math.max(g[0].y,g[1].y)>=b.y-R&&Math.min(g[0].y,g[1].y)<=b.y+b.h+R);
      if(!near.length)continue;
      const minLen=Math.max(1.5,(s.size||0)*.35);
      if(s.type==='shape'){
        const lines=shapeLines(s);if(!lines.length)continue; // forma desconocida: no se toca
        if(s.fill&&lines.some(l=>l.fill)){
          if(lines.filter(l=>l.fill).some(l=>eraseRuns(l.pts,true,R,near,0)||ep.some(q=>inPoly(q,l.pts))))pieces=[];
        }else{
          // se corta cada pieza por donde pasa el borrador; las que no toca se conservan como trazo (las discontinuas quedan continuas)
          let hit=false;const out=[];
          for(const l of lines){
            if(l.nostroke)continue; // la silueta solo sirve para el relleno
            const runs=eraseRuns(l.pts,l.closed,R,near,minLen);
            if(runs){hit=true;out.push(...runs)}else out.push(l.pts);
          }
          if(hit)pieces=out.map(pts=>({type:'free',tool:'pen',color:s.color,size:s.size,pts}));
        }
      }else{
        const runs=eraseRuns(s.pts,false,R,near,minLen);
        if(runs)pieces=runs.map(pts=>({...s,pts}));
      }
    }
    if(!pieces)continue;
    ops.push({t:'del',s,i});
    pieces.forEach((q,j)=>ops.push({t:'add',s:q,i:i+j}));
  }
  if(ops.length)doOp({t:'multi',ops});
  else{redraw();drawLive()} // no ha tocado nada: se quita la marca del borrador
}
