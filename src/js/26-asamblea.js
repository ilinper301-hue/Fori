/* ============ Asamblea: calendario, tiempo, emociones y días de cole ============ */
const ymd=d=>`${d.getFullYear()}-${pad(d.getMonth()+1)}-${pad(d.getDate())}`;
const dayOnly=d=>new Date(d.getFullYear(),d.getMonth(),d.getDate());
const capFirst=s=>s.charAt(0).toUpperCase()+s.slice(1);
// S.festivos: ['dd/mm/aaaa', 'dd/mm/aaaa-dd/mm/aaaa', ...] → conjunto de 'aaaa-mm-dd'
let festKey=null,festSet=new Set();
function festivosSet(){
  const arr=Array.isArray(S.festivos)?S.festivos:[],key=arr.join('|');
  if(key===festKey)return festSet;
  const set=new Set(),re=/^\s*(\d{1,2})\/(\d{1,2})\/(\d{4})\s*(?:[-–]\s*(\d{1,2})\/(\d{1,2})\/(\d{4}))?\s*$/;
  for(const t of arr){
    const m=re.exec(String(t));if(!m)continue;
    const a=new Date(+m[3],m[2]-1,+m[1]),b=m[4]?new Date(+m[6],m[5]-1,+m[4]):a;
    for(let i=0;i<400;i++){const d=new Date(a.getFullYear(),a.getMonth(),a.getDate()+i);if(d>b)break;set.add(ymd(d))}
  }
  festKey=key;festSet=set;return set;
}
function isLective(date){const d=dayOnly(date),w=d.getDay();return w>0&&w<6&&!festivosSet().has(ymd(d))}
// Días lectivos entre dos fechas, ambas incluidas
function lectiveDays(from,to){
  const a=dayOnly(from),b=dayOnly(to);let n=0;
  for(let i=0;i<4000;i++){const d=new Date(a.getFullYear(),a.getMonth(),a.getDate()+i);if(d>b)break;if(isLective(d))n++}
  return n;
}
function schoolStart(){
  const m=/^(\d{4})-(\d{2})-(\d{2})$/.exec(S.schoolStart||'');
  if(m)return new Date(+m[1],m[2]-1,+m[3]);
  const n=new Date();return new Date(n.getMonth()>=8?n.getFullYear():n.getFullYear()-1,8,8);
}

const WEATHER=[['sol','☀️','Soleado','hace sol'],['parcial','⛅','Parcialmente nublado','está parcialmente nublado'],['nublado','☁️','Nublado','está nublado'],['lluvia','🌧️','Lluvia','llueve'],
  ['tormenta','⛈️','Tormenta','hay tormenta'],['nieve','❄️','Nieve','nieva'],['niebla','🌫️','Niebla','hay niebla'],['viento','💨','Viento','hace viento']];
const SEASONS=[['Primavera','🌸','20 de marzo','20 de junio'],['Verano','🏖️','21 de junio','21 de septiembre'],['Otoño','🍂','22 de septiembre','20 de diciembre'],['Invierno','⛄','21 de diciembre','19 de marzo']];
function seasonOf(d){const v=(d.getMonth()+1)*100+d.getDate();return SEASONS[v>=1221||v<320?3:v>=922?2:v>=621?1:0]}
const EMOS=[['contento','😀','Contento','#e0a800'],['triste','😢','Triste','#3d7be0'],['enfadado','😠','Enfadado','#e03131'],['asustado','😨','Asustado','#7048e8'],
  ['sorprendido','😮','Sorprendido','#f08c00'],['cansado','😴','Cansado','#868e96'],['tranquilo','😌','Tranquilo','#2f9e44'],['nervioso','😬','Nervioso','#ae3ec9']];

function asCal(){
  const now=new Date();let y=now.getFullYear(),m=now.getMonth();
  const title=h('div',{class:'as-mt'}),grid=h('div',{class:'as-cal'});
  const mv=k=>()=>{m+=k;if(m<0){m=11;y--}if(m>11){m=0;y++}draw()};
  function draw(){
    const first=new Date(y,m,1),off=(first.getDay()+6)%7,n=new Date(y,m+1,0).getDate(),today=ymd(new Date());
    title.textContent=capFirst(first.toLocaleDateString('es-ES',{month:'long',year:'numeric'}));
    const cells=['L','M','X','J','V','S','D'].map(d=>h('b',{class:'as-wd'},d));
    for(let i=0;i<off;i++)cells.push(h('i'));
    for(let d=1;d<=n;d++){const dt=new Date(y,m,d);cells.push(h('div',{class:'as-d'+(isLective(dt)?'':' off')+(ymd(dt)===today?' today':'')},String(d)))}
    grid.replaceChildren(...cells);
  }
  draw();
  return h('div',{},
    h('div',{class:'as-big2'},capFirst(now.toLocaleDateString('es-ES',{weekday:'long',day:'numeric',month:'long'}))),
    h('div',{class:'as-head'},h('button',{class:'btn ghost','aria-label':'Mes anterior',onclick:mv(-1)},ico('left')),title,h('button',{class:'btn ghost','aria-label':'Mes siguiente',onclick:mv(1)},ico('right'))),
    grid,
    h('div',{class:'row c',style:'margin-top:10px'},h('button',{class:'btn ghost',onclick:()=>{y=now.getFullYear();m=now.getMonth();draw()}},'Ir a hoy')),
    h('p',{class:'muted',style:'margin:8px 0 0'},'Los días apagados no son lectivos (fines de semana y festivos).'));
}

function asWeather(){
  const now=new Date(),key=ymd(now),out=h('div',{class:'as-now'}),btns=h('div',{class:'as-wgrid'});
  const cur=()=>(S.weather||{})[key];
  function draw(){
    const w=WEATHER.find(x=>x[0]===cur());
    out.replaceChildren(w?h('span',{class:'as-e'},w[1]):h('span',{class:'as-e as-q'},'?'),h('span',{},w?'Hoy '+w[3]:'Hoy hace…'));
    $$('button',btns).forEach(b=>{b.classList.toggle('on',b.dataset.k===cur());b.setAttribute('aria-pressed',String(b.dataset.k===cur()))});
  }
  btns.append(...WEATHER.map(([k,em,nm])=>h('button',{class:'as-wb','data-k':k,onclick:()=>{
    S.weather=S.weather||{};if(S.weather[key]===k)delete S.weather[key];else S.weather[key]=k;save();draw()}},h('span',{},em),nm)));
  const se=seasonOf(now);
  draw();
  return h('div',{},out,btns,
    h('div',{class:'as-season'},h('span',{class:'as-e2'},se[1]),h('div',{},h('b',{},'Estamos en '+se[0].toLowerCase()),h('div',{class:'muted',style:'text-align:left'},`Del ${se[2]} al ${se[3]} (fechas aproximadas)`))));
}

function asEmo(){
  const rows=h('div'),tot=h('div',{class:'muted',style:'text-align:left'});
  const day=()=>ymd(new Date());
  const get=()=>(S.emo&&S.emo[day()])||{};
  function add(k,d){S.emo=S.emo||{};const c=S.emo[day()]=S.emo[day()]||{};c[k]=Math.max(0,(c[k]||0)+d);save();draw()}
  function draw(){
    const c=get(),mx=Math.max(1,...EMOS.map(e=>c[e[0]]||0));
    rows.replaceChildren(...EMOS.map(([k,em,nm,col])=>h('div',{class:'as-er'},
      h('button',{class:'as-eb',onclick:()=>add(k,1)},h('span',{},em),nm),
      h('div',{class:'as-bar'},h('i',{style:`width:${(c[k]||0)/mx*100}%;background:${col}`})),
      h('b',{class:'as-n'},String(c[k]||0)),
      h('button',{class:'btn ghost as-m','aria-label':'Quitar uno a '+nm,onclick:()=>add(k,-1)},ico('minus')))));
    const t=EMOS.reduce((s,e)=>s+(c[e[0]]||0),0);
    tot.textContent=t?`Total de hoy: ${t}`:'Toca la emoción que sientes. Cada toque suma uno.';
  }
  draw();
  return h('div',{},h('div',{class:'row',style:'justify-content:space-between;margin-bottom:10px;flex-wrap:nowrap'},tot,h('button',{class:'btn ghost',style:'flex:none',onclick:()=>{
    const k=day(),bak=S.emo&&S.emo[k];if(!bak)return;delete S.emo[k];save();draw();
    toast('Emociones reiniciadas',{label:ib('undo','Deshacer'),fn:()=>{S.emo[k]=bak;save();draw()}});
  }},...ib('reset','Reiniciar'))),rows);
}

function asDays(){
  const now=new Date(),st=schoolStart(),n=lectiveDays(st,now);
  const c=Math.floor(n/100),d=Math.floor(n/10)%10,u=n%10;
  const cell=(v,l,col)=>h('div',{},h('b',{style:'color:'+col},String(v)),h('span',{},l));
  return h('div',{},
    h('div',{class:'muted'},n?'Hoy es el día número':'Todavía no han empezado las clases'),
    h('div',{class:'big as-bigday'},String(n)),
    h('div',{class:'muted'},'de cole'+(isLective(now)?'':' · hoy no es día lectivo')),
    h('div',{class:'pv'},cell(c,'Centenas','#2f9e44'),cell(d,'Decenas','#e03131'),cell(u,'Unidades','#1e6fe0'),h('div',{class:'tot'},h('b',{},String(n)),h('span',{},'Total'))),
    h('div',{class:'row c'},h('button',{class:'btn',onclick:()=>{
      if(!wins.has('b10'))openTool('b10');
      makeNumber(n);if(n>999)toast('Base 10 llega hasta 999');
    }},...ib('b10','Representar en base 10'))),
    h('p',{class:'muted',style:'margin:12px 0 0'},`Desde el ${st.toLocaleDateString('es-ES',{day:'numeric',month:'long'})} · de lunes a viernes, sin festivos`));
}

let asTab=0;
function mAsamblea(body){
  const tabs=[['calendar','Calendario',asCal],['sun','Tiempo',asWeather],['smile','Emociones',asEmo],['book','Días de cole',asDays]];
  const view=h('div',{style:'margin-top:14px'});
  const sg=h('div',{class:'seg as-tabs'},...tabs.map((t,i)=>h('button',{onclick:()=>go(i)},ico(t[0]),t[1])));
  function go(i){asTab=i;$$('button',sg).forEach((b,j)=>b.classList.toggle('on',j===i));view.replaceChildren(tabs[i][2]())}
  body.append(sg,view);go(clamp(asTab,0,3));
}
tool({id:'asam',group:'aula',order:50,icon:'sun',label:'Asamblea',title:'Asamblea',build:mAsamblea,w:640});
