/* ============ Formas geométricas (registro forma() de 00-base.js) ============ */
// Cada forma dice cómo se dibuja con una lista de piezas; drawShape, el borrador, la selección y los iconos del menú la comparten.
// Los ids de las ocho de siempre no cambian (están en pizarras, lecciones y archivos .fori ya guardados).
const FM={
  pt:(x,y)=>({x,y}),
  ring(n,b,off=0){return Array.from({length:n},(_,i)=>{const t=-Math.PI/2+off+i*2*Math.PI/n;return{x:b.cx+b.w/2*Math.cos(t),y:b.cy+b.h/2*Math.sin(t)}})},
  // arco de elipse (centro, radios, ángulos en radianes) como puntos
  arc(cx,cy,rx,ry,a0,a1,n){return Array.from({length:n+1},(_,i)=>{const t=a0+(a1-a0)*i/n;return{x:cx+rx*Math.cos(t),y:cy+ry*Math.sin(t)}})},
  n:(w,h)=>clamp(Math.ceil((w+h)/10),12,80),
  // punta de flecha en q (en forma de V abierta), viniendo desde p
  head(p,q,s){
    const dx=q.x-p.x,dy=q.y-p.y,l=Math.hypot(dx,dy)||1,ux=dx/l,uy=dy/l,hl=Math.min(l*.4,Math.max(14,s.size*3+8)),c=Math.cos(.45),sn=Math.sin(.45);
    return[{x:q.x-hl*(ux*c-uy*sn),y:q.y-hl*(uy*c+ux*sn)},{x:q.x,y:q.y},{x:q.x-hl*(ux*c+uy*sn),y:q.y-hl*(uy*c-ux*sn)}];
  },
  line:(a,b)=>({pts:[{x:a.x,y:a.y},{x:b.x,y:b.y}],closed:false})
};
const FMp=FM.pt;

/* --- Líneas --- */
forma({id:'line',group:'linea',order:1,label:'Línea',polys:(a,b)=>[FM.line(a,b)]});
forma({id:'arrow',group:'linea',order:2,label:'Flecha',polys:(a,b,box,s)=>[FM.line(a,b),{pts:FM.head(a,b,s),closed:false}]});
forma({id:'darrow',group:'linea',order:3,label:'Flecha doble',polys:(a,b,box,s)=>[FM.line(a,b),{pts:FM.head(a,b,s),closed:false},{pts:FM.head(b,a,s),closed:false}]});
forma({id:'seg',group:'linea',order:4,label:'Segmento',polys:(a,b,box,s)=>{
  const r=s.size*1.2+2;
  return[FM.line(a,b),{ell:{cx:a.x,cy:a.y,rx:r,ry:r},closed:true,solid:true},{ell:{cx:b.x,cy:b.y,rx:r,ry:r},closed:true,solid:true}];
}});

/* --- Planas --- */
forma({id:'rect',group:'plana',order:1,label:'Rectángulo',polys:(a,b,{x,y,w,h})=>[{pts:[FMp(x,y),FMp(x+w,y),FMp(x+w,y+h),FMp(x,y+h)],closed:true,fill:true}]});
forma({id:'square',group:'plana',order:2,label:'Cuadrado',keep:true,polys:(a,b,{x,y,w,h})=>[{pts:[FMp(x,y),FMp(x+w,y),FMp(x+w,y+h),FMp(x,y+h)],closed:true,fill:true}]});
forma({id:'circle',group:'plana',order:3,label:'Círculo',keep:true,polys:(a,b,{cx,cy,w,h})=>[{ell:{cx,cy,rx:w/2,ry:h/2},closed:true,fill:true}]});
forma({id:'ellipse',group:'plana',order:4,label:'Elipse',polys:(a,b,{cx,cy,w,h})=>[{ell:{cx,cy,rx:w/2,ry:h/2},closed:true,fill:true}]});
forma({id:'triangle',group:'plana',order:5,label:'Triángulo',polys:(a,b,{x,y,w,h,cx})=>[{pts:[FMp(cx,y),FMp(x+w,y+h),FMp(x,y+h)],closed:true,fill:true}]});
forma({id:'trirect',group:'plana',order:6,label:'Triángulo rectángulo',polys:(a,b,{x,y,w,h})=>{
  const izq=a.x<=b.x,m=Math.min(w,h)*.18; // el ángulo recto queda del lado de donde se empieza a arrastrar, con su marca
  const px=izq?x:x+w,sx=izq?1:-1;
  return[{pts:[FMp(px,y),FMp(px,y+h),FMp(izq?x+w:x,y+h)],closed:true,fill:true},{pts:[FMp(px,y+h-m),FMp(px+sx*m,y+h-m),FMp(px+sx*m,y+h)],closed:false}];
}});
forma({id:'rombo',group:'plana',order:7,label:'Rombo',polys:(a,b,{x,y,w,h,cx,cy})=>[{pts:[FMp(cx,y),FMp(x+w,cy),FMp(cx,y+h),FMp(x,cy)],closed:true,fill:true}]});
forma({id:'romboide',group:'plana',order:8,label:'Romboide',polys:(a,b,{x,y,w,h})=>{const k=w*.25;return[{pts:[FMp(x+k,y),FMp(x+w,y),FMp(x+w-k,y+h),FMp(x,y+h)],closed:true,fill:true}]}});
forma({id:'trapecio',group:'plana',order:9,label:'Trapecio',polys:(a,b,{x,y,w,h})=>{const k=w*.2;return[{pts:[FMp(x+k,y),FMp(x+w-k,y),FMp(x+w,y+h),FMp(x,y+h)],closed:true,fill:true}]}});
forma({id:'pentagon',group:'plana',order:10,label:'Pentágono',keep:true,polys:(a,b,box)=>[{pts:FM.ring(5,box),closed:true,fill:true}]});
forma({id:'hexagon',group:'plana',order:11,label:'Hexágono',keep:true,polys:(a,b,box)=>[{pts:FM.ring(6,box),closed:true,fill:true}]});
forma({id:'octogono',group:'plana',order:12,label:'Octógono',keep:true,polys:(a,b,{x,y,w,h})=>{
  const c=Math.min(w,h)*.2929,x1=x+w,y1=y+h;
  return[{pts:[FMp(x+c,y),FMp(x1-c,y),FMp(x1,y+c),FMp(x1,y1-c),FMp(x1-c,y1),FMp(x+c,y1),FMp(x,y1-c),FMp(x,y+c)],closed:true,fill:true}];
}});
forma({id:'estrella',group:'plana',order:13,label:'Estrella',keep:true,polys:(a,b,{cx,cy,w,h})=>{
  // estrella de cinco puntas regular, ajustada a la caja
  const R=Math.min(w/1.902,h/1.809),pts=[];
  for(let i=0;i<10;i++){const t=-Math.PI/2+i*Math.PI/5,r=i%2?.382:1;pts.push({x:cx+R*r*Math.cos(t),y:cy+R*(r*Math.sin(t)+.0955)})}
  return[{pts,closed:true,fill:true}];
}});
forma({id:'semicirculo',group:'plana',order:14,label:'Semicírculo',polys:(a,b,{y,w,h,cx})=>{
  const r=Math.min(w/2,h); // siempre medio círculo, apoyado en la base de la caja
  return[{pts:FM.arc(cx,y+h,r,r,Math.PI,2*Math.PI,FM.n(r*2,r)),closed:true,fill:true}];
}});

/* --- Cuerpos (las aristas ocultas, discontinuas) --- */
const prisma=(f)=>(a,b,{x,y,w,h})=>{
  const o=Math.min(w,h)*f,x1=x+w,y1=y+h;
  const F0=FMp(x,y+o),F1=FMp(x1-o,y+o),F2=FMp(x1-o,y1),F3=FMp(x,y1),B0=FMp(x+o,y),B1=FMp(x1,y),B2=FMp(x1,y1-o),B3=FMp(x+o,y1-o);
  return[
    {pts:[F0,B0,B1,B2,F2,F3],closed:true,fill:true,nostroke:true},
    {pts:[F0,F1,F2,F3],closed:true},
    {pts:[F0,B0,B1,B2,F2],closed:false},{pts:[B1,F1],closed:false},
    {pts:[F3,B3,B0],closed:false,dash:true},{pts:[B3,B2],closed:false,dash:true}
  ];
};
forma({id:'cubo',group:'cuerpo',order:1,label:'Cubo',keep:true,polys:prisma(.3)});
forma({id:'ortoedro',group:'cuerpo',order:2,label:'Ortoedro',polys:prisma(.25)});
forma({id:'cilindro',group:'cuerpo',order:3,label:'Cilindro',polys:(a,b,{x,y,w,h,cx})=>{
  const rx=w/2,ry=Math.min(w*.2,h*.25),n=FM.n(w,ry*2),ty=y+ry,by=y+h-ry,P=Math.PI;
  const sil=FM.arc(cx,ty,rx,ry,P,2*P,n).concat(FM.arc(cx,by,rx,ry,0,P,n)); // arco de atrás de la tapa y arco de delante de la base (de derecha a izquierda)
  return[
    {pts:sil,closed:true,fill:true,nostroke:true},
    {ell:{cx,cy:ty,rx,ry},closed:true},
    {pts:[FMp(x,ty),FMp(x,by)],closed:false},{pts:[FMp(x+w,ty),FMp(x+w,by)],closed:false},
    {pts:FM.arc(cx,by,rx,ry,0,P,n),closed:false},
    {pts:FM.arc(cx,by,rx,ry,P,2*P,n),closed:false,dash:true}
  ];
}});
forma({id:'cono',group:'cuerpo',order:4,label:'Cono',polys:(a,b,{x,y,w,h,cx})=>{
  const rx=w/2,ry=Math.min(w*.2,h*.25),n=FM.n(w,ry*2),by=y+h-ry,P=Math.PI,V=FMp(cx,y);
  return[
    {pts:[V,FMp(x+w,by)].concat(FM.arc(cx,by,rx,ry,0,P,n),[FMp(x,by)]),closed:true,fill:true,nostroke:true},
    {pts:[FMp(x,by),V,FMp(x+w,by)],closed:false},
    {pts:FM.arc(cx,by,rx,ry,0,P,n),closed:false},
    {pts:FM.arc(cx,by,rx,ry,P,2*P,n),closed:false,dash:true}
  ];
}});
forma({id:'piramide',group:'cuerpo',order:5,label:'Pirámide',polys:(a,b,{x,y,w,h})=>{
  const o=Math.min(w,h)*.25,x1=x+w,y1=y+h,A=FMp(x,y1),B=FMp(x1-o,y1),C=FMp(x1,y1-o),D=FMp(x+o,y1-o),V=FMp(x+w/2,y);
  return[
    {pts:[V,A,B,C],closed:true,fill:true,nostroke:true},
    {pts:[A,B,C],closed:false},{pts:[A,V,B],closed:false},{pts:[V,C],closed:false},
    {pts:[A,D,C],closed:false,dash:true},{pts:[V,D],closed:false,dash:true}
  ];
}});
forma({id:'esfera',group:'cuerpo',order:6,label:'Esfera',keep:true,polys:(a,b,{cx,cy,w,h})=>{
  const rx=w/2,ry=h/2,e=ry*.3,n=FM.n(w,e*2),P=Math.PI;
  return[
    {ell:{cx,cy,rx,ry},closed:true,fill:true},
    {pts:FM.arc(cx,cy,rx,e,0,P,n),closed:false},
    {pts:FM.arc(cx,cy,rx,e,P,2*P,n),closed:false,dash:true}
  ];
}});

/* --- Iconos del menú: la propia forma dibujada pequeña (SVG de 28×28) --- */
function formaIcon(f){
  const lin=f.group==='linea',a={x:lin?4:3,y:lin?23:3},b0={x:lin?24:25,y:lin?5:23};
  const b=f.keep?shapeEnd({a,b:b0,shape:f.id}):b0;
  const f2=n=>Math.round(n*100)/100;
  const d=shapeParts(f,a,b,{size:1.5}).filter(it=>!it.nostroke).map(it=>{
    if(it.ell){const e=it.ell,at=`cx="${f2(e.cx)}" cy="${f2(e.cy)}" rx="${f2(e.rx)}" ry="${f2(e.ry)}"`;return it.solid?`<ellipse ${at} fill="currentColor"/>`:`<ellipse ${at}/>`}
    return`<${it.closed?'polygon':'polyline'} points="${it.pts.map(q=>f2(q.x)+','+f2(q.y)).join(' ')}"${it.dash?' stroke-dasharray="2.2 2.2"':''}/>`;
  }).join('');
  return`<svg class="fi" viewBox="0 0 28 28" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">${d}</svg>`;
}
