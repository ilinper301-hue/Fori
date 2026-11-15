/* ============ Módulo: temporizador / cronómetro ============ */
function mTimer(body){
  let mode='down',total=300000,ms=total,run=false,last=0,iv=null;
  const C=2*Math.PI*90;
  const num=h('div',{class:'ringnum'});
  const box=h('div',{class:'ringbox',html:`<svg viewBox="0 0 200 200" width="260" height="260"><circle cx="100" cy="100" r="90" fill="none" stroke="var(--line)" stroke-width="14"/><circle class="fg" cx="100" cy="100" r="90" fill="none" stroke="var(--accent)" stroke-width="14" stroke-linecap="round" transform="rotate(-90 100 100)" stroke-dasharray="${C}" stroke-dashoffset="0"/></svg>`},num);
  const fg=$('.fg',box);
  const go=h('button',{class:'btn',style:'min-width:150px',onclick:startPause},...ib('play','Iniciar'));
  const presets=h('div',{class:'row c'},
    [1,2,5,10,15].map(m=>h('button',{class:'btn ghost',onclick:()=>{stop();total=m*60000;ms=total;draw()}},m+' min')),
    h('button',{class:'btn ghost',onclick:()=>{stop();total=Math.max(60000,total-60000);ms=total;draw()}},'−1'),
    h('button',{class:'btn ghost',onclick:()=>{stop();total+=60000;ms=total;draw()}},'+1'));
  const seg=h('div',{class:'seg'},
    h('button',{class:'on',onclick:e=>setMode('down',e.currentTarget)},...ib('hourglass','Cuenta atrás')),
    h('button',{onclick:e=>setMode('up',e.currentTarget)},...ib('timer','Cronómetro')));
  body.append(seg,box,h('div',{class:'row c'},go,h('button',{class:'btn ghost',onclick:()=>{stop();ms=mode==='down'?total:0;draw()}},...ib('reset','Reiniciar'))),h('div',{style:'height:10px'}),presets);
  function setMode(m,btn){stop();mode=m;ms=m==='down'?total:0;$$('button',seg).forEach(b=>b.classList.toggle('on',b===btn));presets.style.display=m==='down'?'flex':'none';draw()}
  function draw(){
    const s=mode==='down'?Math.ceil(ms/1000):Math.floor(ms/1000);
    num.textContent=`${pad(Math.floor(s/60))}:${pad(s%60)}`;num.classList.remove('done');
    const f=mode==='down'?(total?ms/total:0):(ms%60000)/60000;
    fg.style.strokeDashoffset=C*(1-f);fg.style.stroke=mode==='down'&&f<.15?'var(--danger)':'var(--accent)';
  }
  function tick(){
    const now=performance.now(),dt=now-last;last=now;
    if(mode==='down'){ms=Math.max(0,ms-dt);if(ms===0){stop();draw();num.classList.add('done');beep();return}}else ms+=dt;
    draw();
  }
  function stop(){run=false;clearInterval(iv);go.replaceChildren(...ib('play','Iniciar'))}
  function startPause(){
    if(run){stop();return}
    audio();if(mode==='down'&&ms<=0)ms=total;
    run=true;last=performance.now();iv=setInterval(tick,100);go.replaceChildren(...ib('pause','Pausa'));
  }
  draw();
  return()=>clearInterval(iv);
}
tool({id:'timer',group:'aula',order:70,icon:'timer',label:'Tiempo',title:'Temporizador',build:mTimer,w:400});
