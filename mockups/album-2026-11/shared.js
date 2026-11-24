// Común a los mockups de la ficha de álbum: cabecera del sitio, datos reales de «The Number of the Beast» (base local,
// 2026-11-24: pistas, compositores, formación, 51 ediciones) y carátulas reales en miniatura de 250 px del Cover Art
// Archive por release-group (la misma fuente y el mismo tamaño que usa la app; no se copian imágenes al repositorio).
(function () {
  var DISC =
    '<svg viewBox="0 0 100 100" aria-hidden="true"><g fill="none" stroke="currentColor" stroke-width="1.2"><circle cx="50" cy="50" r="46"/><circle cx="50" cy="50" r="20"/></g><circle cx="50" cy="50" r="3" fill="currentColor"/></svg>';

  // [título, duración, compositores]
  var TRACKS = [
    ["Invaders", "3:24", ["Steve Harris"]],
    ["Children of the Damned", "4:35", ["Steve Harris"]],
    ["The Prisoner", "6:02", ["Adrian Smith", "Steve Harris"]],
    ["22, Acacia Avenue", "6:36", ["Adrian Smith", "Steve Harris"]],
    ["The Number of the Beast", "4:51", ["Steve Harris"]],
    ["Run to the Hills", "3:54", ["Steve Harris"]],
    ["Gangland", "3:49", ["Adrian Smith", "Clive Burr"]],
    ["Hallowed Be Thy Name", "7:11", ["Steve Harris"]],
  ];
  // Formación de este disco: [nombre, rol]
  var LINEUP = [
    ["Bruce Dickinson", "voz principal"],
    ["Dave Murray", "guitarra eléctrica"],
    ["Adrian Smith", "guitarra eléctrica"],
    ["Steve Harris", "bajo eléctrico"],
    ["Clive Burr", "batería"],
  ];
  var PRODUCTION = [["Martin Birch", "producción, ingeniería"]];
  // Discografía de estudio (la franja).
  var STRIP = [
    ["Iron Maiden", 1980, "88a735ad-1f8a-3f96-b410-7e5058dff7f6"],
    ["Killers", 1981, "cf1e9a98-3ea7-33e5-a8b6-8665dd9a206b"],
    ["The Number of the Beast", 1982, "4ebfe175-e7ed-34cd-8e91-67c7e4a53579"],
    ["Piece of Mind", 1983, "169361b5-af6f-34ca-b8f2-13605a7f9691"],
    ["Powerslave", 1984, "60a20bc8-acac-3cbb-99f9-ce458317233a"],
    ["Somewhere in Time", 1986, "a5fe4d2d-3aab-3e86-91ad-22a3fe16c4f2"],
    ["Seventh Son of a Seventh Son", 1988, "1b0d4fdb-d4ee-308f-9755-ccb7dc31a001"],
    ["No Prayer for the Dying", 1990, "1a2e5820-19f6-3559-b32b-888ddb340f6a"],
    ["Fear of the Dark", 1992, "153c0331-41b2-33b9-b86e-c6717761aa80"],
    ["The X Factor", 1995, "4477b6ae-6935-315c-8a41-482cdf3d7040"],
    ["Virtual XI", 1998, "c4a2262d-08bf-35ba-846c-79209b1121c9"],
    ["Brave New World", 2000, "80296824-f1f3-3d1d-a073-c4469bfa6952"],
  ];
  // Ediciones: 51 (50 oficiales). Por formato y una muestra de filas reales.
  var EDITIONS = {
    total: 51, official: 50, formats: [["CD", 28], ["Vinilo", 15], ["Casete", 3], ["Digital", 4]],
    rows: [
      [1982, "GB", "Vinilo 12\"", "EMI · EMC 3400", 8],
      [1982, "US", "Vinilo 12\"", "Harvest · ST-12202", 8],
      [1982, "JP", "Vinilo 12\"", "EMI · EMS-91034", 9],
      [1987, "US", "CD", "Capitol Records · CDP 7 46364 2", 8],
      [1986, "JP", "CD", "EMI · CP32-5108", 8],
    ],
  };
  window.ALBUM = {
    title: "The Number of the Beast", artist: "Iron Maiden", mbid: "4ebfe175-e7ed-34cd-8e91-67c7e4a53579",
    type: "Álbum de estudio", date: "29 de marzo de 1982", year: 1982, tracks: TRACKS, length: "40:22", label: "EMI",
    genre: "heavy metal", lineup: LINEUP, production: PRODUCTION, strip: STRIP, editions: EDITIONS,
  };

  window.coverUrl = function (mbid) {
    return "https://coverartarchive.org/release-group/" + mbid + "/front-250";
  };

  // [data-mb] → carátula real; sin carátula o si falla, el disco de reserva (nunca el icono roto).
  window.paintCovers = function (root) {
    (root || document).querySelectorAll("[data-mb]").forEach(function (el) {
      var mb = el.dataset.mb;
      if (!mb) return;
      var img = new Image();
      img.alt = "";
      img.decoding = "async";
      img.onload = function () { el.style.backgroundImage = "url(" + img.src + ")"; el.classList.add("has-cover"); };
      img.src = window.coverUrl(mb);
    });
    (root || document).querySelectorAll(".disc:empty").forEach(function (el) { el.innerHTML = DISC; });
  };

  window.esc = function (s) {
    return String(s).replace(/[&<>"]/g, function (c) { return { "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;" }[c]; });
  };

  var header =
    '<div class="bar">' +
    '<a class="brand" href="#"><i><svg viewBox="0 0 24 24" fill="currentColor"><path d="M9 18a3 3 0 1 1-2-2.83V5l11-2v11.17A3 3 0 1 1 16 17V7.4l-7 1.27V18z"/></svg></i>music-platform</a>' +
    '<nav class="site-nav" aria-label="Principal"><a href="#">Explorar</a><a href="#">Listas</a><a href="#">Comunidad</a></nav>' +
    '<label class="hsearch"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><circle cx="11" cy="11" r="7"/><path d="m20 20-3.5-3.5"/></svg><span>Buscar artistas</span><kbd>/</kbd></label>' +
    '<div class="acct"><span class="lang"><span>ES</span><span>EN</span></span><a href="#">Iniciar sesión</a><a class="btn-amber" href="#">Crear cuenta</a></div>' +
    '<div class="icons"><button class="icon-btn" aria-label="Abrir búsqueda"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><circle cx="11" cy="11" r="7"/><path d="m20 20-3.5-3.5"/></svg></button><button class="icon-btn" aria-label="Abrir menú"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round"><path d="M4 7h16M4 12h16M4 17h16"/></svg></button></div>' +
    "</div>";

  document.addEventListener("DOMContentLoaded", function () {
    var h = document.querySelector(".site-header");
    if (h) h.innerHTML = header;
    if (window.renderMockup) window.renderMockup();
    window.paintCovers();
  });
})();
