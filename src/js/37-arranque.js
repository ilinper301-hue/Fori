/* ============ Pantalla completa, tema, tamaño y arranque ============ */
$('#btnFs').onclick=()=>{
  if(document.fullscreenElement)document.exitFullscreen();
  else (document.documentElement.requestFullscreen||document.documentElement.webkitRequestFullscreen||(()=>toast('Este navegador no permite pantalla completa')))
    .call(document.documentElement);
};
function applyTheme(){
  document.documentElement.dataset.theme=S.theme;
  $('meta[name=theme-color]').content=S.theme==='dark'?'#0B1430':'#13214A';
  drawBg();redraw();
}
function applyUi(){document.documentElement.style.setProperty('--ui',String(S.ui||1))}
let wl=null;
async function lock(){try{wl=await navigator.wakeLock.request('screen')}catch{}}
document.addEventListener('pointerdown',()=>{if(!wl)lock()},{once:true});
document.addEventListener('visibilitychange',()=>{if(document.visibilityState==='visible')lock()});
document.addEventListener('contextmenu',e=>{if(!e.target.closest('textarea,input,[contenteditable]'))e.preventDefault()});
document.addEventListener('gesturestart',e=>e.preventDefault());
// tocar fuera cierra el menú; si el toque cae en la pizarra, no se dibuja nada
document.addEventListener('pointerdown',e=>{if(pop.style.display==='grid'&&!e.target.closest('#pop,[data-pop]')){closePop();if(e.target===dr)e.stopPropagation()}},true);
document.addEventListener('keydown',e=>{if(e.key==='Escape'){closePop();if(sp.on)toggleSpot(false);else if(S.view==='clean')setView('full');setSel(null)}});
window.addEventListener('pagehide',()=>{commitEditor();clearTimeout(persistT);DB.set('board',boardData())});

$('#btnSettings').replaceChildren(ico('settings'));$('#btnView').replaceChildren(ico('view'));$('#btnFs').replaceChildren(ico('full'));$('#cornerBtn').replaceChildren(ico('view'));
applyUi();
buildLeft();buildRight();buildDock();renderClassChip();
if(typeof renderModeChip==='function')renderModeChip();
document.documentElement.dataset.theme=S.theme;
new ResizeObserver(fit).observe(stage);
fit();tickClock();setInterval(tickClock,1000);
setView(S.view||'full');
renderZoneBars();
if(document.fonts&&document.fonts.load)document.fonts.load("600 48px Fredoka").then(()=>redraw()).catch(()=>{});
loadBoard().then(chEntrada);
window.__foriOK=true; // arranque correcto
if(location.protocol.startsWith('http')&&'serviceWorker' in navigator)navigator.serviceWorker.register('sw.js').catch(()=>{});
