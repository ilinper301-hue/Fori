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


// Puntos de enganche para que cada módulo se apunte solo, sin que la interfaz tenga que saber cuáles hay.
// pageMenu: funciones que devuelven botones para el menú de «Página».
// pageUI: funciones que se llaman cada vez que cambia lo que se ve de la página (etiquetas, barras).
// tools: las herramientas, apuntadas con tool().
// fondos: los fondos de página (pautas y plantillas), apuntados con fondo().
const REG={pageMenu:[],pageUI:[],tools:[],fondos:[]};
/* Registro de herramientas. Cada módulo apunta la suya al final de su archivo con tool({...}):
     id            el de su botón y su ventana
     group         'aula' y 'apoyo' (barra derecha) o 'mates' (menú Matemáticas); decide también el color de la ventana
     order         posición dentro del grupo
     icon, label   icono y texto del botón
     title, build, w   título, constructor y ancho de su ventana
     run, on       para las que no son una ventana (regla, transportador, foco, nota): qué hacen y si están puestas
     obj           para esas mismas, si se pueden esconder desde la bandeja: función que devuelve su objeto (con .el)
     clear         qué hace «Reiniciar» con ella
     hidden        es del grupo pero no tiene botón (ajustes de la regla)
   Apuntar otra vez un id ya apuntado cambia solo lo que se indique (así los pictogramas sustituyen al horario y a los encargados). */
function tool(t){const o=toolById(t.id);if(o)Object.assign(o,t);else REG.tools.push(t)}
const toolById=id=>REG.tools.find(t=>t.id===id);
const toolsOf=g=>REG.tools.filter(t=>t.group===g&&!t.hidden).sort((a,b)=>a.order-b.order);

/* Registro de fondos. Cada fondo se apunta con fondo({...}) (los de siempre, en 05-pizarra.js):
     id            el texto que guarda cada página en p.bg
     group         'pauta' (se repite por toda la página) o 'plantilla' (se dibuja una vez, encajada en la página)
     order         posición dentro del grupo
     label         nombre en el menú
     opts          opciones de pulsación larga: lista de [valor, rótulo] (en las pautas, los cuatro tamaños); sin opts no hay pulsación larga
     def           opción por defecto (valor o función que la da); si la página no lleva p.bgo se usa esta
     paint(g)      dibuja; g = {ctx,x0,y0,x1,y1,dark,opt,k,lw,soft,strong,red,from,line,vline}
   Una página guarda p.bg (id) y, si se eligió, p.bgo (la opción: número entre 0,5 y 3 o texto corto). */
function fondo(f){const o=fondoById(f.id);if(o)Object.assign(o,f);else REG.fondos.push(f)}
const fondoById=id=>REG.fondos.find(f=>f.id===id);
const fondosOf=g=>REG.fondos.filter(f=>f.group===g).sort((a,b)=>a.order-b.order);
// Un id desconocido (p. ej. de un .fori hecho con una versión más nueva) se pinta y se rotula como «Liso»; el dato no se toca
const fondoOf=id=>fondoById(id)||fondoById('plain');
// La opción de un fondo: la de la página si es válida y, si no, la por defecto
const bgoOk=o=>(typeof o==='number'&&isFinite(o)&&o>=.5&&o<=3)||(typeof o==='string'&&o.length>0&&o.length<20);
const bgoF=o=>bgoOk(o)?{bgo:o}:{}; // para copiar bgo campo a campo solo si existe y vale
const fondoOpt=(f,o)=>bgoOk(o)?o:(typeof f.def==='function'?f.def():f.def);
