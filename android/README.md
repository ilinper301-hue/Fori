# Fori para Android

App de Android (Kotlin) que abre **la Fori publicada** (`https://ilinper301-hue.github.io/Fori/`) a pantalla completa en un WebView. No lleva una copia de Fori: cada mejora que se publica en `main` llega sola a la APK. Sin conexión responde el service worker de Fori (hace falta internet solo la primera vez).

**Descargar la última APK:** https://github.com/ilinper301-hue/fori/releases/latest/download/Fori.apk

## Qué hace la app (y no hace el WebView de serie)

| Archivo | Para qué |
|---|---|
| `MainActivity.kt` | Pantalla completa sin barras del sistema y pantalla siempre encendida; elegir archivos (imágenes, PDF, `.fori`, copias) y hacer fotos con la cámara; micrófono para el medidor de ruido (lo pide la primera vez); los enlaces que no son de Fori (Lectori, Barri, ARASAAC…) se abren en el navegador; aviso propio si no hay conexión la primera vez; Atrás vuelve atrás dentro de Fori. |
| `Archivos.kt` | Recibe de Fori los archivos que se descargan (imagen de página, lección `.fori`, datos, copia completa) y los guarda en **Descargas › Fori** (Android 7-9: cuadro «Guardar como»). «Guardar todas en PDF» abre el cuadro de impresión de Android, con «Guardar como PDF». |
| `assets/fori-android.js` | Se inyecta al cargar Fori: manda las descargas y la impresión a la app (por trozos de 3 MB) y oculta el botón de pantalla completa. En Chrome no existe, así que Fori en el navegador no cambia. Se prueba en `tools/test.js` (`FORI_SOLO=android`). |
| `assets/sin-conexion.html` | Aviso si la primera vez no hay internet. |
| `CapaService.kt` | **Pintar encima de otras apps** (ver abajo). |
| `res/xml/atajos.xml` | Atajo del icono (mantenerlo pulsado): «Pintar encima». |

La app se identifica añadiendo `ForiAndroid/<versión>` al *user agent* y expone `window.ForiAndroid` (`inicio`, `trozo`, `fin`, `error`, `aviso`, `version`, `abrirCapa`).

**Datos.** La APK guarda la pizarra, las lecciones y los ajustes aparte de Chrome (son navegadores distintos). Para pasarlo todo: en Chrome, *Ajustes → Copia de seguridad → Copia completa*; en la APK, *Ajustes → Abrir copia completa* y elegir el archivo `.foricopia` en Descargas. Lo que Fori lee de Tabula o Charta en el mismo navegador no llega a la APK (sí funcionan los archivos de copia de Tabula).

## Pintar encima de otras apps

En Fori, el botón **«Pintar encima»** de la barra de arriba (solo sale en Android; hay que mantenerlo pulsado) abre la capa. También el atajo del icono y la dirección `fori://capa` (así lo abre Fori desde Chrome; si la app no está instalada, Chrome vuelve a Fori, que explica cómo descargarla).

- La primera vez Android pide el permiso **«Mostrar sobre otras apps»** (la app lo explica y abre la pantalla del permiso) y, en Android 13+, el de notificaciones (si se dice que no, funciona igual).
- `CapaService` es un servicio en primer plano (con notificación y botón «Cerrar») con dos ventanas: la **capa**, un WebView transparente a pantalla completa con Fori en `?capa=1`, y una **burbuja** que se arrastra.
- **Fori en modo capa** (`src/js/38b-modo-capa.js`) es una hoja vacía en memoria: no lee ni guarda la pizarra ni los ajustes (solo recuerda color, grosor y sitio de la barra en `fori-capa`). Barra grande: lápiz, fluorescente, borrador, 8 colores, 3 grosores, deshacer, borrar todo, «Tocar debajo», ocultar y cerrar (dos toques si hay algo pintado).
- **Burbuja:** ✏️ azul = pintando (tocarla oculta lo pintado); ✏️ oscura = oculta (tocarla vuelve a mostrarlo); 👆 verde = tocando la app de debajo (tocarla vuelve a pintar).
- **Tocar debajo:** la capa deja pasar los toques (`FLAG_NOT_TOUCHABLE`) y lo pintado se sigue viendo. Desde Android 12 eso solo se permite si la ventana es algo transparente, así que mientras tanto lo pintado se ve un poco más claro (opacidad 0,8).
- Cerrar (✕ de la barra o «Cerrar» en la notificación) quita la capa y la burbuja; lo pintado se pierde.
- Puente: la capa llama a `ForiAndroid.capa('debajo'|'ocultar'|'cerrar')`; la app llama a `window.__foriCapa('pintar')`. En la pantalla principal, `ForiAndroid.abrirCapa()`.

## Compilar y publicar

La compila GitHub Actions (`.github/workflows/android.yml`) cada vez que cambia `android/`:

- Con los secretos `FORI_KEYSTORE` (la clave en base64) y `FORI_KEYSTORE_PASSWORD`, firma la APK y, si es un cambio en `main` o se lanza a mano (*Actions → APK de Android → Run workflow*), la publica en Releases como `Fori.apk` (etiqueta `apk-<número>`). El número de versión sube en cada compilación, así que la nueva se instala encima de la anterior **sin perder lo guardado**.
- Sin los secretos, compila con una clave de usar y tirar solo para comprobar que todo va bien (artefacto `Fori-apk-PRUEBA-no-instalar`: no instalarlo).

**La clave de firma no se puede perder ni cambiar.** Android solo acepta una actualización firmada con la misma clave; con otra habría que desinstalar la app, y al desinstalar se borra lo guardado en ella.

Versiones: Android 7.0 o superior (`minSdk 24`), `targetSdk 35`, AGP 8.7, Kotlin 2.0, Gradle 8.11 (lo pone el workflow; no hay *wrapper*).
