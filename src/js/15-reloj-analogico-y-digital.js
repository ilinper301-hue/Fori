/* ============ Reloj analógico y digital ============ */
const HW=['doce','una','dos','tres','cuatro','cinco','seis','siete','ocho','nueve','diez','once','doce'];
const MW=['','uno','dos','tres','cuatro','cinco','seis','siete','ocho','nueve','diez','once','doce','trece','catorce','quince','dieciséis','diecisiete','dieciocho','diecinueve','veinte','veintiuno','veintidós','veintitrés','veinticuatro','veinticinco','veintiséis','veintisiete','veintiocho','veintinueve'];
function timeWords(t){
  const hh=Math.floor(t/60),m=t%60,next=m>30,hn=(hh+(next?1:0))%24,h12=hn%12||12;
  const base=h12===1?'Es la una':'Son las '+HW[h12];
  const tail=m===0?' en punto':m===15?' y cuarto':m===30?' y media':m===45?' menos cuarto':next?' menos '+MW[60-m]:' y '+MW[m];
  const fr=hn===12?'del mediodía':hn>=6&&hn<12?'de la mañana':hn>12&&hn<21?'de la tarde':hn>=1&&hn<6?'de la madrugada':'de la noche';
  return `${base}${tail} ${fr}`;
}
function mClock(body){
  let live=true,t=0,sec=0,snap=5,h24=true,showDig=true,showW=true,showMin=false,drag=null;
  const P=(r,a)=>[(r*Math.sin(a*Math.PI/180)).toFixed(1),(-r*Math.cos(a*Math.PI/180)).toFixed(1)];
  let g='',mins='';
  for(let i=0;i<60;i++){const big=i%5===0,[x1,y1]=P(big?150:158,i*6),[x2,y2]=P(168,i*6);g+=`<line x1="${x1}" y1="${y1}" x2="${x2}" y2="${y2}" stroke="var(--ink)" stroke-width="${big?5:2}" stroke-linecap="round"/>`}
  for(let i=1;i<=12;i++){const [x,y]=P(124,i*30);g+=`<text x="${x}" y="${y}" font-size="38" font-weight="800" text-anchor="middle" dominant-baseline="central" fill="var(--ink)">${i}</text>`}
  for(let i=0;i<12;i++){const [x,y]=P(192,i*30);mins+=`<text x="${x}" y="${y}" font-size="17" font-weight="700" text-anchor="middle" dominant-baseline="central" fill="#1e6fe0">${pad(i*5)}</text>`}
  const wrap=h('div',{html:`<svg class="clk" viewBox="-210 -210 420 420" width="360" height="360"><circle r="174" fill="var(--board)" stroke="var(--ink)" stroke-width="6"/>${g}<g class="mins" style="display:none">${mins}</g><line class="hh" y2="-92" stroke="#e03131" stroke-width="14" stroke-linecap="round"/><line class="mh" y2="-145" stroke="#1e6fe0" stroke-width="9" stroke-linecap="round"/><line class="sh" y1="22" y2="-155" stroke="#f08c00" stroke-width="3" stroke-linecap="round"/><circle r="11" fill="var(--ink)"/></svg>`});
  const svg=$('svg',wrap),hH=$('.hh',svg),mH=$('.mh',svg),sH=$('.sh',svg),minsG=$('.mins',svg);
  const dig=h('div',{class:'dig'}),words=h('div',{class:'words'});
  const modeSeg=h('div',{class:'seg'},
    h('button',{class:'on',onclick:()=>setLive(true)},...ib('clock','Hora real')),
    h('button',{onclick:()=>setLive(false)},...ib('select','Practicar')));
  function syncNow(){const d=new Date();t=d.getHours()*60+d.getMinutes();sec=d.getSeconds()}
  function setLive(v){live=v;$$('button',modeSeg).forEach((b,i)=>b.classList.toggle('on',i===(v?0:1)));if(v)syncNow();draw()}
  const step=dm=>{if(live)setLive(false);t=((t+dm)%1440+1440)%1440;draw()};
  const snapSeg=h('div',{class:'seg'},...[1,5,15,30].map(v=>h('button',{class:v===snap?'on':'',onclick:e=>{snap=v;$$('button',snapSeg).forEach(b=>b.classList.toggle('on',b===e.currentTarget))}},v+' min')));
  const tog=(lbl,get,set)=>{const b=h('button',{class:'btn ghost tog'+(get()?' on':''),onclick:()=>{set(!get());b.classList.toggle('on',get());draw()}},lbl);return b};
  function draw(){
    const m=t%60,hh=Math.floor(t/60);
    hH.setAttribute('transform',`rotate(${(t%720)/2+(live?sec/120:0)})`);
    mH.setAttribute('transform',`rotate(${m*6+(live?sec/10:0)})`);
    sH.style.display=live?'':'none';sH.setAttribute('transform',`rotate(${sec*6})`);
    minsG.style.display=showMin?'':'none';
    dig.style.display=showDig?'':'none';words.style.display=showW?'':'none';
    dig.innerHTML=h24?`${pad(hh)}:${pad(m)}`:`${hh%12||12}:${pad(m)} <small>${hh<12?'a. m.':'p. m.'}</small>`;
    words.textContent=timeWords(t);
  }
  // Arrastrar agujas: la de minutos mueve también la de horas (como un reloj real)
  const local=e=>{const r=svg.getBoundingClientRect();return{x:(e.clientX-r.left)/r.width*420-210,y:(e.clientY-r.top)/r.height*420-210}};
  const angOf=p=>(Math.atan2(p.x,-p.y)*180/Math.PI+360)%360;
  const adiff=(a,b)=>{const d=Math.abs(a-b)%360;return d>180?360-d:d};
  function move(e){
    if(!drag)return;const a=angOf(local(e));
    if(drag==='m'){
      const nm=Math.round(a/6/snap)*snap%60;let dd=nm-t%60;if(dd>30)dd-=60;if(dd<-30)dd+=60;t+=dd;
    }else{
      let dd=a*2-t%720;if(dd>360)dd-=720;if(dd<-360)dd+=720;t=Math.round((t+dd)/snap)*snap;
    }
    t=((t%1440)+1440)%1440;draw();
  }
  svg.addEventListener('pointerdown',e=>{
    const p=local(e),r=Math.hypot(p.x,p.y);if(r<25||r>205)return;
    const a=angOf(p),md=adiff(a,(t%60)*6),hd=adiff(a,(t%720)/2);
    drag=r>110?'m':(Math.abs(md-hd)<15||hd<md?'h':'m'); // lejos del centro solo llega la aguja larga
    svg.setPointerCapture(e.pointerId);if(live)setLive(false);move(e);
  });
  svg.addEventListener('pointermove',move);
  const up=()=>drag=null;svg.addEventListener('pointerup',up);svg.addEventListener('pointercancel',up);
  body.append(modeSeg,wrap,dig,words,
    h('p',{class:'muted',style:'font-size:15px;margin:4px 0 10px'},'Aguja corta (roja): horas · Aguja larga (azul): minutos'),
    h('div',{class:'row c'},
      h('button',{class:'btn ghost',onclick:()=>step(-60)},'−1 h'),
      h('button',{class:'btn ghost',onclick:()=>step(-snap)},'− min'),
      h('button',{class:'btn ghost',onclick:()=>step(snap)},'+ min'),
      h('button',{class:'btn ghost',onclick:()=>step(60)},'+1 h'),
      h('button',{class:'btn','aria-label':'Hora aleatoria',onclick:()=>{setLive(false);t=Math.floor(Math.random()*(1440/snap))*snap;draw()}},ico('dice'))),
    h('div',{class:'muted',style:'font-size:15px;margin:12px 0 6px'},'Paso de la aguja de minutos'),snapSeg,
    h('div',{class:'row c',style:'margin-top:12px'},
      tog('Digital',()=>showDig,v=>showDig=v),tog('En palabras',()=>showW,v=>showW=v),
      tog('Minutos',()=>showMin,v=>showMin=v),tog('24 h',()=>h24,v=>h24=v)));
  syncNow();draw();
  const iv=setInterval(()=>{if(live){syncNow();draw()}},1000);
  return()=>clearInterval(iv);
}

