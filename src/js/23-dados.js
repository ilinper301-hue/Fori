/* ============ Dados ============ */
const DIE_PIPS=[[],[4],[0,8],[0,4,8],[0,2,6,8],[0,2,4,6,8],[0,2,3,5,6,8]];
const DIE_SHAPE={4:'50,6 96,90 4,90',8:'50,3 95,50 50,97 5,50',10:'50,3 94,40 78,94 22,94 6,40',12:'50,3 94,35 77,90 23,90 6,35',20:'50,3 91,26 91,74 50,97 9,74 9,26'}; // formas sencillas que sugieren cada dado
const dieSVG=(v,faces=6)=>{
  if(faces===6)return `<svg viewBox="0 0 100 100" width="110" height="110"><rect x="3" y="3" width="94" height="94" rx="18" fill="#fff" stroke="#14181d" stroke-width="4"/>${DIE_PIPS[v].map(i=>`<circle cx="${25+(i%3)*25}" cy="${25+Math.floor(i/3)*25}" r="${v===1?13:9}" fill="${v===1?'#d9363e':'#14181d'}"/>`).join('')}</svg>`;
  const ty=faces===4?68:52,fs=faces===4?(v>9?30:36):(v>9?44:54);
  return `<svg viewBox="0 0 100 100" width="110" height="110"><polygon points="${DIE_SHAPE[faces]}" fill="#fff" stroke="#14181d" stroke-width="4" stroke-linejoin="round"/><text x="50" y="${ty}" text-anchor="middle" dominant-baseline="central" font-size="${fs}" font-weight="800" font-family="Inter,system-ui,sans-serif" fill="#14181d">${v}</text></svg>`;
};
function mDice(body){
  let n=2,vals=[1,1],rolled=false,showSum=true,iv=null,faces=[4,6,8,10,12,20].includes(S.diceFaces)?S.diceFaces:6;
  const rnd=()=>1+Math.floor(Math.random()*faces);
  const box=h('div',{class:'row c dice'}),sum=h('div',{class:'big'});
  function draw(anim){
    box.replaceChildren(...vals.map((v,i)=>h('button',{class:'die'+(anim?' roll':''),'aria-label':'Dado '+v,html:dieSVG(v,faces),onclick:()=>{if(iv)return;vals[i]=rnd();rolled=true;draw()}})));
    const tot=vals.reduce((a,b)=>a+b,0);
    sum.textContent=anim?'…':!rolled?'—':showSum?'Suma: '+tot:'Suma: ?';
  }
  function roll(){
    if(iv)return;let f=0;
    iv=setInterval(()=>{
      vals=vals.map(rnd);rolled=true;
      if(++f>=9){clearInterval(iv);iv=null;draw()}else draw(true);
    },70);
  }
  const seg=h('div',{class:'seg'},[1,2,3,4].map(k=>h('button',{class:k===n?'on':'',onclick:e=>{
    n=k;vals=Array(n).fill(1);rolled=false;$$('button',seg).forEach(b=>b.classList.toggle('on',b===e.currentTarget));draw()}},k+(k===1?' dado':' dados'))));
  const sb=h('button',{class:'btn ghost tog on',onclick:()=>{showSum=!showSum;sb.classList.toggle('on',showSum);draw()}},...ib('eye','Suma'));
  const fseg=h('div',{class:'seg',style:'margin-top:8px'},[4,6,8,10,12,20].map(k=>h('button',{class:k===faces?'on':'','aria-label':k+' caras',onclick:e=>{
    if(iv)return;faces=k;S.diceFaces=k;save();vals=Array(n).fill(1);rolled=false;$$('button',fseg).forEach(b=>b.classList.toggle('on',b===e.currentTarget));draw()}},String(k))));
  body.append(seg,h('div',{class:'lbl',style:'margin:10px 0 0'},'Caras del dado'),fseg,h('div',{style:'height:14px'}),box,sum,
    h('div',{class:'row c',style:'margin-top:12px'},h('button',{class:'btn',style:'min-width:200px;min-height:68px;font-size:28px',onclick:roll},...ib('dice','Tirar')),sb),
    h('p',{class:'muted',style:'margin:10px 0 0'},'Toca un dado para tirar solo ese'));
  draw();
  return()=>clearInterval(iv);
}

