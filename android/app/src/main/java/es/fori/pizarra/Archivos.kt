package es.fori.pizarra

import android.content.ContentValues
import android.net.Uri
import android.os.Build
import android.os.Environment
import android.os.Handler
import android.os.Looper
import android.print.PrintAttributes
import android.print.PrintManager
import android.provider.MediaStore
import android.util.Base64
import android.webkit.JavascriptInterface
import android.webkit.WebView
import android.webkit.WebViewClient
import android.widget.Toast
import java.io.File
import java.io.FileOutputStream
import java.util.concurrent.atomic.AtomicInteger

/**
 * Archivos que salen de Fori: descargas (imagen de página, lección .fori, datos, copia completa) y PDF.
 * assets/fori-android.js los manda por trozos en base64 (ForiAndroid.inicio / trozo / fin) y aquí se juntan
 * en un archivo temporal, para no pasar de golpe decenas de MB por el puente.
 * - destino "descargar": Android 10 o más → Descargas/Fori directamente; Android 7 a 9 → cuadro «Guardar como».
 * - destino "imprimir": se abre la página en un WebView aparte y el cuadro de impresión de Android («Guardar como PDF»).
 */
class Archivos(private val act: MainActivity) {

    private class Envio(val nombre: String, val mime: String, val destino: String, val tmp: File) {
        val out = FileOutputStream(tmp)
        var ok = true
    }

    private val ui = Handler(Looper.getMainLooper())
    private val ids = AtomicInteger(0)
    private val envios = HashMap<Int, Envio>()
    private var porGuardar: Envio? = null  // Android 7-9: esperando a que se elija dónde
    private var impresion: WebView? = null // se conserva mientras dura la impresión

    private val dir: File get() = File(act.cacheDir, "envios").apply { mkdirs() }

    fun aviso(t: String) = ui.post { Toast.makeText(act, t, Toast.LENGTH_LONG).show() }

    val puente = Puente()

    /** Lo que ve Fori como window.ForiAndroid */
    inner class Puente {
        @JavascriptInterface
        fun inicio(nombre: String?, mime: String?, destino: String?): Int {
            val id = ids.incrementAndGet()
            val n = limpio(nombre)
            synchronized(envios) { envios[id] = Envio(n, mimeDe(n, mime), destino ?: "descargar", File(dir, "e$id")) }
            return id
        }

        @JavascriptInterface
        fun trozo(id: Int, b64: String?) {
            val e = synchronized(envios) { envios[id] } ?: return
            if (!e.ok || b64 == null) return
            try { e.out.write(Base64.decode(b64, Base64.DEFAULT)) } catch (x: Exception) { e.ok = false }
        }

        @JavascriptInterface
        fun fin(id: Int) {
            val e = synchronized(envios) { envios.remove(id) } ?: return
            try { e.out.close() } catch (x: Exception) { e.ok = false }
            if (!e.ok) { e.tmp.delete(); aviso("No se ha podido guardar el archivo"); return }
            ui.post { if (e.destino == "imprimir") imprimir(e) else descargar(e) }
        }

        @JavascriptInterface
        fun error(id: Int) {
            val e = synchronized(envios) { envios.remove(id) } ?: return
            try { e.out.close() } catch (x: Exception) {}
            e.tmp.delete(); aviso("No se ha podido leer el archivo")
        }

        @JavascriptInterface
        fun aviso(t: String?) { if (!t.isNullOrBlank()) this@Archivos.aviso(t) }

        @JavascriptInterface
        fun version(): String = act.packageManager.getPackageInfo(act.packageName, 0).versionName ?: ""
    }

    // ---------- Descargar ----------
    private fun descargar(e: Envio) {
        if (Build.VERSION.SDK_INT >= 29) {
            Thread {
                try {
                    val cv = ContentValues().apply {
                        put(MediaStore.MediaColumns.DISPLAY_NAME, e.nombre)
                        put(MediaStore.MediaColumns.MIME_TYPE, e.mime)
                        put(MediaStore.MediaColumns.RELATIVE_PATH, Environment.DIRECTORY_DOWNLOADS + "/Fori")
                        put(MediaStore.MediaColumns.IS_PENDING, 1)
                    }
                    val r = act.contentResolver
                    val uri = r.insert(MediaStore.Downloads.EXTERNAL_CONTENT_URI, cv) ?: throw Exception("sin sitio")
                    r.openOutputStream(uri)!!.use { o -> e.tmp.inputStream().use { it.copyTo(o) } }
                    cv.clear(); cv.put(MediaStore.MediaColumns.IS_PENDING, 0); r.update(uri, cv, null, null)
                    aviso("Guardado en Descargas › Fori: ${e.nombre}")
                } catch (x: Exception) {
                    aviso("No se ha podido guardar en Descargas")
                } finally {
                    e.tmp.delete()
                }
            }.start()
        } else {
            porGuardar?.tmp?.delete()
            porGuardar = e
            act.pedirDondeGuardar(e.nombre, e.mime)
        }
    }

    /** Respuesta del cuadro «Guardar como» (Android 7-9). */
    fun guardadoElegido(uri: Uri?) {
        val e = porGuardar ?: return
        porGuardar = null
        if (uri == null) { e.tmp.delete(); return }
        Thread {
            try {
                act.contentResolver.openOutputStream(uri)!!.use { o -> e.tmp.inputStream().use { it.copyTo(o) } }
                aviso("Guardado: ${e.nombre}")
            } catch (x: Exception) {
                aviso("No se ha podido guardar el archivo")
            } finally {
                e.tmp.delete()
            }
        }.start()
    }

    // ---------- Imprimir / guardar como PDF ----------
    private fun imprimir(e: Envio) {
        val html = File(dir, "imprimir.html")
        html.delete()
        if (!e.tmp.renameTo(html)) { e.tmp.delete(); aviso("No se ha podido preparar el PDF"); return }
        impresion?.destroy()
        val w = WebView(act)
        impresion = w
        w.settings.allowFileAccess = true // solo para abrir el archivo temporal que acaba de escribir Fori
        w.settings.javaScriptEnabled = false
        w.webViewClient = object : WebViewClient() {
            var hecho = false
            override fun onPageFinished(view: WebView, url: String?) {
                if (hecho) return
                hecho = true
                ui.postDelayed({
                    try {
                        val pm = act.getSystemService(android.content.Context.PRINT_SERVICE) as PrintManager
                        val attrs = PrintAttributes.Builder()
                            .setMediaSize(PrintAttributes.MediaSize.ISO_A4.asLandscape())
                            .build()
                        pm.print("Fori", view.createPrintDocumentAdapter("Fori"), attrs)
                    } catch (x: Exception) {
                        aviso("No se ha podido abrir la impresión")
                    }
                }, 400)
            }
        }
        w.loadUrl(Uri.fromFile(html).toString())
    }

    fun cerrar() {
        impresion?.destroy(); impresion = null
        synchronized(envios) { envios.values.forEach { try { it.out.close() } catch (x: Exception) {}; it.tmp.delete() }; envios.clear() }
    }

    // ---------- Utilidades ----------
    private fun limpio(n: String?): String {
        val s = (n ?: "").replace(Regex("[\\\\/:*?\"<>|\\u0000-\\u001f]+"), " ").trim()
        return if (s.isEmpty()) "archivo" else s.take(120)
    }

    /** Tipo MIME a partir de la extensión: así Android no le añade otra (un .fori como JSON acabaría en «.fori.json»). */
    private fun mimeDe(nombre: String, mime: String?): String {
        return when (nombre.substringAfterLast('.', "").lowercase()) {
            "png" -> "image/png"
            "jpg", "jpeg" -> "image/jpeg"
            "pdf" -> "application/pdf"
            "json" -> "application/json"
            "html" -> "text/html"
            "" -> mime?.takeIf { it.isNotBlank() } ?: "application/octet-stream"
            else -> "application/octet-stream"
        }
    }
}
