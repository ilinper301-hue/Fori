/* ============ Datos persistentes ============ */
const KEY='fori-v1';
const DEF={
  students:Array.from({length:12},(_,i)=>`Alumno ${i+1}`),
  roles:['Encargado/a de la clase','Pizarra','Material','Biblioteca','Luces','Plantas'],
  offset:0,
  schedule:Object.fromEntries([1,2,3,4,5].map(d=>[d,['09:00-10:00 Lengua','10:00-11:00 Matemáticas','11:00-11:30 Recreo','11:30-12:30 Ciencias','12:30-13:30 Inglés']])),
  theme:'light',
  counters:[{n:'Equipo 1',v:0,c:'#e03131'},{n:'Equipo 2',v:0,c:'#1e6fe0'}],
  noiseMax:65,
  recent:['ink','#1e6fe0','#e03131','#2f9e44','#f08c00','#7048e8'],
  billMode:'simple',billImgs:{},specimen:true,
  ui:1,pautaSize:1,pictos:true,picto:{},festivos:[],schoolStart:null
};
let S;
try{S={...structuredClone(DEF),...JSON.parse(localStorage.getItem(KEY)||'{}')}}catch{S=structuredClone(DEF)}
const save=()=>{
  if(Array.isArray(S.classes)&&S.classes[S.cls]){const c=S.classes[S.cls];c.students=S.students;c.roles=S.roles;c.offset=S.offset}
  try{localStorage.setItem(KEY,JSON.stringify(S))}catch{toast('No se pudieron guardar los ajustes: el almacenamiento está lleno')}
};

