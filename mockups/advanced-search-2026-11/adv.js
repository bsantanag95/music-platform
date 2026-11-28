// Piezas comunes de los mockups de /search/advanced: estados, pestañas, filas de resultados reales y la barra del mockup.
// Se apoya en shared.js (UI, ICON, paintHeader) de los mockups de /search.
(function () {
  var U = window.UI, I = window.ICON, D = window.ADV;

  window.ADV_STATES = [
    ["form", "Formulario vacío"],
    ["results", "Con resultados"],
    ["album", "Pestaña Álbumes"],
  ];
  window.advState = function () {
    var h = location.hash.slice(1);
    return window.ADV_STATES.some(function (s) { return s[0] === h; }) ? h : "form";
  };

  window.advTabs = function (current, cls) {
    var tabs = [["artist", "Artistas", I.artist], ["album", "Álbumes", I.album], ["song", "Canciones", I.song]];
    return '<nav class="' + (cls || "atabs") + '" aria-label="Qué buscar">' + tabs.map(function (t) {
      return '<a href="#' + (t[0] === "album" ? "album" : "form") + '"' + (t[0] === current ? ' aria-current="page"' : "") + ">" + t[2] + "<span>" + t[1] + "</span></a>";
    }).join("") + "</nav>";
  };

  /** Fila de artista con los datos filtrados destacados (tipo, país, años), como la avanzada de hoy. */
  window.advRow = function (a) {
    var yrs = a.from ? (a.to ? a.from + "–" + a.to : "desde " + a.from) : null;
    var meta = '<span class="hit">Grupo</span><i class="dot">·</i><span class="hit">Chile</span>' +
      (a.area ? '<i class="dot">·</i>' + U.esc(a.area) : "") +
      (yrs ? '<i class="dot">·</i><span class="hit">' + yrs + "</span>" : "") +
      (a.discs ? '<i class="dot">·</i>' + a.discs + " discos" : "") +
      (a.dis ? '<i class="dot">·</i><span class="dis">' + U.esc(a.dis) + "</span>" : "");
    return '<a class="arow" href="#">' + U.portrait({ name: a.name, photo: a.photo }) +
      '<span class="arow-t"><b>' + U.esc(a.name) + '</b><span class="meta">' + meta + "</span>" +
      (a.cat ? '<span class="incat">en el catálogo</span>' : "") + "</span></a>";
  };

  window.advRows = function (n) { return D.artists.slice(0, n || 10).map(window.advRow).join(""); };

  window.advExamples = [
    ["Bandas chilenas de los 80", "Grupo · Chile · Inicio 1980–1989"],
    ["Grupos de Mánchester", "Grupo · Ciudad: Manchester"],
    ["Solistas de México desde 1990", "Solista · México · Inicio desde 1990"],
  ];

  window.advMockBar = function (current) {
    var files = [["index.html", "Resumen"], ["a-ficha.html", "A · Ficha"], ["b-frase.html", "B · Frase"], ["c-facetas.html", "C · Facetas"]];
    var bar = document.createElement("nav");
    bar.className = "mock-bar";
    bar.setAttribute("aria-label", "Mockup");
    bar.innerHTML =
      '<div class="mb-row">' + files.map(function (f) { return '<a href="' + f[0] + '"' + (f[0] === current ? ' aria-current="page"' : "") + ">" + f[1] + "</a>"; }).join("") + "</div>" +
      (current === "index.html" ? "" :
        '<div class="mb-row states">' + window.ADV_STATES.map(function (s) { return '<a href="#' + s[0] + '" data-state="' + s[0] + '">' + s[1] + "</a>"; }).join("") +
        '<span class="mb-note">resultados reales · 28 nov 2026</span></div>');
    document.body.appendChild(bar);
    var mark = function () {
      var st = window.advState();
      bar.querySelectorAll("[data-state]").forEach(function (a) {
        if (a.getAttribute("data-state") === st) a.setAttribute("aria-current", "true"); else a.removeAttribute("aria-current");
      });
    };
    mark();
    window.addEventListener("hashchange", mark);
  };
})();
