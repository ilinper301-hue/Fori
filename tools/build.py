#!/usr/bin/env python3
"""Genera index.html juntando las partes de src/ (CSS y JS en orden alfabético).
Uso: python3 tools/build.py   (desde la carpeta del proyecto)"""
import glob,os
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
