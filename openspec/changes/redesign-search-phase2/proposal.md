## Why

La fase 1 (`redesign-search-phase1`, en `main` 7dcd638b) dio a `/search` el marco ancho, un solo buscador y la columna
lateral. Lo que se destaca, en cambio, sigue igual. Con «pink», la «mejor coincidencia» es un grupo japonés sin discos,
elegido por tener el nombre idéntico, mientras Pink Floyd (233 discos en el catálogo) queda séptimo. En Álbumes, el disco
buscado es una fila de 48 px igual a las otras 24. En Canciones, la respuesta es un panel «Álbumes que contienen «Creep»» y
la canción en sí no tiene ficha. La columna lateral de Usuarios y de Canciones sin «Acotar» está vacía.

Esta es la fase 2 de la dirección **B · Respuesta primero** (`mockups/search-2026-11/b-respuesta.html`): arriba, la
respuesta.

## What Changes

- **Artistas: respuesta o elección.** Si algún homónimo exacto tiene discografía en el catálogo, la respuesta es el que más
  discos tiene, en una tarjeta grande con foto. Si ninguno la tiene pero hay artistas del catálogo cuyo nombre contiene
  todas las palabras de la consulta, la página pregunta «¿Cuál «x» buscas?». Muestra hasta dos de ellos (los de más discos)
  y el primer homónimo exacto, marcado «Nombre idéntico a «x»». Sin ninguno de los dos casos, queda como hoy (primer
  homónimo exacto). Debajo, los demás homónimos se pliegan tras los tres primeros («Ver los N»).
- **Álbumes: ficha del disco buscado.** Cuando el primer resultado cubre la consulta (título exacto, o artista + título),
  se muestra en una ficha: carátula grande, título, artista, categoría y año, la media de la comunidad si la hay, las
  primeras canciones si su tracklist ya está guardada (sin ingerir nada) y «Ver el disco». Si el mismo artista tiene otros
  discos con ese título en la lista, la ficha los enlaza («También: single de 2023»). El resto sigue debajo como «Otros
  álbumes».
- **Canciones: ficha de la canción resuelta.** Reemplaza al panel «Álbumes que contienen…»: título, artista, duración,
  carátula del primer disco, una tira con los discos donde aparece (5 + «Ver N más») y «Ver la canción» cuando hay
  `recordingId`.
- **«x» en otros tipos, en la columna lateral.** Hasta tres coincidencias **solo del catálogo propio** del mismo texto en otro
  tipo: Artistas → álbumes, Álbumes → canciones, Canciones → álbumes. Incluye «Ver álbumes →» / «Ver canciones →». No hace
  solicitudes a MusicBrainz y no aparece si no hay coincidencias locales. Se transmite aparte, así que no retrasa los
  resultados.

## Goals

- Que la primera tarjeta sea lo que la mayoría busca, con una regla explicable que se apoya en datos del catálogo.
- Que el disco o la canción buscados se distingan de las coincidencias de título.
- Llenar la columna lateral con algo útil y barato.

## Non-Goals

- Rejilla de carátulas para «Otros discos llamados «x»» y nuevo estado sin resultados (fase 3).
- Usar alias de MusicBrainz (P!nk para «pink»): la respuesta de búsqueda no los trae.
- Contar actividad de la comunidad en la regla de la respuesta.
- Cambiar la relevancia, el endpoint `/api/catalog/search` o la redirección por coincidencia exacta única.
- Cambios en `/search/advanced`.

## Capabilities

### New Capabilities

(ninguna)

### Modified Capabilities

- `search-scopes`: la «Mejor coincidencia con homónimos» pasa a elegirse por presencia en el catálogo, con el modo «¿Cuál «x» buscas?» y los homónimos plegados.
- `catalog-search`: ficha de respuesta en Álbumes; ficha de la canción resuelta en Canciones (modifica «Acceso directo a la canción resuelta»); «x» en otros tipos en la columna lateral, solo del catálogo.

## Impact

- `src/services/catalog/search/`: regla pura `pickArtistAnswer` (con tests de propiedades), lectura local de la tracklist ya guardada (`getStoredTracklistPreview`, sin ingesta) y una función para las coincidencias locales en otro tipo.
- `src/app/[locale]/(catalog)/search/sections.tsx`: respuesta por tipo y lateral con `Suspense` propio.
- `src/components/catalog/search-results/`: `ArtistChoice` / `ArtistAnswer`, `AlbumAnswer`, `SongAnswer` (reemplaza a `SongGroupPanel` en la rápida) y `OtherTypePanel`.
- `messages/{es,en}/catalog.json` y `src/i18n/client-messages.json` si cambian textos de componentes cliente.
- `docs/05-features/catalog-browsing.md`. La Ayuda solo describe la búsqueda en general y no cambia.
- Sin cambios de esquema, API ni dependencias.
