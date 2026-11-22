package es.fori.pizarra

import android.Manifest
import android.annotation.SuppressLint
import android.app.Activity
import android.app.AlertDialog
import android.content.ActivityNotFoundException
import android.content.ClipData
import android.content.Intent
import android.content.pm.ApplicationInfo
import android.content.pm.PackageManager
import android.graphics.Color
import android.net.Uri
import android.os.Build
import android.os.Bundle
import android.provider.MediaStore
import android.provider.Settings
import android.view.View
import android.view.WindowInsets
import android.view.WindowInsetsController
import android.view.WindowManager
import android.webkit.PermissionRequest
import android.webkit.RenderProcessGoneDetail
import android.webkit.ValueCallback
import android.webkit.WebChromeClient
import android.webkit.WebResourceError
import android.webkit.WebResourceRequest
import android.webkit.WebView
import android.webkit.WebViewClient
import androidx.core.content.FileProvider
import java.io.File

/**
 * Fori para Android: abre la Fori publicada en GitHub Pages a pantalla completa en un WebView.
 * Así las mejoras de Fori llegan solas; sin conexión responde el service worker de Fori.
 * Lo que el WebView no trae de serie (elegir archivos, descargar, imprimir, micrófono) lo pone esta clase
 * junto con assets/fori-android.js y Archivos.kt.
 */
class MainActivity : Activity() {

    companion object {
        const val FORI_URL = "https://ilinper301-hue.github.io/fori/"
        private const val HOST = "ilinper301-hue.github.io"
        private const val REQ_ARCHIVO = 1
        private const val REQ_GUARDAR = 2
        private const val REQ_MICRO = 3
        private const val REQ_NOTI = 4
        private const val PREFS = "fori-app"

        /** ¿Es una dirección de Fori? (lo demás, como Lectori o Barri, se abre en el navegador) */
        fun esFori(u: Uri?): Boolean =
            u != null && u.scheme == "https" && u.host.equals(HOST, true) &&
                (u.path ?: "").lowercase().let { it == "/fori" || it.startsWith("/fori/") }
    }

    lateinit var web: WebView
        private set
    private lateinit var archivos: Archivos
    private var eligiendo: ValueCallback<Array<Uri>>? = null
    private var fotoUri: Uri? = null
    private var permisoPendiente: PermissionRequest? = null
    private var shim: String? = null
    private var capaPendiente = false // se ha ido a pedir el permiso de superponer y al volver se abre la capa

    @SuppressLint("SetJavaScriptEnabled")
    override fun onCreate(savedInstanceState: Bundle?) {
        super.onCreate(savedInstanceState)
        window.addFlags(WindowManager.LayoutParams.FLAG_KEEP_SCREEN_ON) // la PDI no se apaga en mitad de la clase
        if (Build.VERSION.SDK_INT >= 28) {
            window.attributes.layoutInDisplayCutoutMode =
                WindowManager.LayoutParams.LAYOUT_IN_DISPLAY_CUTOUT_MODE_SHORT_EDGES
        }
        if (applicationInfo.flags and ApplicationInfo.FLAG_DEBUGGABLE != 0) WebView.setWebContentsDebuggingEnabled(true)

        archivos = Archivos(this)
        web = WebView(this)
        web.setBackgroundColor(Color.parseColor("#13214A"))
        setContentView(web)

        web.settings.apply {
            javaScriptEnabled = true
            domStorageEnabled = true           // localStorage (ajustes y alumnos)
            @Suppress("DEPRECATION")
            databaseEnabled = true
            mediaPlaybackRequiresUserGesture = false // sonidos del temporizador
            allowFileAccess = false
            setSupportZoom(false)
            builtInZoomControls = false
            displayZoomControls = false
            textZoom = 100                      // el tamaño de letra del sistema no descoloca las barras
            useWideViewPort = true
            loadWithOverviewMode = false
            setSupportMultipleWindows(false)
            javaScriptCanOpenWindowsAutomatically = true
            userAgentString = "$userAgentString ForiAndroid/${versionName()}"
        }
        web.addJavascriptInterface(archivos.puente, "ForiAndroid")
        web.webViewClient = Cliente()
        web.webChromeClient = Chrome()

        if (savedInstanceState == null || web.restoreState(savedInstanceState) == null) web.loadUrl(FORI_URL)
        pantallaCompleta()
        if (savedInstanceState == null && esCapa(intent)) web.post { abrirCapa() }
    }

    // ---------- Pintar encima de otras apps (CapaService) ----------
    /** fori://capa: lo abre el botón «Pintar encima» de Fori en Chrome y el atajo del icono */
    private fun esCapa(i: Intent?): Boolean {
        val d = i?.data ?: return false
        if (d.scheme != "fori" || d.host != "capa") return false
        setIntent(Intent(Intent.ACTION_MAIN)) // para no volver a abrirla si Android recrea la pantalla
        return true
    }

    override fun onNewIntent(intent: Intent) {
        super.onNewIntent(intent)
        if (esCapa(intent)) abrirCapa()
    }

    /** Pide lo que haga falta (permiso de superponer y, una vez, el de notificaciones), abre la capa y se va al fondo */
    fun abrirCapa() {
        if (!CapaService.puede(this)) {
            AlertDialog.Builder(this)
                .setTitle("Pintar encima de otras apps")
                .setMessage("Para poner una capa transparente encima de otras apps, Android pide un permiso: " +
                    "«Mostrar sobre otras apps» (o «Superponer a otras apps»).\n\n" +
                    "En la pantalla siguiente activa Fori y vuelve con Atrás.")
                .setPositiveButton("Ir al permiso") { _, _ -> pedirSuperponer() }
                .setNegativeButton("Ahora no", null)
                .show()
            return
        }
        val prefs = getSharedPreferences(PREFS, MODE_PRIVATE)
        if (Build.VERSION.SDK_INT >= 33 && !prefs.getBoolean("noti-pedida", false) &&
            checkSelfPermission(Manifest.permission.POST_NOTIFICATIONS) != PackageManager.PERMISSION_GRANTED
        ) {
            // la notificación lleva «Cerrar»; si dice que no, la capa funciona igual
            prefs.edit().putBoolean("noti-pedida", true).apply()
            requestPermissions(arrayOf(Manifest.permission.POST_NOTIFICATIONS), REQ_NOTI)
            return
        }
        lanzarCapa()
    }

    private fun lanzarCapa() {
        try {
            CapaService.abrir(this)
            moveTaskToBack(true) // se ve la app que había debajo (o el escritorio), con la burbuja encima
        } catch (e: Exception) {
            archivos.aviso("No se ha podido abrir la capa para pintar encima")
        }
    }

    private fun pedirSuperponer() {
        val ajustes = listOf(
            Intent(Settings.ACTION_MANAGE_OVERLAY_PERMISSION, Uri.parse("package:$packageName")),
            Intent(Settings.ACTION_APPLICATION_DETAILS_SETTINGS, Uri.parse("package:$packageName"))
        )
        for (i in ajustes) {
            try { startActivity(i); capaPendiente = true; return } catch (e: ActivityNotFoundException) { }
        }
        archivos.aviso("No se encuentran los ajustes de permisos en este equipo")
    }

    private fun versionName(): String = try {
        packageManager.getPackageInfo(packageName, 0).versionName ?: "1"
    } catch (e: Exception) { "1" }

    // ---------- Pantalla completa (sin barras del sistema; se ven un momento deslizando desde el borde) ----------
    @Suppress("DEPRECATION") // setDecorFitsSystemWindows: en Android 15 ya es así por defecto
    private fun pantallaCompleta() {
        if (Build.VERSION.SDK_INT >= 30) {
            window.setDecorFitsSystemWindows(false)
            window.insetsController?.let {
                it.hide(WindowInsets.Type.systemBars())
                it.systemBarsBehavior = WindowInsetsController.BEHAVIOR_SHOW_TRANSIENT_BARS_BY_SWIPE
            }
        } else {
            @Suppress("DEPRECATION")
            window.decorView.systemUiVisibility = (View.SYSTEM_UI_FLAG_IMMERSIVE_STICKY
                or View.SYSTEM_UI_FLAG_FULLSCREEN or View.SYSTEM_UI_FLAG_HIDE_NAVIGATION
                or View.SYSTEM_UI_FLAG_LAYOUT_STABLE or View.SYSTEM_UI_FLAG_LAYOUT_FULLSCREEN
                or View.SYSTEM_UI_FLAG_LAYOUT_HIDE_NAVIGATION)
        }
    }

    override fun onWindowFocusChanged(hasFocus: Boolean) {
        super.onWindowFocusChanged(hasFocus)
        if (hasFocus) pantallaCompleta()
    }

    override fun onSaveInstanceState(outState: Bundle) {
        super.onSaveInstanceState(outState)
        web.saveState(outState)
    }

    override fun onResume() {
        super.onResume()
        web.onResume()
        if (capaPendiente) {
            capaPendiente = false
            if (CapaService.puede(this)) web.postDelayed({ abrirCapa() }, 300)
            else archivos.aviso("Sin el permiso «Mostrar sobre otras apps» no se puede pintar encima")
        }
    }
    override fun onPause() { web.onPause(); super.onPause() }
    override fun onDestroy() { archivos.cerrar(); web.destroy(); super.onDestroy() }

    @Deprecated("Atrás vuelve a la página anterior de Fori, si la hay")
    @Suppress("DEPRECATION")
    override fun onBackPressed() {
        if (web.canGoBack()) {
            web.goBack()
        } else {
            super.onBackPressed()
        }
    }

    // ---------- Navegación ----------
    private inner class Cliente : WebViewClient() {
        override fun shouldOverrideUrlLoading(view: WebView, request: WebResourceRequest): Boolean {
            val u = request.url
            if (esFori(u)) return false
            if (u.scheme == "blob" || u.scheme == "data" || u.scheme == "about") return false
            abrirFuera(u)
            return true
        }

        override fun onPageFinished(view: WebView, url: String?) {
            if (esFori(Uri.parse(url ?: ""))) view.evaluateJavascript(shim(), null)
        }

        override fun onReceivedError(view: WebView, request: WebResourceRequest, error: WebResourceError) {
            // Sin conexión y sin copia de Fori guardada todavía (la primera vez): aviso propio en vez del error del sistema
            if (request.isForMainFrame && esFori(request.url)) view.loadUrl("file:///android_asset/sin-conexion.html")
        }

        override fun onRenderProcessGone(view: WebView, detail: RenderProcessGoneDetail): Boolean {
            // Si el motor del WebView se cae (poca memoria), se vuelve a abrir Fori; lo guardado sigue ahí
            recreate()
            return true
        }
    }

    private fun shim(): String = shim ?: assets.open("fori-android.js").bufferedReader().use { it.readText() }.also { shim = it }

    private fun abrirFuera(u: Uri) {
        try {
            startActivity(Intent(Intent.ACTION_VIEW, u).addFlags(Intent.FLAG_ACTIVITY_NEW_TASK))
        } catch (e: ActivityNotFoundException) {
            archivos.aviso("No hay ninguna app para abrir este enlace")
        }
    }

    // ---------- Archivos, cámara y micrófono ----------
    private inner class Chrome : WebChromeClient() {
        override fun onShowFileChooser(
            webView: WebView, callback: ValueCallback<Array<Uri>>, params: FileChooserParams
        ): Boolean {
            eligiendo?.onReceiveValue(null)
            eligiendo = callback
            fotoUri = null
            val tipos = params.acceptTypes.flatMap { it.split(',') }.map { it.trim().lowercase() }.filter { it.isNotEmpty() }
            if (params.isCaptureEnabled && hacerFoto()) return true
            val intent = Intent(Intent.ACTION_GET_CONTENT).addCategory(Intent.CATEGORY_OPENABLE)
            val mimes = mimesDe(tipos)
            when {
                mimes.isEmpty() -> intent.type = "*/*"
                mimes.size == 1 -> intent.type = mimes[0]
                else -> { intent.type = "*/*"; intent.putExtra(Intent.EXTRA_MIME_TYPES, mimes.toTypedArray()) }
            }
            if (params.mode == FileChooserParams.MODE_OPEN_MULTIPLE) intent.putExtra(Intent.EXTRA_ALLOW_MULTIPLE, true)
            return try {
                startActivityForResult(intent, REQ_ARCHIVO); true
            } catch (e: ActivityNotFoundException) {
                eligiendo = null; archivos.aviso("No hay ninguna app para elegir archivos"); false
            }
        }

        override fun onPermissionRequest(request: PermissionRequest) {
            val audio = PermissionRequest.RESOURCE_AUDIO_CAPTURE
            if (!request.origin.host.equals(HOST, true) || audio !in request.resources) { request.deny(); return }
            if (checkSelfPermission(Manifest.permission.RECORD_AUDIO) == PackageManager.PERMISSION_GRANTED) {
                request.grant(arrayOf(audio))
            } else {
                permisoPendiente?.deny()
                permisoPendiente = request
                requestPermissions(arrayOf(Manifest.permission.RECORD_AUDIO), REQ_MICRO)
            }
        }
    }

    /**
     * Tipos del atributo accept → tipos MIME para el selector de Android.
     * Si aparece algo que Android no sabe filtrar (.fori, .foricopia, .json, .zip), se enseñan todos los archivos:
     * los .fori no tienen un tipo propio y si no, no se podrían elegir.
     */
    private fun mimesDe(tipos: List<String>): List<String> {
        val out = LinkedHashSet<String>()
        for (t in tipos) {
            when {
                t == "image/*" || t == ".png" || t == ".jpg" || t == ".jpeg" || t == ".webp" || t == ".gif" -> out += "image/*"
                t.startsWith("image/") -> out += t
                t == "application/pdf" || t == ".pdf" -> out += "application/pdf"
                else -> return emptyList()
            }
        }
        return out.toList()
    }

    private fun hacerFoto(): Boolean {
        val intent = Intent(MediaStore.ACTION_IMAGE_CAPTURE)
        if (intent.resolveActivity(packageManager) == null) return false
        return try {
            val dir = File(cacheDir, "camara").apply { mkdirs() }
            dir.listFiles()?.forEach { it.delete() } // solo se guarda la última foto
            val f = File(dir, "foto-${System.currentTimeMillis()}.jpg")
            val uri = FileProvider.getUriForFile(this, "$packageName.archivos", f)
            intent.putExtra(MediaStore.EXTRA_OUTPUT, uri)
            intent.clipData = ClipData.newRawUri("", uri)
            intent.addFlags(Intent.FLAG_GRANT_WRITE_URI_PERMISSION or Intent.FLAG_GRANT_READ_URI_PERMISSION)
            fotoUri = uri
            startActivityForResult(intent, REQ_ARCHIVO)
            true
        } catch (e: Exception) {
            fotoUri = null; false
        }
    }

    override fun onActivityResult(requestCode: Int, resultCode: Int, data: Intent?) {
        when (requestCode) {
            REQ_ARCHIVO -> {
                val cb = eligiendo ?: return
                eligiendo = null
                var res: Array<Uri>? = null
                if (resultCode == RESULT_OK) {
                    val foto = fotoUri
                    val clip = data?.clipData
                    res = when {
                        foto != null -> arrayOf(foto)
                        clip != null && clip.itemCount > 0 -> Array(clip.itemCount) { clip.getItemAt(it).uri }
                        data?.data != null -> arrayOf(data.data!!)
                        else -> null
                    }
                }
                fotoUri = null
                cb.onReceiveValue(res)
            }
            REQ_GUARDAR -> archivos.guardadoElegido(if (resultCode == RESULT_OK) data?.data else null)
            else -> superResultado(requestCode, resultCode, data)
        }
    }

    private fun superResultado(requestCode: Int, resultCode: Int, data: Intent?) =
        super.onActivityResult(requestCode, resultCode, data)

    override fun onRequestPermissionsResult(requestCode: Int, permissions: Array<out String>, grantResults: IntArray) {
        if (requestCode == REQ_NOTI) { lanzarCapa(); return }
        if (requestCode != REQ_MICRO) return
        val p = permisoPendiente ?: return
        permisoPendiente = null
        if (grantResults.isNotEmpty() && grantResults[0] == PackageManager.PERMISSION_GRANTED) {
            p.grant(arrayOf(PermissionRequest.RESOURCE_AUDIO_CAPTURE))
        } else {
            p.deny(); archivos.aviso("Sin permiso para el micrófono, el medidor de ruido no puede escuchar")
        }
    }

    /** Para Archivos: pide dónde guardar (Android 7 a 9, que no tienen la carpeta Descargas abierta a las apps). */
    fun pedirDondeGuardar(nombre: String, mime: String) {
        val i = Intent(Intent.ACTION_CREATE_DOCUMENT).addCategory(Intent.CATEGORY_OPENABLE)
            .setType(mime).putExtra(Intent.EXTRA_TITLE, nombre)
        try {
            startActivityForResult(i, REQ_GUARDAR)
        } catch (e: ActivityNotFoundException) {
            archivos.guardadoElegido(null)
        }
    }
}
