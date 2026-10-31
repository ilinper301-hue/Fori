/* ============ Módulo: medidor de ruido ============ */
function mNoise(body){
  let ctx,stream,raf,an,buf,sm=0,dead=false;
  const val=h('div',{class:'big'},'—');
  const fill=h('i');const bar=h('div',{class:'nbar'},fill);
  const msg=h('div',{class:'muted'},'Activando micrófono…');
  const th=h('input',{type:'range',min:20,max:95,value:S.noiseMax,oninput:e=>{S.noiseMax=Number(e.target.value);save()}});
  body.append(val,bar,msg,h('label',{class:'muted',style:'display:block;margin-top:14px'},'Límite de ruido aceptable'),th,
    h('div',{class:'muted',style:'font-size:14px;margin-top:6px'},'Escala relativa de 0 a 100 (no son decibelios calibrados).'));
  (async()=>{
    try{
      stream=await navigator.mediaDevices.getUserMedia({audio:{echoCancellation:false,noiseSuppression:false,autoGainControl:false}});
      if(dead){stream.getTracks().forEach(t=>t.stop());return}
      ctx=new (window.AudioContext||window.webkitAudioContext)();ctx.resume();
      an=ctx.createAnalyser();an.fftSize=1024;buf=new Float32Array(an.fftSize);ctx.createMediaStreamSource(stream).connect(an);loop();
    }catch{msg.textContent='No se pudo acceder al micrófono. Revisa el permiso del navegador.'}
  })();
  function loop(){
    an.getFloatTimeDomainData(buf);let s=0;for(const v of buf)s+=v*v;
    const db=20*Math.log10(Math.sqrt(s/buf.length)||1e-6),lvl=clamp((db+70)*100/60,0,100);
    sm=sm*.85+lvl*.15;val.textContent=Math.round(sm);fill.style.width=sm+'%';
    const over=sm>S.noiseMax,warn=sm>S.noiseMax*.75;
    fill.style.background=over?'var(--danger)':warn?'#f08c00':'#2f9e44';
    msg.textContent=over?'¡Demasiado ruido!':warn?'Cuidado con el volumen':'Nivel perfecto';
    raf=requestAnimationFrame(loop);
  }
  return()=>{dead=true;cancelAnimationFrame(raf);stream&&stream.getTracks().forEach(t=>t.stop());ctx&&ctx.close()};
}

