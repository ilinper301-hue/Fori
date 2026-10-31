/* ============ Pizarra dividida en zonas ============ */
// Cada zona tiene su propio color y su goma, para que salgan varios alumnos a la vez.
// Lo que se dibuja en una zona no puede salirse de ella.
const ZONE_COLORS=['ink','#1e6fe0','#e03131','#2f9e44','#f08c00','#7048e8'];
const ZN={n:Math.min(3,Math.max(1,S.zoneN|0||1)),z:[]};
for(let i=0;i<3;i++)ZN.z.push({color:['ink','#1e6fe0','#e03131'][i],eraser:false});
const zoneLayer=h('div',{class:'zones'});
stage.append(zoneLayer);
function zoneAt(x){if(ZN.n<2)return -1;return clamp(Math.floor(x/(stage.clientWidth/ZN.n)),0,ZN.n-1)}
function zoneRange(i){const w=stage.clientWidth/ZN.n;return[i*w,(i+1)*w]}
function drawZoneLines(ctx,w,hh){
  if(ZN.n<2)return;
  ctx.save();ctx.setLineDash([14,10]);ctx.lineWidth=3;ctx.strokeStyle=document.documentElement.dataset.theme==='dark'?'rgba(255,255,255,.35)':'rgba(19,33,74,.3)';
  for(let i=1;i<ZN.n;i++){const x=Math.round(w*i/ZN.n)+.5;ctx.beginPath();ctx.moveTo(x,0);ctx.lineTo(x,hh);ctx.stroke()}
  ctx.restore();
}
function clearZone(i){
  const [x0,x1]=zoneRange(i);
  const list=P().strokes.filter(s=>{if(s.type==='img')return false;const b=bbox(s),cx=b.x+b.w/2;return cx>=x0&&cx<x1});
  if(list.length)doOp({t:'multi',ops:list.map(s=>({t:'del',s,i:P().strokes.indexOf(s)}))});
}
function renderZoneBars(){
  zoneLayer.replaceChildren();
  zoneLayer.style.display=ZN.n>1?'block':'none';
  if(ZN.n<2)return;
  for(let i=0;i<ZN.n;i++){
    const z=ZN.z[i];
    const bar=h('div',{class:'zonebar',style:`left:${(i+.5)/ZN.n*100}%`},
      h('span',{class:'zn'},String(i+1)),
      ...ZONE_COLORS.slice(0,4).map(c=>h('button',{class:'zsw'+(!z.eraser&&z.color===c?' on':''),'aria-label':'Color',style:`background:${cssColor(c)}`,onclick:()=>{z.color=c;z.eraser=false;renderZoneBars()}})),
      h('button',{class:'zb'+(z.eraser?' on':''),'aria-label':'Goma',title:'Goma',onclick:()=>{z.eraser=!z.eraser;renderZoneBars()}},ico('eraser')),
      h('button',{class:'zb','aria-label':'Borrar esta zona',title:'Borrar esta zona',onclick:()=>clearZone(i)},ico('trash')));
    zoneLayer.append(bar);
  }
}
function setZones(n){ZN.n=n;S.zoneN=n;save();setSel(null);renderZoneBars();drawBg()}
renderZoneBars();

