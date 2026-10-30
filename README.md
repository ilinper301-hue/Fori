# Fori: pizarra del aula

Pizarra digital y panel de asamblea para la **Pantalla Digital Interactiva (PDI)** de un aula de primaria. Pensada para usarse a pantalla completa con el dedo o el lápiz: botones grandes, letra legible a distancia y controles delicados protegidos con pulsación larga. Funciona sin servidor, se puede instalar como app y funciona sin conexión.

**Abrir la app:** https://ilinper301-hue.github.io/fori/

## Qué incluye
- **Pizarra:** lápiz, fluorescente, borrador, formas (con o sin relleno), texto y herramienta para mover, duplicar o borrar lo dibujado. Paleta de 24 colores más color personalizado. Deshacer y rehacer.
- **Fondos:** liso, cuadrícula, puntos, pauta de doble línea, pauta Montessori y cuadrovía, en tres tamaños, e imagen de fondo.
- **Páginas:** varias páginas con guardado automático. Exportar una página como imagen o todas en PDF.
- **Tres modos de pantalla:** completa (todas las herramientas), mínima (pantalla libre con una barra pequeña) y libre (sin herramientas).
- **Asamblea:** calendario, tiempo, estación, emociones de la clase y días de cole.
- **Gestión del aula:** alumno al azar, parejas y grupos, encargados, horario del día (con pictogramas de ARASAAC), semáforo de trabajo, temporizador y cronómetro, medidor de ruido y contadores de puntos. Varias clases con su propia lista.
- **Apoyo a la explicación:** foco de atención y notas adhesivas.
- **Matemáticas:** base 10, reloj analógico y digital (con la hora en palabras), regla y transportador, monedas y billetes de euro, recta numérica, fracciones, tabla del 100, dados, geoplano, regletas de Cuisenaire y tangram con retos.
- **Privacidad:** no hay cuentas ni servidor. Alumnos, ajustes y pizarras se guardan solo en el navegador del equipo. *Ajustes → Exportar datos* hace una copia de seguridad de alumnos y ajustes.

## Archivos
| Archivo | Para qué sirve |
|---|---|
| `index.html` | La app completa |
| `sw.js` | Funcionamiento sin conexión y actualizaciones |
| `manifest.webmanifest` | Datos para instalarla como app |
| `icon.svg`, `icon-fav.svg`, `icon-mark.svg`, `icon-192.png`, `icon-512.png`, `apple-touch-icon.png`, `favicon-32.png` | Icono de la app, de la pestaña y marca de la barra superior |
| `fonts/` | Fuente Inter (licencia OFL) |
| `billetes/` (opcional) | Imágenes oficiales del BCE (`5.jpg`, `10.jpg`, `20.jpg`, `50.jpg`, `100.jpg`, `200.jpg`) para el modelo «Imagen real» de billetes |

## Publicar
GitHub Pages sirve la rama `main` desde la raíz (*Settings → Pages*). Para instalarla en la PDI, ábrela en Chrome o Edge y pulsa **Instalar aplicación** en la barra de direcciones.

## Créditos
- Pictogramas: Sergio Palao. Origen: ARASAAC (https://arasaac.org). Licencia: CC BY-NC-SA. Propiedad: Gobierno de Aragón (España).
- Fuente Inter: SIL Open Font License (ver `fonts/LICENSE-Inter.txt`).
- Imágenes de billetes: Banco Central Europeo, según sus normas de reproducción.
