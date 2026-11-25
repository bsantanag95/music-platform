## Why

Las Fases 1 y 2 (`modernize-song-page-phase1/2`, `main` 6941cf42) dejaron la tarjeta de la canción y los créditos con «En el disco».
Debajo quedan las dos secciones que la auditoría (`mockups/song-2026-11/`) marcó: «Esta grabación aparece en» es una lista en dos
columnas con miniaturas de 40 px que esconde la mayoría de los discos tras «+N», y «Otras versiones de la canción» repite «Ver
versión» en casi cada fila (11 veces en *Hallowed Be Thy Name*) mientras lo que distingue una grabación en vivo de otra —el año y la
duración— queda lejos. Los comentarios conservan un título de 20 px frente a los 24 px de las demás secciones. La propuesta elegida
(**D · Mezcla**, cuerpo de **A · Escenario**) resuelve las tres. Esta es la Fase 3, la última.

## What Changes

- **«Aparece en» como franja de carátulas:** los discos que contienen la grabación pasan a una franja horizontal desplazable, con
  carátulas de 128 px (las mismas de la franja de discografía del álbum), título, fecha y tipo de disco cuando no es un álbum de
  estudio; «Primer lanzamiento» en el más temprano. El orden de los tipos se mantiene (estudio, singles y EP, recopilaciones,
  en vivo y otros) y, junto al título, un resumen por tipo («1 álbum · 7 recopilaciones»). Desaparecen las columnas y los «+N».
- **Versiones sin «Ver versión»:** cuando un disco tiene una sola grabación sin variante, el nombre del disco enlaza a esa versión y
  la celda de grabaciones muestra solo su duración (y sus atributos). Las variantes con nombre («take 1») quedan como hoy y, en un disco con varias grabaciones, la
  que no agrega nada se llama «Grabación N» (nunca «Ver versión»). La columna «Grabaciones» pasa a «Duración y variantes».
- **Comentarios con la escala de las secciones:** el título de los comentarios de la canción pasa a 24 px en negrita (prop opcional
  del componente compartido; álbum y artista no cambian).

### Goals

- Que apariciones y versiones se lean de un vistazo, con la carátula y la duración como protagonistas.

### Non-Goals

- La línea de vida de versiones de la propuesta B (descartada).
- Cambiar qué discos o versiones se muestran, su agrupación o el contenido de los comentarios.
- Cambiar los comentarios del álbum y del artista.

## Capabilities

### New Capabilities

_(ninguna)_

### Modified Capabilities

- `song-versions`: «Aparece en» como franja con resumen por tipo; versiones con el disco enlazado a la versión única y su duración.
- `song-page-layout`: título de los comentarios a la escala de las secciones.

## Impact

`src/components/song/SongAppearances.tsx` (franja con `DiscographyScroller`); `src/components/song/SongVersions.tsx` (fila de disco);
`src/components/social/Comments.tsx` (prop opcional del título); `page.tsx`; mensajes `messages/{es,en}/catalog.json`;
`client-messages.json`; tests de la página; `docs/05-features/catalog-browsing.md`. Sin datos, API, esquema ni dependencias.
