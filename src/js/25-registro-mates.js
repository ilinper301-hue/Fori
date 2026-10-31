/* ============ Registro de herramientas de mates ============ */
const MATH_EXTRA=[
  {id:'prot',label:'Transportador',toggle:toggleProt,isOn:()=>!!prot},
  {id:'line',label:'Recta numérica',title:'Recta numérica',build:mLine,w:900},
  {id:'frac',label:'Fracciones',title:'Fracciones',build:mFrac,w:640},
  {id:'hundred',label:'Tabla del 100',title:'Tabla del 100',build:mHundred,w:640},
  {id:'dice',label:'Dados',title:'Dados',build:mDice,w:560},
  {id:'geo',label:'Geoplano',title:'Geoplano',build:mGeo,w:620}
];
function mathExtraClear(){if(prot)toggleProt()}


