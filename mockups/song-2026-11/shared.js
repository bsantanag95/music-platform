// Común a los mockups de la ficha de canción: cabecera del sitio, datos reales de «Hallowed Be Thy Name» (base local,
// 2026-11-24: créditos, apariciones, 17 versiones) y carátulas reales en miniatura de 250 px del Cover Art Archive por
// release-group (la misma fuente y el mismo tamaño que usa la app; no se copian imágenes al repositorio).
(function () {
  var DISC =
    '<svg viewBox="0 0 100 100" aria-hidden="true"><g fill="none" stroke="currentColor" stroke-width="1.2"><circle cx="50" cy="50" r="46"/><circle cx="50" cy="50" r="20"/></g><circle cx="50" cy="50" r="3" fill="currentColor"/></svg>';

  // El disco principal: [título, duración, compositores]
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
  // Intérpretes de esta grabación (los cinco son integrantes): [nombre, rol]
  var PERFORMERS = [
    ["Bruce Dickinson", "voz principal"],
    ["Dave Murray", "guitarra eléctrica"],
    ["Adrian Smith", "guitarra eléctrica"],
    ["Steve Harris", "bajo eléctrico"],
    ["Clive Burr", "batería"],
  ];
  // Discos que contienen esta misma grabación: [título, fecha, mbid del release-group, tipo]
  var APPEARANCES = [
    ["The Number of the Beast", "mar 1982", "4ebfe175-e7ed-34cd-8e91-67c7e4a53579", "Álbum de estudio"],
    ["Best of the Beast", "sept 1996", "28b67259-fee2-3c1b-bc18-2b648983ca67", "Recopilación"],
    ["Eddie’s Head", "1998", "bfdb7774-c7ee-4b7f-9e9e-7822be457bf2", "Recopilación"],
    ["Ed Hunter", "1999", "4c1dec69-3b3a-3e30-a730-8cc608ec2347", "Recopilación"],
    ["Somewhere Back in Time", "abr 2008", "01274d63-bc3f-3f22-acef-2dd9c09ebebe", "Recopilación"],
    ["The Complete Album Collection", "2008", "65a0f64b-3e1e-49c1-a0c3-9600b6395a7e", "Recopilación"],
    ["The Complete Albums Collection 1980–1988", "2014", "34a6da20-fd86-4c12-ae84-80c0aed7b04e", "Recopilación"],
    ["The Number of the Beast / Beast Over Hammersmith", "nov 2022", "33aa153e-13a3-487a-b2a8-7e1dfa1450e2", "Recopilación"],
  ];
  // Otras grabaciones de la obra, en vivo: [año, disco, duraciones]
  var LIVE = [
    [1985, "Live After Death", ["7:22"]],
    [1990, "New York Palladium", ["7:24"]],
    [1993, "A Real Dead One", ["7:52"]],
    [1993, "Live at Donington: August 22nd 1992", ["7:28"]],
    [2001, "The History of Iron Maiden, Part 1: The Early Days", ["6:58"]],
    [2002, "Rock in Rio", [null]],
    [2002, "BBC Archives", ["7:37", "7:10"]],
    [2002, "Beast Over Hammersmith", ["7:31"]],
    [2003, "Visions of the Beast", ["7:36"]],
    [2005, "Death on the Road", ["7:32"]],
    [2009, "Flight 666: The Original Soundtrack", ["7:53"]],
    [2012, "En Vivo!", ["7:29", "7:30"]],
    [2020, "Nights of the Dead, Legacy of the Beast: Live in Mexico City", ["7:38"]],
  ];
  var OTHERS = [[2001, "The Number of the Beast (sencillo)", ["Rio 2001"]]];

  window.SONG = {
    title: "Hallowed Be Thy Name", artist: "Iron Maiden", duration: "7:11", writers: ["Steve Harris"], genre: "heavy metal",
    album: { title: "The Number of the Beast", mbid: "4ebfe175-e7ed-34cd-8e91-67c7e4a53579", year: 1982, date: "29 de marzo de 1982", type: "Álbum de estudio", length: "40:22" },
    position: 8, tracks: TRACKS, performers: PERFORMERS, production: [["Martin Birch", "producción, ingeniería"]],
    appearances: APPEARANCES, live: LIVE, others: OTHERS,
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
