// Común a los mockups de /search: cabecera del sitio (la vigente), utilidades de pintado y la barra de
// mockup para cambiar de propuesta y de estado (#artist, #album, #song, #none). Los datos salen de data.js.
(function () {
  var DISC =
    '<svg viewBox="0 0 100 100" aria-hidden="true"><g fill="none" stroke="currentColor" stroke-width="1.2"><circle cx="50" cy="50" r="46"/><circle cx="50" cy="50" r="20"/></g><circle cx="50" cy="50" r="3" fill="currentColor"/></svg>';
  var esc = function (s) {
    return String(s == null ? "" : s).replace(/[&<>"]/g, function (c) {
      return { "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;" }[c];
    });
  };
  // Carátula con el disco de reserva si no hay imagen o si falla (como `CoverThumb`).
  var cover = function (url, cls) {
    if (!url) return '<span class="disc ' + (cls || "") + '">' + DISC + "</span>";
    return (
      '<span class="cvbox ' + (cls || "") + '"><img src="' + esc(url) + '" alt="" loading="lazy" onerror="this.parentNode.outerHTML=window.__disc(\'' + (cls || "") + "')\"></span>"
    );
  };
  window.__disc = function (cls) { return '<span class="disc ' + cls + '">' + DISC + "</span>"; };
  // Retrato de artista: foto de Commons o la inicial (nunca el micrófono repetido).
  var portrait = function (a, cls) {
    if (a.photo) return '<span class="ph ' + (cls || "") + '"><img src="' + esc(a.photo) + '" alt="" loading="lazy"></span>';
    var ch = (a.name || "?").replace(/^the\s+/i, "").charAt(0).toUpperCase();
    return '<span class="ph ini ' + (cls || "") + '" aria-hidden="true">' + esc(ch) + "</span>";
  };
  var years = function (a) {
    if (a.from && a.to) return a.from + "–" + a.to;
    if (a.from) return "desde " + a.from;
    return "";
  };
  var meta = function (parts) {
    return parts.filter(Boolean).map(esc).join(' <i class="dot">·</i> ');
  };
  var fmt = function (n) { return new Intl.NumberFormat("es-ES").format(n); };
  var countLabel = function (n) { return n > 1000 ? "más de 1.000" : fmt(n); };
  window.UI = { DISC: DISC, esc: esc, cover: cover, portrait: portrait, years: years, meta: meta, fmt: fmt, countLabel: countLabel };

  var ICON = {
    artist: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round"><circle cx="12" cy="8" r="4"/><path d="M4 21a8 8 0 0 1 16 0"/></svg>',
    album: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8"><circle cx="12" cy="12" r="9"/><circle cx="12" cy="12" r="2.5"/></svg>',
    song: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"><path d="M9 18V5l11-2v13"/><circle cx="6" cy="18" r="3"/><circle cx="17" cy="16" r="3"/></svg>',
    user: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round"><circle cx="9" cy="8" r="3.5"/><path d="M2.5 20a6.5 6.5 0 0 1 13 0M16 4.6a3.5 3.5 0 0 1 0 6.8M18.5 14.2A6.5 6.5 0 0 1 21.5 20"/></svg>',
    search: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round"><circle cx="11" cy="11" r="7"/><path d="m20 20-3.5-3.5"/></svg>',
    arrow: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M5 12h14m-6-6 6 6-6 6"/></svg>',
    chevron: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="m6 9 6 6 6-6"/></svg>',
    filter: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round"><path d="M4 6h16M7 12h10M10 18h4"/></svg>',
    more: '<svg viewBox="0 0 24 24" fill="currentColor"><circle cx="5" cy="12" r="1.6"/><circle cx="12" cy="12" r="1.6"/><circle cx="19" cy="12" r="1.6"/></svg>',
    compass: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="12" r="9"/><path d="m15.5 8.5-2 5-5 2 2-5z"/></svg>',
  };
  window.ICON = ICON;

  var STATES = [
    ["artist", "Artistas «pink»"],
    ["album", "Álbumes «the wall»"],
    ["song", "Canciones «creep»"],
    ["none", "Sin resultados"],
  ];
  window.STATES = STATES;
  window.currentState = function () {
    var h = (location.hash || "#artist").slice(1);
    return STATES.some(function (s) { return s[0] === h; }) ? h : "artist";
  };

  var header = function (query) {
    return (
      '<div class="bar">' +
      '<a class="brand" href="#"><i><svg viewBox="0 0 24 24" fill="currentColor"><path d="M9 18a3 3 0 1 1-2-2.83V5l11-2v11.17A3 3 0 1 1 16 17V7.4l-7 1.27V18z"/></svg></i>music-platform</a>' +
      '<nav class="site-nav" aria-label="Principal"><a href="#">Explorar</a><a href="#">Listas</a><a href="#">Comunidad</a></nav>' +
      '<label class="hsearch">' + ICON.search + "<span>" + (query ? '<b class="hq">' + esc(query) + "</b>" : "Buscar artistas") + "</span><kbd>/</kbd></label>" +
      '<div class="acct"><span class="lang"><span>ES</span><span>EN</span></span><a href="#">Iniciar sesión</a><a class="btn-amber" href="#">Crear cuenta</a></div>' +
      '<div class="icons"><button class="icon-btn" aria-label="Abrir búsqueda">' + ICON.search + '</button><button class="icon-btn" aria-label="Abrir menú"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round"><path d="M4 7h16M4 12h16M4 17h16"/></svg></button></div>' +
      "</div>"
    );
  };
  window.paintHeader = function (query) {
    var h = document.querySelector(".site-header");
    if (h) h.innerHTML = header(query);
  };

  window.mockBar = function (current) {
    var files = [["index.html", "Resumen"], ["a-rejilla.html", "A · Rejilla"], ["b-respuesta.html", "B · Respuesta"], ["c-lector.html", "C · Lector"]];
    var bar = document.createElement("nav");
    bar.className = "mock-bar";
    bar.setAttribute("aria-label", "Mockups");
    bar.innerHTML =
      '<div class="mb-row">' +
      files.map(function (f) { return '<a href="' + f[0] + '"' + (f[0] === current ? ' aria-current="page"' : "") + ">" + f[1] + "</a>"; }).join("") +
      "</div>" +
      (current === "index.html"
        ? ""
        : '<div class="mb-row states">' +
          STATES.map(function (s) { return '<a href="#' + s[0] + '" data-state="' + s[0] + '">' + s[1] + "</a>"; }).join("") +
          '<span class="mb-note">datos reales · comunidad de ejemplo</span></div>');
    document.body.appendChild(bar);
    var mark = function () {
      var st = window.currentState();
      bar.querySelectorAll("[data-state]").forEach(function (a) {
        if (a.dataset.state === st) a.setAttribute("aria-current", "true");
        else a.removeAttribute("aria-current");
      });
    };
    window.addEventListener("hashchange", mark);
    mark();
  };
})();
