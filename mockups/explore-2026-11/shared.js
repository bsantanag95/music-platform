// Común a los mockups de /explore: cabecera del sitio, carátulas recortadas del mosaico real del
// hero (8 × 4 portadas de 224 px, dentro del límite de 250 px de la licencia) y discos de reserva.
(function () {
  var DISC = '<svg viewBox="0 0 100 100" aria-hidden="true"><g fill="none" stroke="currentColor" stroke-width="1.2"><circle cx="50" cy="50" r="46"/><circle cx="50" cy="50" r="20"/></g><circle cx="50" cy="50" r="3" fill="currentColor"/></svg>';
  window.paintCovers = function (root) {
    (root || document).querySelectorAll("[data-c]").forEach(function (el) {
      var i = +el.dataset.c;
      el.style.backgroundImage = "url(wall.webp)";
      el.style.backgroundSize = "800% 400%";
      el.style.backgroundPosition = ((i % 8) * 100) / 7 + "% " + (Math.floor(i / 8) * 100) / 3 + "%";
    });
    (root || document).querySelectorAll(".disc:empty").forEach(function (el) { el.innerHTML = DISC; });
  };
  var header =
    '<div class="bar">' +
    '<a class="brand" href="#"><i><svg viewBox="0 0 24 24" fill="currentColor"><path d="M9 18a3 3 0 1 1-2-2.83V5l11-2v11.17A3 3 0 1 1 16 17V7.4l-7 1.27V18z"/></svg></i>music-platform</a>' +
    '<nav class="site-nav" aria-label="Principal"><a href="#" aria-current="page">Explorar</a><a href="#">Listas</a><a href="#">Comunidad</a></nav>' +
    '<label class="hsearch"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><circle cx="11" cy="11" r="7"/><path d="m20 20-3.5-3.5"/></svg><span>Buscar artistas</span><kbd>/</kbd></label>' +
    '<div class="acct"><span class="lang"><span>ES</span><span>EN</span></span><a href="#">Iniciar sesión</a><a class="btn-amber" href="#">Crear cuenta</a></div>' +
    '<div class="icons"><button class="icon-btn" aria-label="Abrir búsqueda"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><circle cx="11" cy="11" r="7"/><path d="m20 20-3.5-3.5"/></svg></button><button class="icon-btn" aria-label="Abrir menú"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round"><path d="M4 7h16M4 12h16M4 17h16"/></svg></button></div>' +
    "</div>";
  document.addEventListener("DOMContentLoaded", function () {
    var h = document.querySelector(".site-header");
    if (h) h.innerHTML = header;
    window.paintCovers();
  });
})();
