/* Fori para Android: lo que el WebView no hace solo. La app lo inyecta al terminar de cargar Fori.
   No cambia nada de Fori: en Chrome este archivo no existe.
   - Descargas (exportar imagen, lección .fori, datos, copia completa): los enlaces <a download> con direcciones
     blob: o data: se envían a la app por trozos, y la app los guarda en Descargas/Fori.
   - Exportar en PDF: Fori imprime un iframe; aquí su print() envía la página a la app, que abre el cuadro de
     impresión de Android (con «Guardar como PDF»).
   - Pantalla completa: la app ya ocupa toda la pantalla, así que el botón sobra. */
(function () {
  if (window.__foriAndroid) return;
  var A = window.ForiAndroid;
  if (!A) return;
  window.__foriAndroid = 1;
  document.documentElement.classList.add('fori-android');

  var st = document.createElement('style');
  st.textContent = '#btnFs{display:none!important}';
  document.head.appendChild(st);
  setTimeout(function () { window.dispatchEvent(new Event('resize')); }, 60); // que las barras se recoloquen sin el botón

  // Envía un Blob a la app en trozos de 3 MB (múltiplo de 3: cada trozo en base64 se decodifica por separado)
  function enviar(blob, nombre, destino) {
    var id;
    try { id = A.inicio(nombre || 'archivo', blob.type || '', destino); } catch (e) { return; }
    var T = 3 * 1024 * 1024, pos = 0;
    (function sig() {
      if (pos >= blob.size) { A.fin(id); return; }
      var r = new FileReader();
      r.onload = function () {
        var s = String(r.result);
        A.trozo(id, s.slice(s.indexOf(',') + 1));
        pos += T; sig();
      };
      r.onerror = function () { A.error(id); };
      r.readAsDataURL(blob.slice(pos, pos + T));
    })();
  }
  window.__foriEnviar = enviar;

  function descargar(a) {
    var n = a.getAttribute('download') || 'archivo';
    fetch(a.href).then(function (r) { return r.blob(); })
      .then(function (b) { enviar(b, n, 'descargar'); })
      .catch(function () { A.aviso('No se ha podido guardar el archivo'); });
  }
  var esDescarga = function (a) { return a.hasAttribute('download') && /^(blob:|data:)/.test(a.href || ''); };

  var click = HTMLAnchorElement.prototype.click;
  HTMLAnchorElement.prototype.click = function () {
    if (esDescarga(this)) { descargar(this); return; }
    return click.apply(this, arguments);
  };
  document.addEventListener('click', function (e) {
    var a = e.target && e.target.closest && e.target.closest('a[download]');
    if (a && esDescarga(a)) { e.preventDefault(); descargar(a); }
  }, true);

  // Exportar en PDF
  function vigilar(fr) {
    fr.addEventListener('load', function () {
      try {
        var w = fr.contentWindow;
        w.print = function () {
          var html = '<!doctype html>' + w.document.documentElement.outerHTML;
          enviar(new Blob([html], { type: 'text/html' }), 'Fori', 'imprimir');
        };
      } catch (e) {}
    });
  }
  new MutationObserver(function (ms) {
    ms.forEach(function (m) {
      m.addedNodes.forEach(function (n) { if (n.tagName === 'IFRAME') vigilar(n); });
    });
  }).observe(document.body, { childList: true });
})();
