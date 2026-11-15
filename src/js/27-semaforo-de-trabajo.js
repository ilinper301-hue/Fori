/* ============ Semáforo de trabajo ============ */
const SEMA=[['silencio','🤫','Silencio','#d9363e','#fff','Trabajo individual'],['susurro','🤭','Susurro','#f08c00','#1b1f24','Trabajo en parejas'],
  ['vozbaja','💬','Voz baja','#2b8a3e','#fff','Trabajo en grupo'],['escuchamos','👂','Escuchamos','#1e6fe0','#fff','Atención a quien habla']];
const semaCur=()=>SEMA.find(x=>x[0]===S.semaforo);
function renderModeChip(){
  const c=$('#modeChip');if(!c)return;
  const m=semaCur();
  if(!m){c.style.display='none';return}
  c.style.cssText=`display:inline-flex;background:${m[3]};color:${m[4]}`;
  c.textContent=`${m[1]} ${m[2]}`;c.setAttribute('role','button');c.tabIndex=0;c.setAttribute('aria-label','Semáforo de trabajo: '+m[2]);
}
const chipOpen=()=>openTool('sema');
document.addEventListener('click',e=>{if(e.target.closest('#modeChip'))chipOpen()});
document.addEventListener('keydown',e=>{if((e.key==='Enter'||e.key===' ')&&e.target.id==='modeChip'){e.preventDefault();chipOpen()}});
function mSemaforo(body){
  const circle=h('div',{class:'as-sc'}),name=h('div',{class:'as-sn'}),desc=h('div',{class:'as-sd'});
  const btns=SEMA.map(m=>h('button',{class:'as-sb','data-k':m[0],style:`--c:${m[3]};--t:${m[4]}`,onclick:()=>set(m[0])},h('span',{},m[1]),m[2]));
  function set(k){S.semaforo=S.semaforo===k?'':k;save();draw();renderModeChip()}
  function draw(){
    const m=semaCur();
    circle.style.cssText=m?`background:${m[3]};box-shadow:0 0 0 10px color-mix(in srgb,${m[3]} 30%,transparent)`:'background:var(--chrome)';
    circle.replaceChildren(m?m[1]:ico('traffic'));name.textContent=m?m[2]:'Apagado';desc.textContent=m?m[5]:'Elige un modo de trabajo';
    btns.forEach(b=>{const on=b.dataset.k===S.semaforo;b.classList.toggle('on',on);b.setAttribute('aria-pressed',String(on))});
  }
  body.append(circle,name,desc,h('div',{class:'as-sg'},...btns),h('div',{class:'row c',style:'margin-top:14px'},h('button',{class:'btn ghost',onclick:()=>{S.semaforo='';save();draw();renderModeChip()}},...ib('power','Apagar semáforo'))));
  draw();
}
tool({id:'sema',group:'aula',order:60,icon:'traffic',label:'Semáforo',title:'Semáforo de trabajo',build:mSemaforo,w:520});
renderModeChip();

