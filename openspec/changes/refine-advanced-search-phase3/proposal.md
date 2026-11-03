## Why

Tercera fase del rediseño de la búsqueda avanzada (auditoría del 2026-11-03, respuestas recomendadas). Los resultados no
dejan comprobar que cumplen lo pedido: con un filtro de duración las canciones no muestran su duración; con un filtro de
año de inicio solo los artistas ya visitados muestran sus años (los de MusicBrainz no, aunque la búsqueda los trae); la
desambiguación repite el país ("Belial · Chile · Chile"); y no hay una vista compacta para recorrer muchos resultados
como en Metal Archives.

## What Changes

- Las filas destacan los datos que la búsqueda filtró (tipo, país, ciudad, años; artista, tipo y año de lanzamiento;
  álbum, duración).
- Los artistas de MusicBrainz muestran años y ciudad o región de inicio, con lo que trae la propia búsqueda. Las filas
  de artista suman la ciudad o región y la desambiguación deja de repetir el país o la ciudad.
- Las canciones muestran su duración.
- Vista **Tabla** en pantallas anchas, con las columnas de los criterios marcadas; Lista por defecto y la elección se
  recuerda en el navegador. "Cargar más" respeta la vista.

## Capabilities

### Modified Capabilities

- `advanced-search-filters`: datos filtrados destacados y vista Tabla.
- `search-scopes`: años y ciudad de artistas de MusicBrainz, desambiguación sin repetir el país, duración de canciones.

## Impact

`src/services/catalog/search/{types,artists,songs,filters}.ts` (`beginArea`, `durationSec`, `highlightFields`),
`src/services/musicbrainz/types.ts`, esquemas del cliente, `ArtistResults`, `AlbumResults`, `SongResults`,
`LoadMoreResults`, `MetaLine` nuevo, `ResultsView.tsx` y `ResultsTable.tsx` nuevos, `SearchChrome`, `sections.tsx`,
página avanzada, mensajes, tests y docs (`04-api/contracts.md`, `05-features/catalog-browsing.md`). Sin cambios de
esquema; la API suma dos campos opcionales.
