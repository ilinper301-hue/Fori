/* ============ Matemáticas: utilidades ============ */
const mFmt=v=>(Math.round(v*1e6)/1e6||0).toLocaleString('es-ES',{maximumFractionDigits:6,useGrouping:false}).replace('-','−'); // coma decimal
const mNum=s=>{const v=parseFloat(String(s).replace(',','.').replace('−','-'));return isFinite(v)?v:NaN};
const MCOL=['#e03131','#1e6fe0','#2f9e44','#f08c00','#7048e8','#0ca678'];

