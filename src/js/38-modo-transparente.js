/* ============ Modo transparente (solo en Fori Escritorio) ============ */
// Fori Escritorio (carpeta desktop/) abre dos ventanas sin marco y siempre visibles: una transparente a pantalla
// completa donde se pinta (esta misma app con ?overlay=1) y otra pequeña con la barra de herramientas, que se mueve libremente.
const OVERLAY=new URLSearchParams(location.search).get('overlay')==='1';
const DESK=window.foriDesktop||null;
if(DESK&&!OVERLAY){ // ventana normal: botón arriba, con pulsación larga como los demás controles delicados
  const b=h('button',{class:'mini',id:'btnGlass','aria-label':'Modo transparente',title:'Modo transparente: pintar sobre el escritorio (mantén pulsado)'},ico('overlay'));
  let t=null,fired=false;
  b.addEventListener('pointerdown',()=>{fired=false;b.classList.add('holding');t=setTimeout(()=>{fired=true;b.classList.remove('holding');DESK.openOverlay()},500)});
  const cancel=()=>{clearTimeout(t);b.classList.remove('holding')};
  b.addEventListener('pointerup',()=>{cancel();if(!fired)toast('Mantén pulsado para pintar sobre el escritorio')});
  b.addEventListener('pointerleave',cancel);b.addEventListener('pointercancel',cancel);
  const fs=$('#btnFs');if(fs)fs.before(b);
}
if(OVERLAY){
  document.documentElement.classList.add('ov');document.body.classList.add('v-overlay');
  document.head.append(h('style',{},`
    html.ov,html.ov body{background:transparent!important}
    body.v-overlay::before,body.v-overlay #top,body.v-overlay #left,body.v-overlay #right,body.v-overlay #dock,
    body.v-overlay #bg,body.v-overlay #bgimg,body.v-overlay .zones,body.v-overlay #cornerBtn,body.v-overlay #mini{display:none!important}
    body.v-overlay #app{grid-template-columns:0 1fr 0!important;grid-template-rows:0 1fr 0!important}
    body.v-overlay #stage{background:transparent!important;box-shadow:none!important;border-radius:0!important;border:0!important}`));
  T.tool='pen';T.color='#e03131';T.size=6; // el color «tinta» (negro) no se vería sobre fondos oscuros
  refreshTools();
  if(DESK){
    DESK.onCommand(c=>{
      switch(c.t){
        case 'tool':commitEditor();T.tool=c.v;refreshTools();break;
        case 'color':setColor(c.v);break;
        case 'size':T.size=c.v;break;
        case 'undo':undo();break;
        case 'redo':redo();break;
        case 'clear':clearBoard();break;
      }
    });
    document.addEventListener('keydown',e=>{if(e.key==='Escape')DESK.closeOverlay()});
  }
}
