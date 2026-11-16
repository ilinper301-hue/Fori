/* ============ Pantallas pequeñas: la interfaz se coloca sola según lo que cabe ============ */
// <body data-lay="…"> decide la colocación (los estilos están en extra-pantallas.css):
//   d0  todo, como en la PDI
//   d1  falta algo de alto: los tres grosores pasan a un solo botón y se ven 4 colores recientes
//   d2  falta más: 2 colores recientes
//   d3  falta más aún: además, la barra izquierda va sin rótulos
//   c   compacta (menos de 900 px de ancho, o ni así cabe): barra izquierda estrecha, sin barra derecha, barra de abajo solo con iconos
//   p   móvil en vertical: las herramientas de dibujo van en una franja abajo y la pizarra ocupa todo el ancho
// Las medidas se dividen por el «Tamaño de botones» (--ui): con botones más grandes cabe menos.
function layout(){
  const b=document.body,left=$('#left');
  if(!left.children.length)return; // todavía no se ha montado la interfaz
  if((S.view||'full')!=='full'){delete b.dataset.lay;return} // en los modos Mínima y Libre no hay barras
  const ui=S.ui||1,W=innerWidth/ui,H=innerHeight/ui;
  let lay='c';
  if(W>=900)for(const d of ['d0','d1','d2','d3']){b.dataset.lay=d;if(left.scrollHeight<=left.clientHeight+1){lay=d;break}}
  if(lay==='c'){
    if(W<600&&H>W)lay='p';
    else{ // barra izquierda de casillas iguales: tantas columnas como hagan falta para que no haya que deslizar
      const rows=Math.max(1,Math.floor((H-46-60-8+4)/50)),norec=rows<12; // 10 casillas fijas + 2 colores recientes si caben en una columna
      b.classList.toggle('norec',norec);
      b.style.setProperty('--lc',String(Math.ceil((norec?10:12)/rows)));
    }
  }
  b.dataset.lay=lay;
  buildRight();fitDock();
}
// Barra de abajo: si no cabe todo, primero pierden el texto los botones de la bandeja y después todos
function fitDock(){
  const d=$('#dock');if(!d||!d.children.length)return;
  d.classList.remove('dk1','dk2');
  if(d.scrollWidth>d.clientWidth+1){d.classList.add('dk1');if(d.scrollWidth>d.clientWidth+1)d.classList.add('dk2')}
}
addEventListener('resize',layout);
