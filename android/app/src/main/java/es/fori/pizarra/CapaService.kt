package es.fori.pizarra

import android.annotation.SuppressLint
import android.app.Notification
import android.app.NotificationChannel
import android.app.NotificationManager
import android.app.PendingIntent
import android.app.Service
import android.content.Context
import android.content.Intent
import android.content.pm.ServiceInfo
import android.content.res.Configuration
import android.graphics.Color
import android.graphics.PixelFormat
import android.graphics.drawable.GradientDrawable
import android.graphics.drawable.Icon
import android.hardware.input.InputManager
import android.os.Build
import android.os.Handler
import android.os.IBinder
import android.os.Looper
import android.provider.Settings
import android.util.TypedValue
import android.view.Gravity
import android.view.MotionEvent
import android.view.View
import android.view.ViewConfiguration
import android.view.ViewGroup
import android.view.WindowManager
import android.webkit.JavascriptInterface
import android.webkit.RenderProcessGoneDetail
import android.webkit.WebResourceError
import android.webkit.WebResourceRequest
import android.webkit.WebView
import android.webkit.WebViewClient
import android.widget.FrameLayout
import android.widget.TextView
import android.widget.Toast
import androidx.core.app.ServiceCompat
import kotlin.math.hypot

/**
 * Pintar encima de otras apps.
 *
 * Servicio en primer plano con dos ventanas superpuestas (permiso «Mostrar sobre otras apps»):
 *  - la **capa**: un WebView transparente a pantalla completa con Fori en «modo capa» (`?capa=1`), que no lee ni
 *    guarda nada de la pizarra (ver src/js/38b-modo-capa.js);
 *  - la **burbuja**: un botón redondo que se puede arrastrar. Tocarla muestra u oculta la capa y, si se está
 *    tocando la app de debajo, vuelve a pintar.
 *
 * La capa tiene tres estados:
 *  - PINTAR: se ve y recibe los toques.
 *  - DEBAJO («Tocar debajo»): se ve, pero los toques pasan a la app de debajo (FLAG_NOT_TOUCHABLE). Desde Android 12
 *    eso solo funciona si la ventana tiene una opacidad de 0,8 como mucho, así que lo pintado se ve un poco más claro.
 *  - OCULTA: no se ve ni recibe toques; lo pintado se conserva hasta que se cierra.
 *
 * Fori le habla con window.ForiAndroid.capa(orden) ('debajo', 'ocultar', 'cerrar') y el servicio a Fori con
 * window.__foriCapa(orden) ('pintar').
 */
class CapaService : Service() {

    companion object {
        const val ABRIR = "es.fori.pizarra.capa.ABRIR"
        const val CERRAR = "es.fori.pizarra.capa.CERRAR"
        private const val CANAL = "capa"
        private const val NOTI = 7

        /** Abre la capa (o la vuelve a mostrar si ya estaba abierta). Hace falta el permiso de superponer. */
        fun abrir(ctx: Context) {
            val i = Intent(ctx, CapaService::class.java).setAction(ABRIR)
            if (Build.VERSION.SDK_INT >= 26) ctx.startForegroundService(i) else ctx.startService(i)
        }

        fun puede(ctx: Context): Boolean = Build.VERSION.SDK_INT < 23 || Settings.canDrawOverlays(ctx)
    }

    private enum class Modo { OCULTA, PINTAR, DEBAJO }

    private lateinit var wm: WindowManager
    private val ui = Handler(Looper.getMainLooper())
    private var marco: FrameLayout? = null
    private var web: WebView? = null
    private var marcoP: WindowManager.LayoutParams? = null
    private var burbuja: TextView? = null
    private var burbujaP: WindowManager.LayoutParams? = null
    private var modo = Modo.OCULTA
    private var cerrando = false

    override fun onBind(intent: Intent?): IBinder? = null

    override fun onCreate() {
        super.onCreate()
        wm = getSystemService(WINDOW_SERVICE) as WindowManager
    }

    override fun onStartCommand(intent: Intent?, flags: Int, startId: Int): Int {
        primerPlano() // siempre lo primero: Android cierra la app si un servicio así tarda en avisar
        if (intent?.action == CERRAR) { cerrar(); return START_NOT_STICKY }
        cerrando = false
        if (!puede(this)) {
            aviso("Falta el permiso «Mostrar sobre otras apps» para pintar encima")
            cerrar(); return START_NOT_STICKY
        }
        if (burbuja == null && !crear()) { cerrar(); return START_NOT_STICKY }
        poner(Modo.PINTAR)
        return START_NOT_STICKY
    }

    // ---------- Notificación (obligatoria para un servicio en primer plano) ----------
    private fun primerPlano() {
        val nm = getSystemService(NOTIFICATION_SERVICE) as NotificationManager
        if (Build.VERSION.SDK_INT >= 26) {
            nm.createNotificationChannel(NotificationChannel(CANAL, "Pintar encima", NotificationManager.IMPORTANCE_LOW).apply {
                description = "Aviso mientras la capa para pintar encima de otras apps está abierta"
                setShowBadge(false)
            })
        }
        val fl = PendingIntent.FLAG_IMMUTABLE or PendingIntent.FLAG_UPDATE_CURRENT
        val cerrar = PendingIntent.getService(this, 1, Intent(this, CapaService::class.java).setAction(CERRAR), fl)
        val abrir = PendingIntent.getService(this, 2, Intent(this, CapaService::class.java).setAction(ABRIR), fl)
        val b = if (Build.VERSION.SDK_INT >= 26) Notification.Builder(this, CANAL) else @Suppress("DEPRECATION") Notification.Builder(this)
        val n = b.setSmallIcon(R.drawable.ic_capa)
            .setContentTitle("Fori: pintar encima")
            .setContentText("Toca la burbuja para pintar u ocultar lo pintado")
            .setOngoing(true)
            .setShowWhen(false)
            .setContentIntent(abrir)
            .addAction(Notification.Action.Builder(Icon.createWithResource(this, R.drawable.ic_capa), "Cerrar", cerrar).build())
            .build()
        val tipo = if (Build.VERSION.SDK_INT >= 34) ServiceInfo.FOREGROUND_SERVICE_TYPE_SPECIAL_USE else 0
        ServiceCompat.startForeground(this, NOTI, n, tipo)
    }

    // ---------- Ventanas ----------
    private fun dp(v: Int): Int =
        TypedValue.applyDimension(TypedValue.COMPLEX_UNIT_DIP, v.toFloat(), resources.displayMetrics).toInt()

    @Suppress("DEPRECATION")
    private fun tipo(): Int =
        if (Build.VERSION.SDK_INT >= 26) WindowManager.LayoutParams.TYPE_APPLICATION_OVERLAY
        else WindowManager.LayoutParams.TYPE_PHONE

    @SuppressLint("SetJavaScriptEnabled")
    private fun crear(): Boolean {
        try {
            // 1. La capa: WebView transparente con Fori en modo capa
            val w = WebView(this)
            w.setBackgroundColor(Color.TRANSPARENT)
            w.settings.apply {
                javaScriptEnabled = true
                domStorageEnabled = true
                @Suppress("DEPRECATION")
                databaseEnabled = true
                allowFileAccess = false
                setSupportZoom(false)
                builtInZoomControls = false
                displayZoomControls = false
                textZoom = 100
                useWideViewPort = true
                loadWithOverviewMode = false
                setSupportMultipleWindows(false)
                userAgentString = "$userAgentString ForiAndroid/${version()} ForiCapa"
            }
            w.addJavascriptInterface(Puente(), "ForiAndroid")
            w.webViewClient = Cliente()
            val m = FrameLayout(this)
            m.addView(w, FrameLayout.LayoutParams(ViewGroup.LayoutParams.MATCH_PARENT, ViewGroup.LayoutParams.MATCH_PARENT))
            val mp = WindowManager.LayoutParams(
                WindowManager.LayoutParams.MATCH_PARENT, WindowManager.LayoutParams.MATCH_PARENT, tipo(),
                WindowManager.LayoutParams.FLAG_NOT_FOCUSABLE or WindowManager.LayoutParams.FLAG_LAYOUT_IN_SCREEN or
                    WindowManager.LayoutParams.FLAG_HARDWARE_ACCELERATED,
                PixelFormat.TRANSLUCENT
            )
            mp.gravity = Gravity.TOP or Gravity.START
            if (Build.VERSION.SDK_INT >= 28) {
                mp.layoutInDisplayCutoutMode = WindowManager.LayoutParams.LAYOUT_IN_DISPLAY_CUTOUT_MODE_SHORT_EDGES
            }
            wm.addView(m, mp)
            web = w; marco = m; marcoP = mp
            w.loadUrl(MainActivity.FORI_URL + "?capa=1")

            // 2. La burbuja (después, para que quede encima de la capa)
            val tam = dp(64)
            val b = TextView(this).apply {
                gravity = Gravity.CENTER
                setTextSize(TypedValue.COMPLEX_UNIT_SP, 28f)
                contentDescription = "Fori: pintar encima"
            }
            val dm = resources.displayMetrics
            val bp = WindowManager.LayoutParams(
                tam, tam, tipo(),
                WindowManager.LayoutParams.FLAG_NOT_FOCUSABLE or WindowManager.LayoutParams.FLAG_NOT_TOUCH_MODAL or
                    WindowManager.LayoutParams.FLAG_LAYOUT_IN_SCREEN,
                PixelFormat.TRANSLUCENT
            )
            bp.gravity = Gravity.TOP or Gravity.START
            bp.x = dm.widthPixels - tam - dp(20)
            bp.y = dm.heightPixels / 3
            arrastrar(b, bp)
            wm.addView(b, bp)
            burbuja = b; burbujaP = bp
            return true
        } catch (e: Exception) {
            // Sin permiso de verdad, o sin WebView en el equipo
            aviso("No se ha podido abrir la capa para pintar encima")
            quitar()
            return false
        }
    }

    @SuppressLint("ClickableViewAccessibility")
    private fun arrastrar(v: View, p: WindowManager.LayoutParams) {
        val slop = ViewConfiguration.get(this).scaledTouchSlop
        var x0 = 0; var y0 = 0; var rx = 0f; var ry = 0f; var mueve = false
        v.setOnTouchListener { _, e ->
            when (e.actionMasked) {
                MotionEvent.ACTION_DOWN -> { x0 = p.x; y0 = p.y; rx = e.rawX; ry = e.rawY; mueve = false; v.alpha = 0.75f }
                MotionEvent.ACTION_MOVE -> {
                    val dx = e.rawX - rx; val dy = e.rawY - ry
                    if (!mueve && hypot(dx, dy) > slop) mueve = true
                    if (mueve) { p.x = (x0 + dx).toInt(); p.y = (y0 + dy).toInt(); encajar(); actualizar(v, p) }
                }
                MotionEvent.ACTION_UP -> { v.alpha = 1f; if (!mueve) tocarBurbuja() }
                MotionEvent.ACTION_CANCEL -> v.alpha = 1f
            }
            true
        }
    }

    /** Que la burbuja no se salga de la pantalla (también al girarla) */
    private fun encajar() {
        val p = burbujaP ?: return
        val dm = resources.displayMetrics
        p.x = p.x.coerceIn(0, maxOf(0, dm.widthPixels - p.width))
        p.y = p.y.coerceIn(0, maxOf(0, dm.heightPixels - p.height))
    }

    private fun actualizar(v: View?, p: WindowManager.LayoutParams?) {
        if (v == null || p == null) return
        try { wm.updateViewLayout(v, p) } catch (e: Exception) { }
    }

    override fun onConfigurationChanged(newConfig: Configuration) {
        super.onConfigurationChanged(newConfig)
        ui.postDelayed({ encajar(); actualizar(burbuja, burbujaP) }, 300)
    }

    private fun tocarBurbuja() {
        poner(if (modo == Modo.PINTAR) Modo.OCULTA else Modo.PINTAR)
    }

    private fun poner(m: Modo) {
        val c = marco ?: return
        val p = marcoP ?: return
        val antes = modo
        modo = m
        val nt = WindowManager.LayoutParams.FLAG_NOT_TOUCHABLE
        when (m) {
            Modo.PINTAR -> { c.visibility = View.VISIBLE; p.flags = p.flags and nt.inv(); p.alpha = 1f }
            Modo.DEBAJO -> { c.visibility = View.VISIBLE; p.flags = p.flags or nt; p.alpha = opacidadDebajo() }
            Modo.OCULTA -> { c.visibility = View.INVISIBLE; p.flags = p.flags or nt; p.alpha = 1f }
        }
        actualizar(c, p)
        if (m == Modo.PINTAR && antes != Modo.PINTAR) js("pintar") // vuelve la barra de Fori
        pintarBurbuja()
    }

    /** Android 12+ solo deja pasar los toques a la app de debajo si la ventana de encima es lo bastante transparente */
    private fun opacidadDebajo(): Float {
        if (Build.VERSION.SDK_INT < 31) return 1f
        val max = try {
            (getSystemService(INPUT_SERVICE) as InputManager).maximumObscuringOpacityForTouch
        } catch (e: Exception) { 0.8f }
        return minOf(0.8f, max)
    }

    private fun pintarBurbuja() {
        val b = burbuja ?: return
        val (texto, fondo, borde) = when (modo) {
            Modo.PINTAR -> Triple("✏️", "#1E6FE0", "#FFFFFF")
            Modo.DEBAJO -> Triple("👆", "#2F9E44", "#FFFFFF")
            Modo.OCULTA -> Triple("✏️", "#13214A", "#9FB1B0")
        }
        b.text = texto
        b.background = GradientDrawable().apply {
            shape = GradientDrawable.OVAL
            setColor(Color.parseColor(fondo))
            setStroke(dp(3), Color.parseColor(borde))
        }
        b.contentDescription = when (modo) {
            Modo.PINTAR -> "Fori: ocultar lo pintado"
            Modo.DEBAJO -> "Fori: volver a pintar"
            Modo.OCULTA -> "Fori: pintar encima"
        }
    }

    private fun js(orden: String) {
        web?.evaluateJavascript("window.__foriCapa&&window.__foriCapa('$orden')", null)
    }

    private fun aviso(t: String) = ui.post { Toast.makeText(applicationContext, t, Toast.LENGTH_LONG).show() }

    private fun version(): String = try {
        packageManager.getPackageInfo(packageName, 0).versionName ?: "1"
    } catch (e: Exception) { "1" }

    // ---------- Lo que la capa de Fori le pide a la app ----------
    inner class Puente {
        @JavascriptInterface
        fun capa(orden: String?) {
            ui.post {
                when (orden) {
                    "debajo" -> poner(Modo.DEBAJO)
                    "ocultar" -> poner(Modo.OCULTA)
                    "pintar" -> poner(Modo.PINTAR)
                    "cerrar" -> cerrar()
                }
            }
        }

        @JavascriptInterface
        fun aviso(t: String?) { if (!t.isNullOrBlank()) this@CapaService.aviso(t) }

        @JavascriptInterface
        fun version(): String = this@CapaService.version()
    }

    private inner class Cliente : WebViewClient() {
        override fun shouldOverrideUrlLoading(view: WebView, request: WebResourceRequest): Boolean =
            !MainActivity.esFori(request.url) // en la capa no se navega a ningún otro sitio

        override fun onReceivedError(view: WebView, request: WebResourceRequest, error: WebResourceError) {
            if (request.isForMainFrame) {
                aviso("Sin conexión: abre Fori una vez con internet para poder pintar encima")
                ui.post { cerrar() }
            }
        }

        override fun onRenderProcessGone(view: WebView, detail: RenderProcessGoneDetail): Boolean {
            aviso("La capa para pintar encima se ha cerrado")
            ui.post { cerrar() }
            return true
        }
    }

    // ---------- Cerrar ----------
    private fun quitar() {
        burbuja?.let { try { wm.removeView(it) } catch (e: Exception) { } }
        marco?.let { try { wm.removeView(it) } catch (e: Exception) { } }
        web?.let { try { it.stopLoading(); it.destroy() } catch (e: Exception) { } }
        burbuja = null; burbujaP = null; marco = null; marcoP = null; web = null
        modo = Modo.OCULTA
    }

    private fun cerrar() {
        if (cerrando) return
        cerrando = true
        quitar()
        ServiceCompat.stopForeground(this, ServiceCompat.STOP_FOREGROUND_REMOVE)
        stopSelf()
    }

    override fun onDestroy() {
        quitar()
        super.onDestroy()
    }
}
