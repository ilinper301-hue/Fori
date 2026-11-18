/* ============ Plantillas y pautas nuevas (fondos) ============
   Se apuntan en el registro de fondos (ver 00-base.js y 05-pizarra.js).
   Pautas nuevas (se repiten por toda la página y tienen los cuatro tamaños): Renglones, Papel isométrico, Milimetrado.
   Plantillas: se dibujan UNA vez, encajadas en el rectángulo de la página (0,0)-(L.w,L.h) con margen; g.L es el tamaño
   de la página. Todo se calcula a partir de L (no hay medidas fijas), así que valen en horizontal, en vertical y en la
   vista previa del menú. Colores suaves como las pautas (en tema oscuro, claros). La variante se guarda en p.bgo (texto corto). */

/* --- Utilidades de dibujo (pl = plantilla) --- */
const PL_CLARO={blue:[30,111,224],red:[214,40,40],green:[40,160,80],orange:[240,140,20]};
const PL_OSCURO={blue:[120,180,255],red:[255,120,120],green:[110,220,150],orange:[255,190,100]};
const plTint=(dark,n,a)=>`rgba(${(dark?PL_OSCURO:PL_CLARO)[n].join(',')},${a})`;
// Prepara el lienzo y devuelve lo que usan todas: margen m, grosor lw, colores suave y fuerte
function plBase(g){
  const {ctx,L,dark}=g,mn=Math.min(L.w,L.h),u=mn/720,m=mn*.06,lw=Math.max(1.5,2.2*u);
  ctx.lineWidth=lw;ctx.lineJoin='round';ctx.lineCap='round';ctx.strokeStyle=g.strong;ctx.fillStyle=g.soft;
  return{ctx,L,dark,m,lw,u,soft:g.soft,line:g.strong,tint:(n,a)=>plTint(dark,n,a)};
}
const plSet=(c,col,w)=>{c.strokeStyle=col;c.lineWidth=w};
const plLn=(c,x1,y1,x2,y2)=>{c.beginPath();c.moveTo(x1,y1);c.lineTo(x2,y2);c.stroke()};
const plRc=(c,x,y,w,h,fill)=>{if(fill){c.fillStyle=fill;c.fillRect(x,y,w,h)}c.strokeRect(x,y,w,h)};
const plRR=(c,x,y,w,h,r,fill)=>{
  r=Math.min(r,w/2,h/2);
  c.beginPath();c.moveTo(x+r,y);c.arcTo(x+w,y,x+w,y+h,r);c.arcTo(x+w,y+h,x,y+h,r);c.arcTo(x,y+h,x,y,r);c.arcTo(x,y,x+w,y,r);c.closePath();
  if(fill){c.fillStyle=fill;c.fill()}c.stroke();
};
const plEl=(c,x,y,rx,ry,fill)=>{c.beginPath();c.ellipse(x,y,rx,ry,0,0,Math.PI*2);if(fill){c.fillStyle=fill;c.fill()}c.stroke()};
const plTx=(c,t,x,y,s,col)=>{c.font=`${s}px ${FONT}`;c.textAlign='center';c.textBaseline='middle';c.fillStyle=col;c.fillText(t,x,y)};
// Flecha al final de un eje: cabeza de dos trazos
function plFlecha(c,x1,y1,x2,y2,h){
  const a=Math.atan2(y2-y1,x2-x1);plLn(c,x1,y1,x2,y2);
  c.beginPath();c.moveTo(x2-h*Math.cos(a-.5),y2-h*Math.sin(a-.5));c.lineTo(x2,y2);c.lineTo(x2-h*Math.cos(a+.5),y2-h*Math.sin(a+.5));c.stroke();
}
// Rejilla de columnas × filas dentro de un rectángulo: líneas interiores suaves y borde fuerte
function plRejilla(b,x,y,w,h,cols,rows,fill){
  const c=b.ctx;
  if(fill){c.fillStyle=fill;c.fillRect(x,y,w,h)}
  plSet(c,b.soft,b.lw);
  for(let i=1;i<cols;i++)plLn(c,x+w*i/cols,y,x+w*i/cols,y+h);
  for(let j=1;j<rows;j++)plLn(c,x,y+h*j/rows,x+w,y+h*j/rows);
  plSet(c,b.line,b.lw*1.2);c.strokeRect(x,y,w,h);
}

/* --- Pautas nuevas --- */
fondo({id:'renglones',group:'pauta',order:6,label:'Renglones',opts:PAUTA_OPTS,def:pautaDef,paint:({y0,y1,k,soft,from,line})=>{ // una línea cada tanto
  const c=56*k;
  for(let y=from(y0,c);y<y1;y+=c)line(y,soft,1.4);
}});
fondo({id:'isometrico',group:'pauta',order:7,label:'Papel isométrico',opts:PAUTA_OPTS,def:pautaDef,paint:({ctx,x0,y0,x1,y1,k,lw,strong,from})=>{ // puntos en red de triángulos equiláteros
  const dx=44*k,dy=dx*Math.sqrt(3)/2;
  ctx.fillStyle=strong;
  for(let j=Math.floor(y0/dy)-1;j*dy<y1;j++){
    const y=j*dy,off=((j%2)+2)%2?dx/2:0;
    for(let x=from(x0,dx,off);x<x1;x+=dx){ctx.beginPath();ctx.arc(x,y,2*lw,0,7);ctx.fill()}
  }
}});
fondo({id:'milimetrado',group:'pauta',order:8,label:'Milimetrado',opts:PAUTA_OPTS,def:pautaDef,paint:({ctx,x0,y0,x1,y1,k,lw,dark,soft,strong})=>{ // líneas finas cada c, más marcadas cada 5 y cada 10
  const c=8*k,tenue=dark?'rgba(255,255,255,.12)':'rgba(30,80,160,.15)';
  const tipos=[[tenue,.7,i=>i%5!==0],[soft,1.1,i=>i%5===0&&i%10!==0],[strong,1.8,i=>i%10===0]];
  const ia=Math.floor(x0/c),ib=Math.ceil(x1/c),ja=Math.floor(y0/c),jb=Math.ceil(y1/c);
  const mod=(i,n)=>((i%n)+n)%n;
  for(const [col,wd,es] of tipos){
    ctx.beginPath();ctx.strokeStyle=col;ctx.lineWidth=wd*lw;
    for(let i=ia;i<=ib;i++)if(es(mod(i,10))){ctx.moveTo(i*c,y0);ctx.lineTo(i*c,y1)}
    for(let j=ja;j<=jb;j++)if(es(mod(j,10))){ctx.moveTo(x0,j*c);ctx.lineTo(x1,j*c)}
    ctx.stroke();
  }
}});

/* --- Plantillas --- */
const PL_OPTS_VENN=[['2','2 círculos'],['3','3 círculos']];
fondo({id:'venn',group:'plantilla',order:1,label:'Diagrama de Venn',opts:PL_OPTS_VENN,def:'2',paint:g=>{
  const b=plBase(g),c=b.ctx,L=g.L,m=b.m,bw=L.w-2*m,bh=L.h-2*m;
  let r,cs;
  if(g.opt==='3'){
    r=Math.min(bh/3.05,bw/3.3);const cy=L.h/2+r*.065;
    cs=[[L.w/2,cy-.58*r,'blue'],[L.w/2-.62*r,cy+.45*r,'red'],[L.w/2+.62*r,cy+.45*r,'green']];
  }else{
    r=Math.min(bh/2,bw/3.1);
    cs=[[L.w/2-.55*r,L.h/2,'blue'],[L.w/2+.55*r,L.h/2,'red']];
  }
  cs.forEach(([x,y,n])=>{c.beginPath();c.arc(x,y,r,0,Math.PI*2);c.fillStyle=b.tint(n,.16);c.fill()});
  cs.forEach(([x,y])=>{c.beginPath();c.arc(x,y,r,0,Math.PI*2);c.stroke()});
}});
const PL_OPTS_AJEDREZ=[['coord','8×8 con coordenadas'],['8','8×8 sin coordenadas'],['damas','Damas 10×10']];
fondo({id:'ajedrez',group:'plantilla',order:2,label:'Tablero de ajedrez',opts:PL_OPTS_AJEDREZ,def:'coord',paint:g=>{
  const b=plBase(g),c=b.ctx,L=g.L,m=b.m,n=g.opt==='damas'?10:8,co=g.opt==='coord',e=n+(co?1.3:0);
  const s=Math.min((L.w-2*m)/e,(L.h-2*m)/e),x0=(L.w-n*s)/2,y0=(L.h-n*s)/2;
  c.fillStyle=g.soft;
  for(let r=0;r<n;r++)for(let q=0;q<n;q++)if((r+q)%2===1)c.fillRect(x0+q*s,y0+r*s,s,s);
  c.strokeRect(x0,y0,n*s,n*s);
  if(co)for(let i=0;i<8;i++){
    plTx(c,'abcdefgh'[i],x0+(i+.5)*s,y0+n*s+s*.42,s*.38,b.line);
    plTx(c,String(8-i),x0-s*.42,y0+(i+.5)*s,s*.38,b.line);
  }
}});
const PL_OPTS_100=[['vacia','Vacía'],['fila','Con 1-10 escrita']];
fondo({id:'tabla100',group:'plantilla',order:3,label:'Tabla de 100',opts:PL_OPTS_100,def:'vacia',paint:g=>{
  const b=plBase(g),c=b.ctx,L=g.L,m=b.m,ch=(L.h-2*m)/10,cw=Math.min((L.w-2*m)/10,ch*1.5),x0=(L.w-10*cw)/2,y0=m;
  plRejilla(b,x0,y0,10*cw,10*ch,10,10);
  if(g.opt==='fila')for(let i=0;i<10;i++)plTx(c,String(i+1),x0+(i+.5)*cw,y0+ch/2,Math.min(cw,ch)*.45,b.line);
}});
const PL_OPTS_MARCO=[['1','Uno'],['2','Dos (hasta 20)']];
fondo({id:'marco10',group:'plantilla',order:4,label:'Marco de 10',opts:PL_OPTS_MARCO,def:'1',paint:g=>{
  const b=plBase(g),L=g.L,m=b.m,dos=g.opt==='2',gap=.5,filas=dos?4+gap:2;
  const s=Math.min((L.w-2*m)/5,(L.h-2*m)/filas),x0=(L.w-5*s)/2,y0=(L.h-filas*s)/2;
  for(let f=0;f<(dos?2:1);f++)plRejilla(b,x0,y0+f*(2+gap)*s,5*s,2*s,5,2);
}});
const PL_OPTS_PPT=[['circ','Círculos'],['barras','Barras']];
fondo({id:'ppt',group:'plantilla',order:5,label:'Parte-parte-todo',opts:PL_OPTS_PPT,def:'circ',paint:g=>{
  const b=plBase(g),c=b.ctx,L=g.L,m=b.m;
  if(g.opt==='barras'){ // modelo de barras: el todo arriba y las dos partes debajo
    const H=L.h-2*m,bh=Math.min(H*.24,L.w*.2),x0=m*1.5,w=L.w-3*m,y1=m+H*.12,y2=m+H*.62;
    c.strokeStyle=b.line;
    plRc(c,x0,y1,w,bh,b.tint('blue',.16));
    plRc(c,x0,y2,w/2,bh,b.tint('red',.14));
    plRc(c,x0+w/2,y2,w/2,bh,b.tint('green',.14));
    plSet(c,b.soft,b.lw);c.setLineDash([b.lw*3,b.lw*3]);plLn(c,x0,y1+bh,x0,y2);plLn(c,x0+w,y1+bh,x0+w,y2);plLn(c,x0+w/2,y1+bh,x0+w/2,y2);c.setLineDash([]);
  }else{
    const r=Math.min((L.h-2*m)*.22,(L.w-2*m)*.16),cx=L.w/2,y1=m+r,y2=L.h-m-r,dx=r*1.45;
    plSet(c,b.line,b.lw);plLn(c,cx,y1+r,cx-dx,y2-r);plLn(c,cx,y1+r,cx+dx,y2-r);
    for(const [x,y,n] of [[cx,y1,'blue'],[cx-dx,y2,'red'],[cx+dx,y2,'green']]){c.beginPath();c.arc(x,y,r,0,Math.PI*2);c.fillStyle=b.tint(n,.16);c.fill();c.stroke()}
  }
}});
const PL_OPTS_VALOR=[['du','D U'],['cdu','C D U'],['umcdu','UM C D U']];
fondo({id:'valorpos',group:'plantilla',order:6,label:'Valor posicional',opts:PL_OPTS_VALOR,def:'cdu',paint:g=>{
  const b=plBase(g),c=b.ctx,L=g.L,m=b.m;
  const cols={du:[['D','green'],['U','blue']],cdu:[['C','red'],['D','green'],['U','blue']],umcdu:[['UM','orange'],['C','red'],['D','green'],['U','blue']]}[g.opt]||[];
  const n=cols.length,cw=Math.min((L.w-2*m)/n,(L.h-2*m)*.6),hd=Math.min((L.h-2*m)*.16,cw*.5),x0=(L.w-n*cw)/2,y0=m,h=L.h-2*m;
  cols.forEach(([t,col],i)=>{
    c.fillStyle=b.tint(col,.07);c.fillRect(x0+i*cw,y0+hd,cw,h-hd);
    c.fillStyle=b.tint(col,.3);c.fillRect(x0+i*cw,y0,cw,hd);
  });
  plSet(c,b.soft,b.lw);for(let i=1;i<n;i++)plLn(c,x0+i*cw,y0,x0+i*cw,y0+h);plLn(c,x0,y0+hd,x0+n*cw,y0+hd);
  plSet(c,b.line,b.lw*1.2);c.strokeRect(x0,y0,n*cw,h);
  cols.forEach(([t],i)=>plTx(c,t,x0+(i+.5)*cw,y0+hd/2,hd*.5,b.line));
}});
const PL_OPTS_EJES=[['q1','Primer cuadrante'],['q4','Cuatro cuadrantes']];
fondo({id:'ejes',group:'plantilla',order:7,label:'Ejes de coordenadas',opts:PL_OPTS_EJES,def:'q1',paint:g=>{
  const b=plBase(g),c=b.ctx,L=g.L,m=b.m,q4=g.opt==='q4',N=q4?8:10,span=q4?2*N+1.8:N+1.2;
  const s=Math.min((L.w-2*m)/(q4?span:N+1.4),(L.h-2*m)/span);
  const ox=q4?L.w/2:(L.w-(N+1.1)*s)/2+.6*s,oy=q4?L.h/2:L.h/2+(N-.2)*s/2,a=q4?-N:0,fs=s*(q4?.32:.36);
  plSet(c,b.soft,b.lw*.8);
  for(let i=a;i<=N;i++){plLn(c,ox+i*s,oy-N*s,ox+i*s,oy-a*s);plLn(c,ox+a*s,oy-i*s,ox+N*s,oy-i*s)}
  plSet(c,b.line,b.lw*1.3);
  plFlecha(c,ox+a*s-(q4?.4*s:0),oy,ox+N*s+.5*s,oy,s*.25);
  plFlecha(c,ox,oy-a*s+(q4?.4*s:0),ox,oy-N*s-.5*s,s*.25);
  for(let i=a;i<=N;i++){
    if(i===0)continue;
    const t=(i<0?'−':'')+Math.abs(i);
    plTx(c,t,ox+i*s,oy+s*.4,fs,b.line);
    plTx(c,t,ox-s*(q4?.5:.4),oy-i*s,fs,b.line);
  }
  plTx(c,'0',ox-s*.3,oy+s*.38,fs,b.line);
}});
fondo({id:'grafbarras',group:'plantilla',order:8,label:'Gráfica de barras',paint:g=>{
  const b=plBase(g),c=b.ctx,L=g.L,m=b.m,x0=Math.max(m*2,L.w*.1),x1=L.w-m,y1=L.h-m*1.6,y0=m*1.4,N=10,pas=(y1-y0)/N,fs=Math.min(pas*.55,L.w*.03);
  plSet(c,b.soft,b.lw*.8);
  for(let i=1;i<=N;i++)plLn(c,x0,y1-i*pas,x1,y1-i*pas);
  plSet(c,b.line,b.lw*1.3);plLn(c,x0,y1,x1,y1);plLn(c,x0,y1,x0,y0-pas*.2);
  for(let i=0;i<=N;i++)plTx(c,String(i),x0-fs*.9,y1-i*pas,fs,b.line);
}});
const PL_OPTS_TABLA=[['2','2 columnas'],['3','3 columnas']];
fondo({id:'tablacol',group:'plantilla',order:9,label:'Tabla de columnas',opts:PL_OPTS_TABLA,def:'2',paint:g=>{
  const b=plBase(g),c=b.ctx,L=g.L,m=b.m,n=g.opt==='3'?3:2,rows=6,w=Math.min(L.w-2*m,n*(L.h-2*m)*.7),h=L.h-2*m,hd=h*.16,x0=(L.w-w)/2,y0=m;
  c.fillStyle=b.tint('blue',.18);c.fillRect(x0,y0,w,hd);
  plRejilla(b,x0,y0,w,h,n,1); // columnas y borde
  plSet(c,b.soft,b.lw);const rh=(h-hd)/rows;
  for(let j=0;j<rows;j++)plLn(c,x0,y0+hd+j*rh,x0+w,y0+hd+j*rh);
  plSet(c,b.line,b.lw*1.2);plLn(c,x0,y0+hd,x0+w,y0+hd);
}});
const PL_OPTS_VINETAS=[['3','3 viñetas'],['4','4 viñetas'],['6','6 viñetas']];
fondo({id:'vinetas',group:'plantilla',order:10,label:'Viñetas',opts:PL_OPTS_VINETAS,def:'4',paint:g=>{
  const b=plBase(g),c=b.ctx,L=g.L,m=b.m,n=({'3':3,'4':4,'6':6})[g.opt]||4,ancha=L.w>=L.h,gap=m*.6;
  const cols=n===6?(ancha?3:2):(ancha?n:1),rows=Math.ceil(n/cols);
  const cw=(L.w-2*m-gap*(cols-1))/cols;let ch=(L.h-2*m-gap*(rows-1))/rows;ch=Math.min(ch,cw*1.3);
  const y0=(L.h-(rows*ch+gap*(rows-1)))/2,r=Math.min(cw,ch)*.06,fs=Math.min(cw,ch)*.12;
  for(let i=0;i<n;i++){
    const x=m+(i%cols)*(cw+gap),y=y0+Math.floor(i/cols)*(ch+gap);
    plSet(c,b.line,b.lw);plRR(c,x,y,cw,ch,r,b.tint('blue',.05));
    c.beginPath();c.arc(x+fs*.9,y+fs*.9,fs*.62,0,Math.PI*2);c.fillStyle=b.tint('blue',.22);c.fill();plSet(c,b.soft,b.lw);c.stroke();
    plTx(c,String(i+1),x+fs*.9,y+fs*.9,fs*.8,b.line);
  }
}});
fondo({id:'dibescr',group:'plantilla',order:11,label:'Dibujo y escritura',paint:g=>{
  const b=plBase(g),c=b.ctx,L=g.L,m=b.m,x0=m,x1=L.w-m,top=L.h*.5;
  plSet(c,b.line,b.lw*1.2);plRR(c,x0,m,x1-x0,top-m,m*.4,b.tint('blue',.04));
  const y0=top+m*.6,bh=(L.h-m-y0)/3; // tres pautas de doble línea (como la pauta «doble línea»)
  for(let j=0;j<3;j++){
    const y=y0+j*bh;
    plSet(c,b.soft,b.lw);plLn(c,x0,y+bh*.138,x1,y+bh*.138);plLn(c,x0,y+bh*.83,x1,y+bh*.83);
    plSet(c,b.line,b.lw);plLn(c,x0,y+bh*.292,x1,y+bh*.292);plLn(c,x0,y+bh*.677,x1,y+bh*.677);
    plSet(c,b.soft,b.lw);c.setLineDash([b.lw*4,b.lw*4]);plLn(c,x0,y+bh*.485,x1,y+bh*.485);c.setLineDash([]);
  }
}});
fondo({id:'calendario',group:'plantilla',order:12,label:'Calendario',paint:g=>{
  const b=plBase(g),c=b.ctx,L=g.L,m=b.m,H=L.h-2*m,tb=H*.09,hd=H*.08,x0=m,w=L.w-2*m,yh=m+tb+H*.02,rh=(L.h-m-yh-hd)/6,cw=w/7;
  plSet(c,b.line,b.lw);plRR(c,x0,m,w,tb,tb*.25,b.tint('blue',.05)); // hueco para el nombre del mes
  c.fillStyle=b.tint('red',.07);c.fillRect(x0+5*cw,yh+hd,2*cw,6*rh); // sábado y domingo
  c.fillStyle=b.tint('blue',.22);c.fillRect(x0,yh,w,hd);
  plRejilla(b,x0,yh,w,hd+6*rh,7,1);
  plSet(c,b.soft,b.lw);for(let j=1;j<=6;j++)plLn(c,x0,yh+hd+(j-1)*rh,x0+w,yh+hd+(j-1)*rh);
  plSet(c,b.line,b.lw*1.2);plLn(c,x0,yh+hd,x0+w,yh+hd);
  'LMXJVSD'.split('').forEach((t,i)=>plTx(c,t,x0+(i+.5)*cw,yh+hd/2,hd*.55,b.line));
}});
fondo({id:'mapa',group:'plantilla',order:13,label:'Mapa de ideas',paint:g=>{
  const b=plBase(g),c=b.ctx,L=g.L,m=b.m,bw=L.w-2*m,bh=L.h-2*m,nrx=bw*.12,nry=Math.min(bh*.12,nrx*.7),crx=nrx*1.35,cry=nry*1.35;
  const Rx=bw/2-nrx,Ry=(bh/2-nry)/.866,cx=L.w/2,cy=L.h/2,nodos=[];
  for(let k=0;k<6;k++){const t=-Math.PI/2+(k+.5)*Math.PI/3;nodos.push([cx+Rx*Math.cos(t),cy+Ry*Math.sin(t),t])}
  plSet(c,b.line,b.lw);
  for(const [x,y,t] of nodos)plLn(c,cx+crx*Math.cos(t),cy+cry*Math.sin(t),x-nrx*Math.cos(t),y-nry*Math.sin(t));
  nodos.forEach(([x,y],i)=>plEl(c,x,y,nrx,nry,b.tint(['blue','red','green','orange','blue','red'][i],.12)));
  plEl(c,cx,cy,crx,cry,b.tint('orange',.2));
}});
