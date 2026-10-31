/* ============ Utilidades ============ */
let tt;
function toast(msg,action){
  const t=$('#toast');t.replaceChildren(msg);
  if(action)t.append(h('button',{class:'btn',onclick:()=>{action.fn();t.style.display='none'}},action.label));
  t.style.display='flex';clearTimeout(tt);
  tt=setTimeout(()=>t.style.display='none',action?6000:2500);
}
let actx;
function audio(){actx=actx||new (window.AudioContext||window.webkitAudioContext)();if(actx.state==='suspended')actx.resume();return actx}
function beep(n=3){
  try{const a=audio();for(let i=0;i<n;i++){
    const o=a.createOscillator(),g=a.createGain();o.frequency.value=880;o.connect(g);g.connect(a.destination);
    const t=a.currentTime+i*.45;g.gain.setValueAtTime(.0001,t);g.gain.exponentialRampToValueAtTime(.4,t+.02);g.gain.exponentialRampToValueAtTime(.0001,t+.35);o.start(t);o.stop(t+.4);
  }}catch{}
}
function shuffle(a){a=[...a];for(let i=a.length-1;i>0;i--){const j=Math.floor(Math.random()*(i+1));[a[i],a[j]]=[a[j],a[i]]}return a}

