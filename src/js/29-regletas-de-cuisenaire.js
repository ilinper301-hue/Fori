/* ============ Regletas de Cuisenaire ============ */
const CU=40; // px por unidad (la regleta de 10 mide 400 px)
// [relleno, borde, color del número]
const CUIS=[null,['#f8f9fa','#adb5bd','#212529'],['#e03131','#a51d24','#fff'],['#69db7c','#2b8a3e','#1b3d22'],['#e64980','#a61e4d','#fff'],['#fcc419','#c49000','#3a2a0e'],['#2b8a3e','#1b5e2a','#fff'],['#343a40','#000','#fff'],['#8d5524','#5c3612','#fff'],['#1e6fe0','#124a9c','#fff'],['#f76707','#b84a00','#fff']];
const CUIS_NAMES=['','blanca','roja','verde clara','rosa','amarilla','verde oscura','negra','marrón','azul','naranja'];
function cuisSVG(n,vert){
  const [f,s,t]=CUIS[n],L=n*CU,W=vert?CU:L,H=vert?L:CU;
  let marks='';
  if(S.cuisMarks)for(let i=1;i<n;i++)marks+=vert?`<line x1="3" x2="${CU-3}" y1="${i*CU}" y2="${i*CU}"/>`:`<line y1="3" y2="${CU-3}" x1="${i*CU}" x2="${i*CU}"/>`;
  const num=S.cuisNum!==false?`<text x="${W/2}" y="${H/2}" text-anchor="middle" dominant-baseline="central" font-size="22" font-weight="800" fill="${t}">${n}</text>`:'';
  return `<svg width="${W}" height="${H}" viewBox="0 0 ${W} ${H}"><rect x="1" y="1" width="${W-2}" height="${H-2}" rx="5" fill="${f}" stroke="${s}" stroke-width="2"/><g stroke="${s}" stroke-opacity=".5" stroke-width="1.5">${marks}</g>${num}</svg>`;
}
for(let n=1;n<=10;n++)KINDS['q'+n]={w:n*CU,h:CU,g:'cuis',v:n,rot:true,get svg(){return cuisSVG(n,false)}};
// Doble toque: girar la regleta (horizontal ↔ vertical)
function rotatePiece(el){const v=el.dataset.v!=='1';el.dataset.v=v?'1':'0';el.innerHTML=cuisSVG(KINDS[el.dataset.k].v,v)}
function refreshCuis(){pieces(null,'cuis').forEach(p=>p.innerHTML=cuisSVG(KINDS[p.dataset.k].v,p.dataset.v==='1'))}
let cuisui=null;
function updateCuis(){if(cuisui)cuisui.textContent=String(pieces(null,'cuis').reduce((s,p)=>s+KINDS[p.dataset.k].v,0))}
function cuisClear(){pieces(null,'cuis').forEach(p=>p.remove());updateCuis()}
function cuisStairs(){ // de menor a mayor, alineadas a la izquierda
  const list=pieces(null,'cuis').sort((a,b)=>KINDS[a.dataset.k].v-KINDS[b.dataset.k].v);
  const rows=Math.max(1,Math.floor((stage.clientHeight-20)/(CU+6)));
  list.forEach((p,i)=>{
    p.dataset.v='0';p.innerHTML=cuisSVG(KINDS[p.dataset.k].v,false);p.classList.add('anim');
    p.style.left=(20+Math.floor(i/rows)*(10*CU+20))+'px';p.style.top=(10+(i%rows)*(CU+6))+'px';
  });
  setTimeout(()=>list.forEach(p=>p.classList.remove('anim')),400);
}
function mCuis(body){
  const sum=h('b',{style:'font-size:28px;color:var(--accent)'},'0');cuisui=sum;
  const tg=(lbl,key,def)=>{const on=()=>S[key]!==undefined?S[key]:def;const b=h('button',{class:'btn ghost tog'+(on()?' on':''),onclick:()=>{S[key]=!on();save();b.classList.toggle('on',on());refreshCuis()}},lbl);return b};
  body.append(
    h('div',{class:'cuisgrid'},...Array.from({length:10},(_,i)=>{const n=i+1;
      return h('button',{class:'cuisb','aria-label':`Regleta ${CUIS_NAMES[n]} (${n})`,onclick:()=>addNew('q'+n)},
        h('i',{style:`width:${n*24}px;background:${CUIS[n][0]};border-color:${CUIS[n][1]}`}),h('span',{},String(n)))})),
    h('div',{class:'row c',style:'margin-top:12px'},tg('Números','cuisNum',true),tg('Marcar unidades','cuisMarks',false),
      h('button',{class:'btn ghost',onclick:cuisStairs},...ib('stairs','Escalera')),h('button',{class:'btn ghost',onclick:cuisClear},...ib('trash','Vaciar'))),
    h('div',{class:'muted',style:'margin-top:12px'},'Suma de las regletas en la pizarra: ',sum),
    h('p',{class:'muted',style:'font-size:15px;margin:8px 0 0'},'Arrastra las regletas · Toca dos veces para girarlas · Llévalas a la papelera para quitarlas'));
  updateCuis();
  return()=>{cuisui=null};
}

