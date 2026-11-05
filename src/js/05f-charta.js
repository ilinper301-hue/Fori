/* ============ Fichas de Charta: un ejercicio por página y la solución paso a paso ============ */
// Charta (mismo dominio, /Charta/) deja las diapositivas en localStorage «charta:aFori» y abre Fori con ?charta=1:
//   {v:1, app:'charta', titulo, diapositivas:[{etq, svg, n}]}  (sin nombres de alumnos)
// Cada diapositiva pasa a ser una página: la ficha de fondo (page.ch = {svg, n, k}) y la tinta encima (anotaciones).
// En el svg, cada paso de la solución lleva class="cs pK" y el <style> el marcador /*PASOS*/: se muestran k de n pasos.
// ?ficha=ID o ?comp=… → se pide a Charta, que abre la ficha y la devuelve con ?charta=1.
const CH_KEY='charta:aFori',CH_URL='../Charta/';
const chCss=(k,n)=>k>=n?'':'.cs{visibility:hidden}'+(k>0?Array.from({length:k},(_,i)=>'.p'+i).join(',')+'{visibility:visible}':'');
// (paréntesis y comillas escapados: la imagen va en url(...) de CSS)
const chImg=ch=>'data:image/svg+xml;charset=utf-8,'+encodeURIComponent(ch.svg.replace('/*PASOS*/',chCss(ch.k,ch.n))).replace(/[()']/g,c=>'%'+c.charCodeAt(0).toString(16).toUpperCase());
const chValid=ch=>!!ch&&typeof ch.svg==='string'&&/^<svg[\s>]/.test(ch.svg)&&ch.svg.length<2e6&&ch.svg.includes('/*PASOS*/')
  &&Number.isInteger(ch.n)&&ch.n>=0&&ch.n<1000&&Number.isInteger(ch.k)&&ch.k>=0&&ch.k<=ch.n;
const chClean=ch=>chValid(ch)?{svg:ch.svg,n:ch.n,k:ch.k}:null; // para guardar y para leer lecciones

// Barra «Solución» (solo en páginas de Charta con algo que corregir)
var chBarEl=null;
function chSet(k){
  const p=P();if(!p.ch)return;
  p.ch.k=clamp(k,0,p.ch.n);p.img=chImg(p.ch);drawBg();persist();chBar();
}
function chBar(){
  if(!chBarEl){
    const b=(lb,title,fn)=>h('button',{type:'button',title,'aria-label':title,onclick:fn},lb);
    chBarEl=h('div',{id:'chbar',role:'toolbar','aria-label':'Solución de la ficha'},
      h('span',{class:'ch-t'},'Solución'),
      b('−','Ocultar el último paso',()=>chSet(P().ch.k-1)),
      h('span',{class:'ch-n'}),
      b('+','Mostrar el paso siguiente',()=>chSet(P().ch.k+1)),
      h('button',{type:'button',class:'ch-all',onclick:()=>chSet(P().ch.k>=P().ch.n?0:P().ch.n)}));
    stage.append(chBarEl);
  }
  const ch=P()&&P().ch,on=!!(ch&&ch.n);
  chBarEl.hidden=!on;if(!on)return;
  chBarEl.querySelector('.ch-n').textContent=`${ch.k}/${ch.n}`;
  const [menos,mas]=chBarEl.querySelectorAll('button');menos.disabled=ch.k<=0;mas.disabled=ch.k>=ch.n;
  chBarEl.querySelector('.ch-all').textContent=ch.k>=ch.n?'Ocultar':'Todo';
}

// Entrada desde Charta (se llama al arrancar, después de cargar la pizarra)
function chEntrada(){
  const q=new URLSearchParams(location.search);
  if(q.get('ficha')||q.get('comp')){
    const r=new URLSearchParams();for(const k of ['ficha','comp'])if(q.get(k))r.set(k,q.get(k).slice(0,8000));r.set('a','fori');
    location.replace(CH_URL+'?'+r);return;
  }
  if(q.get('charta')!=='1')return;
  history.replaceState(null,'',location.pathname);
  let d=null;try{d=JSON.parse(localStorage.getItem(CH_KEY))}catch{}
  try{localStorage.removeItem(CH_KEY)}catch{}
  const ds=d&&d.v===1&&d.app==='charta'&&Array.isArray(d.diapositivas)?d.diapositivas.map(x=>x&&chClean({svg:x.svg,n:x.n,k:0})).filter(Boolean):[];
  if(!ds.length){toast('No ha llegado ninguna ficha de Charta. Vuelve a pulsar «Proyectar en Fori» en Charta.');return}
  commitEditor();
  const list=ds.map(ch=>{const pg=newPage('plain');pg.ch=ch;pg.img=chImg(ch);return pg});
  const vacia=pages.length===1&&!pages[0].strokes.length&&!pages[0].img;
  const at=vacia?0:cur+1;
  if(vacia)pages=list;else pages.splice(at,0,...list);
  gotoPage(at);
  const t=typeof d.titulo==='string'?d.titulo.slice(0,80):'Ficha';
  toast(`«${t}»: ${list.length===1?'1 página':list.length+' páginas'}. Escribe encima y corrige con «Solución» (+).`);
}
