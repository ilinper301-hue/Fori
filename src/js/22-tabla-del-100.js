/* ============ Tabla del 100 ============ */
function mHundred(body){
  const col=Array(101).fill(0),rev=new Set(),cells=[];
  let hl=null,hlKey='',hide=false;
  const grid=h('div',{class:'h100'});
  for(let n=1;n<=100;n++){cells[n]=h('button',{class:'hc',onclick:()=>{if(hide&&!rev.has(n))rev.add(n);else col[n]=(col[n]+1)%4;paint()}},String(n));grid.append(cells[n])}
  const keyed=[];
  function paint(){
    for(let n=1;n<=100;n++){
      const hid=hide&&!rev.has(n);
      cells[n].className='hc'+(col[n]?' c'+col[n]:'')+(hl&&hl(n)?' hl':'')+(hid?' hid':'');
      cells[n].textContent=hid?'':n;
    }
    keyed.forEach(b=>b.classList.toggle('on',b.dataset.k===hlKey));
    hideB.classList.toggle('on',hide);
  }
  const setHl=(k,fn)=>{if(hlKey===k){hl=null;hlKey=''}else{hl=fn;hlKey=k}paint()};
  const kb=(cls,k,label,fn)=>{const b=h('button',{class:cls,'data-k':k,onclick:()=>setHl(k,fn)},label);keyed.push(b);return b};
  const hideB=h('button',{class:'btn ghost tog',onclick:()=>{hide=!hide;rev.clear();paint()}},...ib('eye-off','Ocultar números'));
  body.append(
    h('div',{class:'lbl',style:'margin-top:0'},'Resaltar múltiplos de…'),
    h('div',{class:'seg'},[2,3,4,5,6,7,8,9,10].map(m=>kb('','m'+m,String(m),n=>n%m===0))),
    h('div',{class:'row c',style:'margin:10px 0'},
      kb('btn ghost tog','par','Pares',n=>n%2===0),kb('btn ghost tog','impar','Impares',n=>n%2===1),hideB,
      h('button',{class:'btn danger',onclick:()=>{col.fill(0);rev.clear();hl=null;hlKey='';hide=false;paint()}},...ib('eraser','Limpiar'))),
    grid,
    h('p',{class:'muted',style:'margin:10px 0 0'},'Toca una casilla para cambiar su color: amarillo, azul, verde'));
  paint();
}

