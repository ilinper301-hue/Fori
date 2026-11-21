/* ============ Pintar encima de otras apps (Fori para Android) ============ */
// La APK (android/, CapaService.kt) pone encima de cualquier app una ventana transparente con esta misma Fori en ?capa=1
// y una burbuja flotante. En ese «modo capa» la pizarra es una hoja vacía en memoria: no se lee ni se guarda nada
// (CAPA está en 02-datos-persistentes.js; save() no hace nada y loadBoard() no se llama, así que IndexedDB ni se abre).
// La capa habla con la app por window.ForiAndroid.capa(orden): 'debajo' (tocar la app de debajo), 'ocultar', 'cerrar'.
// La app le habla por window.__foriCapa(orden): 'pintar' (vuelve de «Tocar debajo»), 'debajo', 'borrar'.
// En Fori normal, en Android, el botón «Pintar encima» (pulsación larga) abre la capa de la APK.
const APK_URL='https://github.com/ilinper301-hue/fori/releases/latest/download/Fori.apk';
const UA_ANDROID=/Android/i.test(navigator.userAgent),UA_APK=/ForiAndroid\//.test(navigator.userAgent);
const capaApp=o=>{try{const a=window.ForiAndroid;if(a&&typeof a.capa==='function'){a.capa(o);return true}}catch{}return false};
const capaInfo={intent:null}; // para las pruebas: última dirección intent:// usada

if(CAPA){
  const KEY_CAPA='fori-capa'; // último color, grosor y sitio de la barra (no es la pizarra ni los ajustes de Fori)
  let mem={};try{mem=JSON.parse(localStorage.getItem(KEY_CAPA))||{}}catch{}
  const memSave=()=>{try{localStorage.setItem(KEY_CAPA,JSON.stringify({color:T.color,size:T.size,tool:T.tool,arriba:bar.classList.contains('arriba')}))}catch{}};
  const COLORES=[['#e03131','Rojo'],['#1e6fe0','Azul'],['#2f9e44','Verde'],['#f08c00','Naranja'],['#fcc419','Amarillo'],['#7048e8','Morado'],['#111111','Negro'],['#ffffff','Blanco']];
  const GROSORES=[[3,'Fino',8],[6,'Medio',14],[12,'Grueso',22]];
  document.documentElement.classList.add('ov','capa');document.body.classList.add('v-overlay','v-capa');
  T.tool=['pen','marker','eraser'].includes(mem.tool)?mem.tool:'pen';
  T.color=COLORES.some(c=>c[0]===mem.color)?mem.color:'#e03131'; // el color «tinta» (negro o blanco según el tema) no se vería según lo que haya debajo
  T.size=GROSORES.some(g=>g[0]===mem.size)?mem.size:6;
  const btn=(cls,label,kids,fn,extra={})=>h('button',{type:'button',class:cls,'aria-label':label,title:label,onclick:fn,...extra},kids);
  const herr=(t,ic,label)=>btn('cb-t',label,ico(ic),()=>{commitEditor();T.tool=t;pinta();memSave()},{'data-ct':t});
  let cerrarT=0;
  const bar=h('div',{id:'capaBar',role:'toolbar','aria-label':'Pintar encima'},
    btn('cb-grip','Mover la barra arriba o abajo',ico('grip'),()=>{bar.classList.toggle('arriba');memSave()}),
    h('div',{class:'cb-g'},herr('pen','pen','Lápiz'),herr('marker','marker','Fluorescente'),herr('eraser','eraser','Borrador')),
    h('div',{class:'cb-g cb-col'},COLORES.map(([c,n])=>btn('cb-c',n,h('i',{style:`background:${c}`}),()=>{T.color=c;if(T.tool==='eraser')T.tool='pen';pinta();memSave()},{'data-cc':c}))),
    h('div',{class:'cb-g'},GROSORES.map(([s,n,d])=>btn('cb-s',n,h('i',{style:`width:${d}px;height:${d}px`}),()=>{T.size=s;if(T.tool==='eraser')T.tool='pen';pinta();memSave()},{'data-cs':s}))),
    h('div',{class:'cb-g'},
      btn('cb-a','Deshacer',ico('undo'),()=>undo(),{id:'capaUndo'}),
      btn('cb-a','Borrar todo',ico('trash'),()=>{clearBoard()},{id:'capaClear'})),
    h('div',{class:'cb-g'},
      btn('cb-a cb-txt','Tocar la app de debajo sin perder lo pintado',[ico('hand'),h('span',{class:'cb-l'},'Tocar debajo')],()=>capaDebajo(true),{id:'capaUnder'}),
      btn('cb-a','Ocultar lo pintado (la burbuja lo vuelve a mostrar)',ico('eye'),()=>{if(!capaApp('ocultar'))toast('Solo en Fori para Android')},{id:'capaHide'}),
      btn('cb-a cb-x','Cerrar',ico('x'),()=>{
        if(P().strokes.length&&Date.now()-cerrarT>3000){cerrarT=Date.now();toast('Toca otra vez ✕ para cerrar: se borra lo pintado');return}
        if(!capaApp('cerrar'))toast('Solo en Fori para Android');
      },{id:'capaClose'})));
  if(mem.arriba)bar.classList.add('arriba');
  function pinta(){
    $$('[data-ct]',bar).forEach(b=>b.classList.toggle('on',b.dataset.ct===T.tool));
    $$('[data-cc]',bar).forEach(b=>b.classList.toggle('on',T.tool!=='eraser'&&b.dataset.cc===T.color));
    $$('[data-cs]',bar).forEach(b=>b.classList.toggle('on',T.tool!=='eraser'&&Number(b.dataset.cs)===T.size));
    dr.style.cursor='crosshair';
  }
  // «Tocar debajo»: la app deja pasar los toques a la app de debajo; lo pintado se sigue viendo y la burbuja trae de vuelta la barra
  function capaDebajo(on){
    commitEditor();
    document.body.classList.toggle('capa-debajo',on);
    if(on&&!capaApp('debajo')){document.body.classList.remove('capa-debajo');toast('Solo en Fori para Android')}
  }
  window.__foriCapa=o=>{
    if(o==='pintar')capaDebajo(false);
    else if(o==='debajo')document.body.classList.add('capa-debajo');
    else if(o==='borrar'){P().strokes.length=0;P().undo.length=0;P().redo.length=0;redraw();drawLive()}
  };
  document.body.append(bar);
  refreshTools();pinta();
}

/* --- Botón «Pintar encima» (solo en Android: en la APK abre la capa; en Chrome, la APK si está instalada) --- */
function capaAviso(viejo){
  const d=h('dialog',{class:'capadlg','aria-label':'Pintar encima de otras apps'},
    h('h2',{},ib('overlay','Pintar encima de otras apps')),
    h('p',{},viejo?'Tu app Fori para Android es de una versión anterior. Descarga la nueva e instálala encima: no se pierde nada de lo guardado.'
      :'Para pintar encima de otras apps hace falta la app Fori para Android. Descárgala, instálala y ábrela; luego mantén pulsado «Pintar encima» dentro de la app.'),
    h('div',{class:'capadlg-b'},
      h('a',{class:'btn',href:APK_URL,onclick:()=>setTimeout(()=>d.close(),300)},ib('download','Descargar Fori.apk')),
      h('button',{type:'button',class:'btn ghost',onclick:()=>d.close()},'Ahora no')));
  d.addEventListener('close',()=>d.remove());
  document.body.append(d);d.showModal();
}
function pintarEncima(){
  commitEditor();boardFlush();
  if(UA_APK){
    const a=window.ForiAndroid;
    if(a&&typeof a.abrirCapa==='function'){try{a.abrirCapa()}catch{}}else capaAviso(true);
    return;
  }
  // Chrome de Android: abre la APK; si no está instalada, Chrome vuelve a Fori con ?sinapk=1 (y se explica cómo conseguirla)
  const back=location.origin+location.pathname+'?sinapk=1';
  capaInfo.intent=`intent://capa#Intent;scheme=fori;package=es.fori.pizarra;S.browser_fallback_url=${encodeURIComponent(back)};end`;
  location.href=capaInfo.intent;
}
if(UA_ANDROID&&!CAPA&&!DESK){
  const b=h('button',{class:'mini',id:'btnCapa','aria-label':'Pintar encima',title:'Pintar encima de otras apps (mantén pulsado)'},ico('overlay'));
  // se activa al soltar tras mantener pulsado: Chrome solo deja abrir otra app justo después de un toque
  let t=null,listo=false;
  b.addEventListener('pointerdown',()=>{listo=false;b.classList.add('holding');t=setTimeout(()=>{listo=true;b.classList.remove('holding');b.classList.add('ready')},500)});
  const cancel=()=>{clearTimeout(t);b.classList.remove('holding','ready')};
  b.addEventListener('pointerup',()=>{const ok=listo;cancel();listo=false;if(ok)pintarEncima();else toast('Mantén pulsado para pintar encima de otras apps')});
  b.addEventListener('pointerleave',()=>{cancel();listo=false});b.addEventListener('pointercancel',()=>{cancel();listo=false});
  const fs=$('#btnFs');if(fs)fs.before(b);
}
if(!CAPA&&new URLSearchParams(location.search).get('sinapk')==='1'){
  history.replaceState(null,'',location.pathname);
  capaAviso(false);
}
window.__fori.capa=capaInfo;
