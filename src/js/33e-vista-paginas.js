/* ============ Vista de todas las páginas ============
   Menú Página → «Ver todas las páginas»: capa a pantalla completa con una miniatura de cada página.
   Tocar una miniatura lleva a esa página; la papelera la borra (con Deshacer en el aviso de abajo).
   Las miniaturas se pintan con renderPage, una a una, para que la lista salga enseguida aunque haya muchas. */
let pvEl=null,pvGen=0;
function closePagesView(){if(!pvEl)return;pvEl.remove();pvEl=null;pvGen++;document.removeEventListener('keydown',pvKey,true)}
function pvKey(e){if(e.key==='Escape'&&pvEl){e.stopPropagation();closePagesView()}}
function openPagesView(){
  commitEditor();closePop();
  if(!pvEl){
    pvEl=h('div',{id:'pagesView',role:'dialog','aria-label':'Todas las páginas'});
    document.body.append(pvEl);document.addEventListener('keydown',pvKey,true);
  }
  renderPagesView();
}
function renderPagesView(){
  if(!pvEl)return;
  const gen=++pvGen,W=stage.clientWidth||1,H=stage.clientHeight||1;
  const tiles=pages.map((p,i)=>{
    const box=h('div',{class:'pv-img',style:`aspect-ratio:${W}/${H}`});
    const del=h('button',{class:'pv-del','aria-label':`Borrar la página ${i+1}`,title:'Borrar esta página',onclick:e=>{e.stopPropagation();deletePageAt(i,renderPagesView)}},ico('trash'));
    const t=h('div',{class:'pv-t'+(i===cur?' on':''),'data-i':i},
      h('button',{class:'pv-go','aria-label':`Ir a la página ${i+1}`,onclick:()=>{closePagesView();gotoPage(i)}},box,h('span',{class:'pv-n'},String(i+1))),
      del);
    return{t,box,p};
  });
  pvEl.replaceChildren(
    h('div',{class:'pv-top'},
      h('h2',{},ico('pages'),`Páginas (${pages.length})`),
      h('span',{class:'pv-hint'},'Toca una página para ir a ella'),
      h('button',{class:'btn pv-new',onclick:()=>{closePagesView();cur=pages.length-1;addPage(false)}},...ib('plus','Página nueva')),
      h('button',{class:'pv-x','aria-label':'Cerrar',title:'Cerrar',onclick:closePagesView},ico('x'))),
    h('div',{class:'pv-grid'},...tiles.map(x=>x.t)));
  const cur0=tiles[cur];if(cur0)cur0.t.scrollIntoView({block:'nearest'});
  // miniaturas, una a una (si se vuelve a pintar la vista mientras tanto, se deja de pintar la anterior)
  (async()=>{
    const tw=Math.min(360,Math.max(160,tiles[0]?tiles[0].box.clientWidth:240)),sc=Math.min(1,tw*(devicePixelRatio||1)/W);
    for(const x of tiles){
      if(gen!==pvGen)return;
      try{const c=await renderPage(x.p,sc);if(gen!==pvGen)return;c.className='pv-c';x.box.replaceChildren(c)}catch{}
      await new Promise(r=>setTimeout(r,0));
    }
  })();
}
