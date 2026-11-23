// Común a los mockups de la ficha de artista: cabecera del sitio, datos reales de Iron Maiden (base
// local, 2026-11-21) y carátulas reales en miniatura de 250 px del Cover Art Archive (la misma
// fuente y el mismo tamaño que usa la app; no se copian imágenes al repositorio).
(function () {
  var DISC =
    '<svg viewBox="0 0 100 100" aria-hidden="true"><g fill="none" stroke="currentColor" stroke-width="1.2"><circle cx="50" cy="50" r="46"/><circle cx="50" cy="50" r="20"/></g><circle cx="50" cy="50" r="3" fill="currentColor"/></svg>';

  // Álbumes de estudio (los 17 de «Principal»).
  var ALBUMS = [
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
    ["Dance of Death", 2003, "3bbfa3e4-dfbc-31f2-93d8-86f109d5158c"],
    ["A Matter of Life and Death", 2006, "f27a9426-7f13-3c21-8861-204e42a82bd8"],
    ["The Final Frontier", 2010, "1ba23598-98e6-4fce-b26f-3cf076c14a12"],
    ["The Book of Souls", 2015, "2220348e-c3f7-4da7-9cad-d84530077234"],
    ["Senjutsu", 2021, "542a86ba-fcdf-4133-99e3-07a462743162"],
  ];
  // EP y otros de «Principal» (19): con carátula o sin ella (null → ficha tipográfica).
  var OTHERS = [
    ["The Soundhouse Tapes", 1979, "188aeb75-191d-3fdc-91dd-b98e0b0e3216", "EP"],
    ["Lo mejor de Iron Maiden", 1983, null, "EP"],
    ["Video Pieces", 1983, "15592b1f-a00e-4ac2-8a7b-67a8150df0b9", "Video"],
    ["Behind the Iron Curtain", 1984, null, "EP"],
    ["Christmas EP", 1984, null, "EP"],
    ["Audio Pieces", 1986, null, "EP"],
    ["No Prayer for the Dying", 1990, null, "EP"],
    ["A Real Dead One", 1993, null, "EP"],
    ["An Introduction to… Virtual XI", 1998, null, "EP"],
    ["Ed Hunter", 1999, null, "Otro"],
    ["Eddie's Archive", 2002, null, "Caja"],
    ["Rock in Rio", 2002, "b4512187-24e9-480a-8435-cafb38b7674a", "Video"],
    ["Dance of Death", 2003, "b199e062-ab31-4e04-b2e2-dc2c1aed2004", "EP"],
    ["No More Lies: Dance of Death Souvenir EP", 2004, "643901e3-e1e8-3578-8784-b210639ab6fa", "EP"],
    ["A Matter of Life and Death", 2006, null, "EP"],
    ["Somewhere Back in Time", 2008, "22fe6b03-bc93-441b-8e29-3a2004915e39", "EP"],
    ["Flight 666", 2009, null, "Video"],
    ["En Vivo!", 2012, null, "Video"],
    ["Maiden England ’88", 2013, "2d11f9e7-e300-43ba-8dd4-9430de9a92f6", "Video"],
  ];
  // Alineación: [nombre, rol, desde, hasta (null = presente), fundador].
  var CURRENT = [
    ["Steve Harris", "Bajo, teclados, coros", 1975, null, true],
    ["Dave Murray", "Guitarra", 1976, null, false],
    ["Adrian Smith", "Guitarra, coros", 1980, null, false],
    ["Bruce Dickinson", "Voz principal", 1981, null, false],
    ["Janick Gers", "Guitarra", 1990, null, false],
    ["Simon Dawson", "Batería", 2024, null, false],
  ];
  // Períodos para la línea de tiempo de la alineación (los más largos y las voces).
  var ERAS = [
    ["Steve Harris", "Bajo", [[1975, 2026]]],
    ["Dave Murray", "Guitarra", [[1976, 1977], [1978, 2026]]],
    ["Adrian Smith", "Guitarra", [[1980, 1990], [1999, 2026]]],
    ["Janick Gers", "Guitarra", [[1990, 2026]]],
    ["Paul Di’Anno", "Voz", [[1978, 1981]]],
    ["Bruce Dickinson", "Voz", [[1981, 1993], [1999, 2026]]],
    ["Blaze Bayley", "Voz", [[1994, 1999]]],
    ["Clive Burr", "Batería", [[1979, 1982]]],
    ["Nicko McBrain", "Batería", [[1982, 2024]]],
    ["Simon Dawson", "Batería", [[2024, 2026]]],
  ];
  window.ARTIST = { ALBUMS: ALBUMS, OTHERS: OTHERS, CURRENT: CURRENT, ERAS: ERAS };

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

  window.initials = function (name) {
    return name.replace(/[^A-Za-zÀ-ÿ ]/g, "").split(" ").filter(Boolean).slice(0, 2).map(function (w) { return w[0]; }).join("");
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
