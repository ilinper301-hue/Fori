#!/usr/bin/env python3
"""Genera index.html juntando las partes de src/ (CSS y JS en orden alfabético).
Uso: python3 tools/build.py   (desde la carpeta del proyecto)"""
import glob,hashlib,os,re
R=os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
def cat(pat):
    out=[]
    for f in sorted(glob.glob(os.path.join(R,pat))):
        t=open(f,encoding='utf-8').read()
        out.append(t[:-1] if t.endswith('\n') else t)
    return '\n'.join(out)
tpl=open(os.path.join(R,'src','index.template.html'),encoding='utf-8').read()
css=['base','estilo-fori','modulos']  # orden fijo de las hojas de estilo
html=tpl.replace('<!--CSS-->','\n'.join(open(os.path.join(R,'src','css',n+'.css'),encoding='utf-8').read().rstrip('\n') for n in css)+('\n'+cat('src/css/extra-*.css') if glob.glob(os.path.join(R,'src/css/extra-*.css')) else ''),1)
html=html.replace('<!--JS-->',cat('src/js/*.js'),1)
open(os.path.join(R,'index.html'),'w',encoding='utf-8').write(html)
print('index.html generado')
# Versión de caché del service worker: sale sola del contenido (index.html + sw.js sin esa línea).
# Si algo cambia, cambia el nombre y los dispositivos descargan lo nuevo; si no cambia nada, queda igual.
sw=os.path.join(R,'sw.js');t=open(sw,encoding='utf-8').read()
rx=re.compile(r"^const CACHE = '[^']*';",re.M)
h=hashlib.sha1()
h.update(open(os.path.join(R,'index.html'),'rb').read());h.update(rx.sub('',t).encode('utf-8'))
v='fori-'+h.hexdigest()[:8]
open(sw,'w',encoding='utf-8').write(rx.sub("const CACHE = '%s';"%v,t,1))
print('caché',v)
