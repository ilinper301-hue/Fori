/* ============ Insertar imágenes, fotos y fichas en PDF ============ */
// Las imágenes son objetos de la página (tipo 'img'): se mueven y se agrandan con la herramienta Mover,
// quedan debajo de la tinta y el borrador no las borra. Cada página de un PDF se convierte en una página de Fori
// con la ficha como fondo, para escribir encima.
const IMGS=new Map(); // caché de imágenes ya decodificadas
function imgEl(src){
  let i=IMGS.get(src);
  if(!i){i=new Image();i.onload=()=>drawBg();i.src=src;IMGS.set(src,i)}
  return i;
}
function drawImgObj(ctx,s){const i=imgEl(s.src);if(i.complete&&i.naturalWidth)ctx.drawImage(i,s.x,s.y,s.w,s.h)}
// Lee un archivo de imagen y lo reduce (máx. 1600 px); conserva la transparencia de los PNG
function readImage(file,max=1600){
  return new Promise((res,rej)=>{
    const url=URL.createObjectURL(file),im=new Image();
    im.onload=()=>{
      const k=Math.min(1,max/Math.max(im.width,im.height)),c=document.createElement('canvas');
      c.width=Math.round(im.width*k);c.height=Math.round(im.height*k);c.getContext('2d').drawImage(im,0,0,c.width,c.height);
      URL.revokeObjectURL(url);
      res({src:/png|gif|webp|svg/.test(file.type)?c.toDataURL('image/png'):c.toDataURL('image/jpeg',.88),w:c.width,h:c.height});
    };
    im.onerror=()=>{URL.revokeObjectURL(url);rej(new Error('imagen'))};
    im.src=url;
  });
}
async function insertImageFile(file,at){
  try{
    const r=await readImage(file);
    const W=stage.clientWidth,H=stage.clientHeight,k=Math.min(1,W*.6/r.w,H*.6/r.h),w=Math.round(r.w*k),hh=Math.round(r.h*k);
    const c=at||{x:W/2,y:H/2};
    const s={type:'img',src:r.src,x:Math.round(clamp(c.x-w/2,0,W-w)),y:Math.round(clamp(c.y-hh/2,0,H-hh)),w,h:hh};
    doOp({t:'add',s,i:0}); // al fondo: lo que se escriba queda encima
    T.tool='select';refreshTools();setSel(s);
    toast('Imagen añadida: arrástrala para moverla y usa la esquina para cambiar su tamaño');
  }catch{toast('No se pudo abrir la imagen')}
}
// Lector de PDF (pdf.js): se descarga la primera vez que se usa y queda guardado para usarlo sin conexión
const PDFJS='https://cdnjs.cloudflare.com/ajax/libs/pdf.js/3.11.174/';
function loadPdfJs(){
  if(window.pdfjsLib)return Promise.resolve(window.pdfjsLib);
  return new Promise((res,rej)=>{
    const sc=document.createElement('script');sc.src=PDFJS+'pdf.min.js';
    sc.onload=()=>{if(!window.pdfjsLib)return rej(new Error('pdf.js'));window.pdfjsLib.GlobalWorkerOptions.workerSrc=PDFJS+'pdf.worker.min.js';res(window.pdfjsLib)};
    sc.onerror=()=>rej(new Error('red'));document.head.append(sc);
  });
}
async function importPDF(file){
  commitEditor();
  let lib;
  try{lib=await loadPdfJs()}catch{toast('Para abrir un PDF la primera vez hace falta conexión a internet');return}
  try{
    toast('Abriendo el PDF…');
    const doc=await lib.getDocument({data:new Uint8Array(await file.arrayBuffer())}).promise;
    const n=doc.numPages;
    if(n>30&&!confirm(`El PDF tiene ${n} páginas. ¿Añadirlas todas a la pizarra?`))return;
    const W=stage.clientWidth,H=stage.clientHeight,list=[];
    for(let i=1;i<=n;i++){
      const page=await doc.getPage(i),vp1=page.getViewport({scale:1});
      // resolución suficiente para la PDI sin que pese demasiado (máx. ~2000 px de lado)
      const k=Math.min(2000/Math.max(vp1.width,vp1.height),Math.max(W/vp1.width,H/vp1.height)*1.5),vp=page.getViewport({scale:k});
      const c=document.createElement('canvas');c.width=Math.round(vp.width);c.height=Math.round(vp.height);
      const x=c.getContext('2d');x.fillStyle='#fff';x.fillRect(0,0,c.width,c.height);
      await page.render({canvasContext:x,viewport:vp}).promise;
      const pg=newPage('plain');pg.img=c.toDataURL('image/jpeg',.85);list.push(pg);
      toast(`Preparando página ${i} de ${n}…`);
    }
    const at=cur+1;pages.splice(at,0,...list);gotoPage(at);persist();
    toast(n===1?'Ficha añadida como página nueva':`${n} páginas añadidas a la pizarra`);
  }catch(e){toast('No se pudo leer el PDF')}
}
function insertFiles(files,at){
  for(const f of files){
    if(f.type==='application/pdf'||/\.pdf$/i.test(f.name))importPDF(f);
    else if(f.type.startsWith('image/'))insertImageFile(f,at);
  }
}
// Pegar (Ctrl+V) y arrastrar archivos sobre la pizarra
document.addEventListener('paste',e=>{
  if(e.target.closest&&e.target.closest('textarea,input,[contenteditable]'))return;
  const fs=[...(e.clipboardData&&e.clipboardData.files||[])];if(fs.length){e.preventDefault();insertFiles(fs)}
});
stage.addEventListener('dragover',e=>{e.preventDefault()});
stage.addEventListener('drop',e=>{e.preventDefault();const r=stage.getBoundingClientRect();insertFiles([...e.dataTransfer.files],{x:e.clientX-r.left,y:e.clientY-r.top})});
const fileIn=(accept,capture)=>{const i=h('input',{type:'file',accept,hidden:''});if(capture)i.setAttribute('capture',capture);i.multiple=!capture;i.addEventListener('change',()=>{insertFiles([...i.files]);i.value=''});document.body.append(i);return i};
const inImg=fileIn('image/*'),inCam=fileIn('image/*','environment'),inPdf=fileIn('application/pdf,.pdf');
const insertNodes=()=>[
  h('button',{class:'wide',onclick:()=>{closePop();inImg.click()}},...ib('image','Imagen')),
  h('button',{class:'wide',onclick:()=>{closePop();inCam.click()}},...ib('camera','Foto con la cámara')),
  h('button',{class:'wide',onclick:()=>{closePop();inPdf.click()}},...ib('pdf','Ficha o libro en PDF')),
];

/* --- Cambiar el tamaño de una imagen seleccionada: asa en la esquina --- */
const resizeHandle=h('div',{class:'selhandle','aria-label':'Cambiar tamaño'});
stage.append(resizeHandle);
function placeHandle(){
  if(!sel||sel.type!=='img'){resizeHandle.style.display='none';return}
  resizeHandle.style.display='block';resizeHandle.style.left=(sel.x+sel.w-14)+'px';resizeHandle.style.top=(sel.y+sel.h-14)+'px';
}
(()=>{
  let d=null;
  resizeHandle.addEventListener('pointerdown',e=>{if(!sel||sel.type!=='img')return;e.stopPropagation();resizeHandle.setPointerCapture(e.pointerId);d={x:e.clientX,w:sel.w,h:sel.h,s:sel}});
  resizeHandle.addEventListener('pointermove',e=>{
    if(!d)return;const w=Math.max(40,d.w+(e.clientX-d.x));d.s.w=Math.round(w);d.s.h=Math.round(w*d.h/d.w);drawBg();setSel(d.s);
  });
  const end=()=>{if(!d)return;const s=d.s;if(s.w!==d.w)record({t:'size',s,a:{w:d.w,h:d.h},b:{w:s.w,h:s.h}});d=null};
  resizeHandle.addEventListener('pointerup',end);resizeHandle.addEventListener('pointercancel',end);
})();

