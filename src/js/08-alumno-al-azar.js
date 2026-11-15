/* ============ Módulo: alumno al azar (nombres + ruleta) ============ */
let pool=[];
const RL={cx:200,cy:210,R:170,hub:40,
  // [relleno, texto]: colores de marca con buen contraste
  pal:[['#27C1B0','#06302b'],['#7444E0','#ffffff'],['#FFC845','#33260a'],['#F4664A','#2e0c05'],['#7FDDD2','#06302b'],['#A98BF0','#1c0a4d']]};
const rlEsc=s=>String(s).replace(/[&<>"]/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;'}[c]));
// Texto del sector: nombre completo, abreviado o iniciales según el espacio
function rlLabel(name,n,a){
  const avail=RL.R-14-RL.hub-8,arcW=(RL.hub+avail*.55)*a*Math.PI/180,fsMax=Math.min(26,arcW*.62),minFs=n>20?9:11;
  const w=name.trim().split(/\s+/),ini=w.map(x=>x[0]).join('').toUpperCase().slice(0,3);
  const cand=[name.trim(),w.length>1?w[0]+' '+w.slice(1).map(x=>x[0].toUpperCase()+'.').join(' '):null,w[0],ini].filter(Boolean);
  for(const t of cand){const fs=Math.min(fsMax,avail/(t.length*.6));if(fs>=minFs)return{t,fs}}
  return{t:ini,fs:Math.max(minFs,Math.min(fsMax,avail/(ini.length*.6)))};
}
function rlSvg(list,win){
  const n=list.length,{cx,cy,R}=RL,a=360/n,P=(r,d)=>[(cx+r*Math.sin(d*Math.PI/180)).toFixed(2),(cy-r*Math.cos(d*Math.PI/180)).toFixed(2)];
  let s='',t='',pegs='';
  list.forEach((nm,i)=>{
    let ci=i%4;if(n%4===1&&i===n-1)ci=4;else if(n%4===2&&n>2&&i===n-1)ci=5;else if(n%4===3&&i===n-1)ci=4;
    const [bg,fg]=RL.pal[ci],m=(i+.5)*a,lb=rlLabel(nm,n,a);
    if(n===1)s+=`<circle class="rl-s" data-i="0" cx="${cx}" cy="${cy}" r="${R}" fill="${bg}"/>`;
    else{const p0=P(R,i*a),p1=P(R,(i+1)*a);s+=`<path class="rl-s${i===win?' win':''}" data-i="${i}" fill="${bg}" d="M${cx} ${cy}L${p0[0]} ${p0[1]}A${R} ${R} 0 ${a>180?1:0} 1 ${p1[0]} ${p1[1]}Z"/>`}
    t+=`<g class="rl-t${i===win?' win':''}" transform="translate(${cx} ${cy}) rotate(${(m-90).toFixed(2)})"><text x="${R-14}" y="0" text-anchor="end" dominant-baseline="central" fill="${fg}" font-size="${lb.fs.toFixed(1)}"><title>${rlEsc(nm)}</title>${rlEsc(lb.t)}</text></g>`;
    if(n>1){const q=P(R+8,i*a);pegs+=`<circle cx="${q[0]}" cy="${q[1]}" r="3.6" class="rl-peg"/>`}
  });
  return `<g class="rl-rot">${s}${t}</g><circle class="rl-rim" cx="${cx}" cy="${cy}" r="${R+8}" fill="none" stroke-width="15"/><circle class="rl-rimi" cx="${cx}" cy="${cy}" r="${R+15.5}" fill="none" stroke-width="1.5"/>${pegs}`;
}
function mPicker(body){
  let iv=null,raf=0,spinning=false,theta=0,list=[];
  const win=body.parentElement,ui=S.ui||1;
  const mode=()=>S.pickerMode==='wheel'?'wheel':'names';
  const out=h('div',{class:'pick'},'—');
  const info=h('div',{class:'muted'});
  const nr=h('input',{type:'checkbox',checked:''});
  const snd=h('input',{type:'checkbox'});snd.checked=S.pickerSound!==false;
  snd.addEventListener('change',()=>{S.pickerSound=snd.checked;save()});
  const upd=()=>info.textContent=S.students.length?(nr.checked?`Quedan ${pool.length||S.students.length} por salir`:`${S.students.length} alumnos`):'Añade alumnos en Ajustes';
  nr.addEventListener('change',()=>{pool=[];upd();if(mode()==='wheel')draw()});

  /* ---- modo nombres (el de siempre) ---- */
  const go=h('button',{class:'btn',style:'min-width:200px;min-height:68px;font-size:28px',onclick:()=>{
    if(!S.students.length||iv)return;
    if(nr.checked&&!pool.length)pool=[...S.students];
    const list=nr.checked?pool:S.students,fin=list[Math.floor(Math.random()*list.length)];
    let i=0;out.classList.add('spin');
    iv=setInterval(()=>{
      out.textContent=S.students[Math.floor(Math.random()*S.students.length)];
      if(++i>14){clearInterval(iv);iv=null;out.textContent=fin;out.classList.remove('spin');
        if(nr.checked)pool.splice(pool.indexOf(fin),1);
        upd();}
    },80);
  }},...ib('dice','¡Elegir!'));
  const namesView=h('div',{},out,h('div',{class:'row c'},go));

  /* ---- modo ruleta ---- */
  const svg=h('div',{class:'rl-svgw'});
  const ptr=h('div',{class:'rl-ptr',html:'<svg viewBox="0 0 40 52"><path d="M20 50L4 14a17 17 0 1 1 32 0z"/><circle cx="20" cy="14" r="5"/></svg>'});
  const hub=h('button',{class:'rl-hub','aria-label':'Girar la ruleta',onclick:()=>spin()},ico('rotate'),h('span',{},'Girar'));
  const resName=h('div',{class:'rl-rn'}),
    res=h('div',{class:'rl-res',role:'status',onclick:()=>dismiss()},h('div',{class:'rl-rl'},'Le toca a'),resName,h('div',{class:'rl-rh'},'Toca para cerrar'));
  const empty=h('div',{class:'rl-empty'},'Añade alumnos en Ajustes');
  const stage=h('div',{class:'rl-stage'},svg,ptr,hub,res,empty);
  const wheelView=h('div',{class:'rl-view'},stage);
  const cur=()=>nr.checked&&pool.length?pool:S.students;
  function draw(win=-1){
    list=[...cur()];
    const ok=list.length>0;
    empty.style.display=ok?'none':'';hub.disabled=!ok||spinning;
    svg.innerHTML=ok?`<svg viewBox="0 0 400 400" role="img" aria-label="Ruleta de alumnos">${rlSvg(list,win)}</svg>`:`<svg viewBox="0 0 400 400"><circle cx="200" cy="210" r="170" class="rl-blank"/></svg>`;
    svg.classList.toggle('done',win>=0);
    rot(theta);
  }
  function rot(d){
    const g=svg.querySelector('.rl-rot');if(!g)return;
    g.setAttribute('transform',`rotate(${d.toFixed(3)} ${RL.cx} ${RL.cy})`);
    if(spinning)return;
    // con la ruleta parada, los nombres de la mitad izquierda se giran para que se lean del derecho
    svg.querySelectorAll('.rl-t').forEach(t=>{
      const m=/rotate\(([-\d.]+)\)/.exec(t.getAttribute('transform')),tx=t.querySelector('text');if(!m||!tx)return;
      const abs=(+m[1]+d)*Math.PI/180;
      if(Math.cos(abs)<0){const x=+tx.getAttribute('x'),len=tx.getComputedTextLength();tx.setAttribute('transform',`rotate(180 ${(x-len/2).toFixed(1)} 0)`)}
      else tx.removeAttribute('transform');
    });
  }
  function dismiss(){
    if(!res.classList.contains('on'))return;
    res.classList.remove('on');draw();
  }
  function tick(){
    ptr.classList.add('tk');setTimeout(()=>ptr.classList.remove('tk'),70);
    if(!snd.checked)return;
    try{const c=audio(),o=c.createOscillator(),g=c.createGain();o.type='triangle';o.frequency.value=1200;o.connect(g);g.connect(c.destination);
      const t=c.currentTime;g.gain.setValueAtTime(.0001,t);g.gain.exponentialRampToValueAtTime(.08,t+.004);g.gain.exponentialRampToValueAtTime(.0001,t+.04);o.start(t);o.stop(t+.05)}catch{}
  }
  function chime(){
    if(!snd.checked)return;
    try{const c=audio();[660,880].forEach((f,i)=>{const o=c.createOscillator(),g=c.createGain();o.frequency.value=f;o.connect(g);g.connect(c.destination);
      const t=c.currentTime+i*.14;g.gain.setValueAtTime(.0001,t);g.gain.exponentialRampToValueAtTime(.25,t+.02);g.gain.exponentialRampToValueAtTime(.0001,t+.5);o.start(t);o.stop(t+.55)})}catch{}
  }
  function spin(){
    if(spinning||!S.students.length)return;
    if(res.classList.contains('on')){res.classList.remove('on');draw()}
    if(nr.checked&&!pool.length){pool=[...S.students];draw()}
    const n=list.length,a=360/n,w=Math.floor(Math.random()*n),jit=(Math.random()-.5)*.7;
    // sector w (centro + pequeño desvío) debe quedar bajo la flecha (arriba)
    const base=((-(w+.5+jit)*a)%360+360)%360,from=theta,
      to=from+(5+Math.floor(Math.random()*3))*360+((base-from)%360+360)%360;
    const dur=4300+Math.random()*700,t0=performance.now();
    spinning=true;hub.disabled=true;nr.disabled=true;svg.classList.remove('done');
    let last=-1;
    const step=now=>{
      const k=Math.min(1,(now-t0)/dur),e=1-Math.pow(1-k,4);
      theta=from+(to-from)*e;rot(theta);
      const idx=Math.floor((((-theta)%360+360)%360)/a);
      if(idx!==last){if(last>=0)tick();last=idx}
      if(k<1){raf=requestAnimationFrame(step);return}
      raf=0;spinning=false;theta=to%360;
      const name=list[w];
      draw(w);nr.disabled=false;
      resName.textContent=name;
      resName.style.fontSize=Math.max(28,Math.min(64,420/Math.max(6,name.length)*1.6))+'px';
      res.classList.add('on');chime();
      if(nr.checked){const j=pool.indexOf(name);if(j>=0)pool.splice(j,1)}
      upd();
    };
    raf=requestAnimationFrame(step);
  }

  /* ---- selector Nombre / Ruleta ---- */
  const bN=h('button',{type:'button',onclick:()=>setMode('names')},'Nombre'),
    bW=h('button',{type:'button',onclick:()=>setMode('wheel')},ico('rotate'),h('span',{},'Ruleta'));
  const seg=h('div',{class:'seg rl-seg',style:'margin-bottom:12px'},bN,bW);
  const box=h('div',{});
  const sndLbl=h('label',{class:'chk'},snd,'Sonido');
  function setMode(m){
    if(spinning)return;
    S.pickerMode=m;save();
    bN.classList.toggle('on',m==='names');bW.classList.toggle('on',m==='wheel');
    box.replaceChildren(m==='wheel'?wheelView:namesView);
    sndLbl.style.display=m==='wheel'?'':'none';
    win.style.width=Math.round((m==='wheel'?680:440)*ui)+'px';
    win.classList.toggle('rl-big',m==='wheel');
    res.classList.remove('on');
    if(m==='wheel')draw();
  }
  const reset=h('button',{class:'btn ghost','aria-label':'Reiniciar',onclick:()=>{
    if(spinning)return;pool=[];out.textContent='—';res.classList.remove('on');upd();if(mode()==='wheel')draw()}},ico('reset'));
  body.append(seg,box,h('div',{class:'row c'},reset),
    h('div',{class:'rl-opts'},h('label',{class:'chk'},nr,'No repetir hasta que salgan todos'),sndLbl),info);
  upd();setMode(mode());
  return()=>{clearInterval(iv);if(raf)cancelAnimationFrame(raf)};
}
tool({id:'picker',group:'aula',order:10,icon:'dice',label:'Elegir',title:'Alumno al azar',build:mPicker,w:440});
