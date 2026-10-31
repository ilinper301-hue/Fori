const $=(s,r=document)=>r.querySelector(s);
const $$=(s,r=document)=>[...r.querySelectorAll(s)];
const pad=n=>String(n).padStart(2,'0');
const clamp=(v,a,b)=>Math.min(Math.max(v,a),b);
function h(tag,props={},...kids){
  const e=document.createElement(tag);
  for(const [k,v] of Object.entries(props)){
    if(k==='class')e.className=v;
    else if(k==='style')e.style.cssText=v;
    else if(k==='html')e.innerHTML=v;
    else if(k.startsWith('on'))e.addEventListener(k.slice(2),v);
    else e.setAttribute(k,v);
  }
  for(const c of kids.flat()) if(c!=null&&c!==false) e.append(c.nodeType?c:document.createTextNode(c));
  return e;
}


// Puntos de enganche para que otros módulos añadan opciones a los menús sin tocar la interfaz.
// pageMenu: funciones que devuelven botones para el menú de «Página».
const REG={pageMenu:[]};
