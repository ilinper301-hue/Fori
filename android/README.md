# Fori para Android

App de Android (Kotlin) que abre **la Fori publicada** (`https://ilinper301-hue.github.io/fori/`) a pantalla completa en un WebView. No lleva una copia de Fori: cada mejora que se publica en `main` llega sola a la APK. Sin conexión responde el service worker de Fori (hace falta internet solo la primera vez).

**Descargar la última APK:** https://github.com/ilinper301-hue/fori/releases/latest/download/Fori.apk

## Qué hace la app (y no hace el WebView de serie)

| Archivo | Para qué |
|---|---|
| `MainActivity.kt` | Pantalla completa sin barras del sistema y pantalla siempre encendida; elegir archivos (imágenes, PDF, `.fori`, copias) y hacer fotos con la cámara; micrófono para el medidor de ruido (lo pide la primera vez); los enlaces que no son de Fori (Lectori, Barri, ARASAAC…) se abren en el navegador; aviso propio si no hay conexión la primera vez; Atrás vuelve atrás dentro de Fori. |
| `Archivos.kt` | Recibe de Fori los archivos que se descargan (imagen de página, lección `.fori`, datos, copia completa) y los guarda en **Descargas › Fori** (Android 7-9: cuadro «Guardar como»). «Guardar todas en PDF» abre el cuadro de impresión de Android, con «Guardar como PDF». |
| `assets/fori-android.js` | Se inyecta al cargar Fori: manda las descargas y la impresión a la app (por trozos de 3 MB) y oculta el botón de pantalla completa. En Chrome no existe, así que Fori en el navegador no cambia. Se prueba en `tools/test.js` (`FORI_SOLO=android`). |
| `assets/sin-conexion.html` | Aviso si la primera vez no hay internet. |

La app se identifica añadiendo `ForiAndroid/<versión>` al *user agent* y expone `window.ForiAndroid` (`inicio`, `trozo`, `fin`, `error`, `aviso`, `version`).

**Datos.** La APK guarda la pizarra, las lecciones y los ajustes aparte de Chrome (son navegadores distintos). Para pasarlo todo: en Chrome, *Ajustes → Copia de seguridad → Copia completa*; en la APK, *Ajustes → Abrir copia completa* y elegir el archivo `.foricopia` en Descargas. Lo que Fori lee de Tabula o Charta en el mismo navegador no llega a la APK (sí funcionan los archivos de copia de Tabula).

## Compilar y publicar

La compila GitHub Actions (`.github/workflows/android.yml`) cada vez que cambia `android/`:

- Con los secretos `FORI_KEYSTORE` (la clave en base64) y `FORI_KEYSTORE_PASSWORD`, firma la APK y, si es un cambio en `main` o se lanza a mano (*Actions → APK de Android → Run workflow*), la publica en Releases como `Fori.apk` (etiqueta `apk-<número>`). El número de versión sube en cada compilación, así que la nueva se instala encima de la anterior **sin perder lo guardado**.
- Sin los secretos, compila con una clave de usar y tirar solo para comprobar que todo va bien (artefacto `Fori-apk-PRUEBA-no-instalar`: no instalarlo).

**La clave de firma no se puede perder ni cambiar.** Android solo acepta una actualización firmada con la misma clave; con otra habría que desinstalar la app, y al desinstalar se borra lo guardado en ella.

Versiones: Android 7.0 o superior (`minSdk 24`), `targetSdk 35`, AGP 8.7, Kotlin 2.0, Gradle 8.11 (lo pone el workflow; no hay *wrapper*).
