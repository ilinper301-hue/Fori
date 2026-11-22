# Fori: pizarra del aula

Pizarra digital y panel de asamblea para la **Pantalla Digital Interactiva (PDI)** de un aula de primaria. Pensada para usarse a pantalla completa con el dedo o el lápiz: botones grandes, letra legible a distancia y controles delicados protegidos con pulsación larga. Funciona sin servidor, se puede instalar como app y funciona sin conexión.

**Abrir la app:** https://ilinper301-hue.github.io/Fori/

## Qué incluye
- **Pizarra:** lápiz, fluorescente, borrador, formas (con o sin relleno), texto y herramienta para mover, duplicar o borrar lo dibujado. Paleta de 24 colores más color personalizado. Deshacer y rehacer. El borrador quita de verdad lo que toca: corta los trazos y las formas sin relleno por donde pasa y borra enteros los textos y las formas con relleno (las imágenes se borran con Mover).
- **Fondos:** liso, cuadrícula, puntos, pauta de doble línea, pauta Montessori y cuadrovía, en tres tamaños, e imagen de fondo.
- **Páginas:** varias páginas con guardado automático (cada página se guarda por separado, y las imágenes y fichas una sola vez, así que escribir no se vuelve lento aunque haya muchas páginas con PDF). Exportar una página como imagen o todas en PDF.
- **Cajón de herramientas:** el botón «Herramientas» abre todas las herramientas por grupos (Aula, Apoyo y Matemáticas). Manteniendo pulsada una, se pone en la barra derecha o se quita: así cada docente tiene a mano las que usa.
- **Cualquier pantalla:** las barras se adaptan solas para que no se corte ningún botón. En pantallas bajas los grosores pasan a un solo botón; en tabletas y móviles la barra de dibujo se estrecha y la pizarra gana sitio (en el móvil en vertical ocupa todo el ancho).
- **Tres modos de pantalla:** completa (todas las herramientas), mínima (pantalla libre con una barra pequeña) y libre (sin herramientas).
- **Asamblea:** calendario, tiempo, estación, emociones de la clase y días de cole.
- **Gestión del aula:** alumno al azar, parejas y grupos, encargados, horario del día (con pictogramas de ARASAAC), semáforo de trabajo, temporizador y cronómetro, medidor de ruido y contadores de puntos. Varias clases con su propia lista.
- **Apoyo a la explicación:** foco de atención y notas adhesivas.
- **Matemáticas:** base 10, reloj analógico y digital (con la hora en palabras), regla y transportador, monedas y billetes de euro, recta numérica, fracciones, tabla del 100, dados, geoplano, regletas de Cuisenaire y tangram con retos.
- **Insertar:** imágenes y fotos (que se mueven y se agrandan) y fichas o libros en PDF (cada página del PDF pasa a ser una página de la pizarra para escribir encima).
- **Lecciones:** guarda las páginas como lección para prepararla en casa y abrirla en la PDI; se pueden exportar e importar como archivo `.fori`. Cada página tiene un tamaño propio y se ve entera, centrada y sin deformar en cualquier pantalla; la pauta y la ficha de fondo acompañan a lo escrito, y cambiar de modo o de pantalla no encoge ni mueve nada.
- **Pizarra dividida** en 2, 3 o 4 zonas, cada una con su color y su goma, para que salgan varios alumnos a la vez.
- **Ruleta** para elegir alumno, **regla** para trazar líneas apoyándose en ella y letra **Fredoka** en la herramienta Texto.
- **Tabula:** importa clases, alumnos y horario desde Tabula (mismo navegador o archivo de copia). **PIN** opcional para Ajustes.
- **Charta:** en Charta, «▶ Proyectar en Fori» convierte la ficha en páginas (la actividad entera y un ejercicio por página) para escribir encima; la barra **Solución** muestra las respuestas paso a paso (+ / − / Todo). También `?ficha=ID` o `?comp=…`: Fori se la pide a Charta.
- **Privacidad:** no hay cuentas ni servidor. Alumnos, ajustes y pizarras se guardan solo en el navegador del equipo. *Ajustes → Exportar datos* hace una copia de seguridad de alumnos y ajustes, y *Copia completa* guarda en un solo archivo (`.foricopia`) también la pizarra y las lecciones, para pasarlo todo a otro equipo o a la app de Android.

## Archivos
| Archivo | Para qué sirve |
|---|---|
| `index.html` | La app completa |
| `sw.js` | Funcionamiento sin conexión y actualizaciones |
| `manifest.webmanifest` | Datos para instalarla como app |
| `icon.svg`, `icon-fav.svg`, `icon-mark.svg`, `icon-192.png`, `icon-512.png`, `apple-touch-icon.png`, `favicon-32.png` | Icono de la app, de la pestaña y marca de la barra superior |
| `fonts/` | Fuentes Inter y Fredoka (licencia OFL) |
| `android/` | App de Android (APK) que abre esta Fori a pantalla completa; ver `android/README.md` |
| `billetes/` (opcional) | Imágenes oficiales del BCE (`5.jpg`, `10.jpg`, `20.jpg`, `50.jpg`, `100.jpg`, `200.jpg`) para el modelo «Imagen real» de billetes |

## Publicar
GitHub Pages sirve la rama `main` desde la raíz (*Settings → Pages*). Para instalarla en la PDI, ábrela en Chrome o Edge y pulsa **Instalar aplicación** en la barra de direcciones.

## App de Android
Para la PDI con Android: **https://github.com/ilinper301-hue/fori/releases/latest/download/Fori.apk** (se instala a mano, sin Google Play). Abre esta misma Fori a pantalla completa y se actualiza sola con cada cambio publicado. Además permite **pintar encima de otras apps** (vídeos, PDF, libros digitales): botón «Pintar encima» (mantener pulsado), que solo aparece en Android. Detalles en `android/README.md`.

## Créditos
- Pictogramas: Sergio Palao. Origen: ARASAAC (https://arasaac.org). Licencia: CC BY-NC-SA. Propiedad: Gobierno de Aragón (España).
- Fuentes Inter y Fredoka: SIL Open Font License (ver `fonts/LICENSE-Inter.txt` y `fonts/OFL-Fredoka.txt`).
- Lector de PDF: pdf.js (Mozilla, licencia Apache 2.0), que se descarga la primera vez que se abre un PDF.
- Imágenes de billetes: Banco Central Europeo, según sus normas de reproducción.

## Desarrollo
El código está separado en partes dentro de `src/` y se junta en un único `index.html` (que es lo que se publica):

- `src/index.template.html`: estructura de la página.
- `src/css/`: estilos (`base.css`, `estilo-fori.css`, `modulos.css`).
- `src/js/`: un archivo por módulo (pizarra, herramientas del aula, matemáticas, asamblea, interfaz…). Se juntan en orden alfabético, por eso empiezan por un número.

**Herramientas.** Cada herramienta (barra derecha y menú Matemáticas) se apunta sola al final de su archivo con `tool({id, group, order, icon, label, title, build, w})`; la interfaz, la bandeja y «Reiniciar» leen ese registro (`REG.tools`, explicado en `src/js/00-base.js`). Para añadir una herramienta basta con crear su archivo y apuntarla: no hay que tocar la interfaz, y sale sola en el cajón (`33c-cajon-de-herramientas.js`).

**Tamaños de pantalla.** `layout()` (`35b-pantallas-pequenas.js`) decide la colocación según lo que cabe y la apunta en `<body data-lay>`; los estilos de cada colocación están en `src/css/extra-pantallas.css`.

Después de cambiar algo en `src/`:

```
python3 tools/build.py   # genera index.html
node tools/test.js       # prueba rápida (necesita Playwright)
```

No edites `index.html` a mano: se sobrescribe al generar.

## Ecosistema
Antes de tocar algo que una app lea o deje para otra (alumnado, resultados, enlaces entre apps), lee `ECOSISTEMA.md`: es el contrato común de las seis apps.
