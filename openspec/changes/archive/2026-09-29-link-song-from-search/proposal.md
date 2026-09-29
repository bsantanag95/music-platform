## Why

Buscar una canción concreta (tipo Canciones) resuelve bien el grupo canción+artista, pero el panel
"Álbumes que contienen «X»" solo enlaza a los álbumes. Para llegar a la canción hay que abrir un
álbum y recién ahí elegir la pista: la búsqueda exacta no ahorra el clic que promete. La grabación
resuelta ya viene identificada en la respuesta (`recordingId`), así que el enlace directo no cuesta
datos nuevos.

## What Changes

- En el grupo **resuelto** del tipo Canciones (el panel "Álbumes que contienen «X»") se agrega un
  enlace **"Ver canción"** en el encabezado que va a `/song/<recordingId>`.
- El enlace solo aparece cuando el grupo tiene `recordingId` (el grupo expandido, ya sea en el
  render local inmediato o en la respuesta de MusicBrainz). Sin `recordingId` el panel queda como
  hoy.
- La lista de álbumes que contienen la canción sigue igual: es información de contexto, no se
  reemplaza.
- No cambia el contrato de `GET /api/catalog/search`: `recordingId` ya existe. No cambia el
  presupuesto de MusicBrainz ni la ingesta.
- Los grupos no resueltos ("Otras canciones con ese título") siguen re-ejecutando la búsqueda; no
  se resuelven ni se ingieren para enlazarlos.

## Goals

- Que una búsqueda exacta de canción lleve directo a la ficha de la canción con un solo clic,
  además de mostrar sus álbumes.
- Reutilizar el `recordingId` que la búsqueda ya produce, sin tocar API, esquema ni presupuesto.

## Non-Goals

- Enlazar `/song/<id>` desde los grupos colapsados ni desde "Otras canciones con ese título"
  (implicaría más browses/ingestas de MusicBrainz).
- Cambiar el shape de la respuesta de búsqueda o el orden de los resultados.
- Tocar la página de canción, la ingesta o los smoke tests.

## Capabilities

### New Capabilities

_(ninguna)_

### Modified Capabilities

- `catalog-search`: se retira el requisito "Resultado de canción sin página propia" y se agrega el
  enlace directo a la canción resuelta cuando hay `recordingId`, conservando la lista de álbumes.

## Impact

- `src/components/catalog/search-results/SongGroupPanel.tsx` (enlace directo en el encabezado).
- Mensajes `catalog.search.results.songContext.*` en `messages/es` y `messages/en`.
- `src/components/catalog/search-results/search-results.test.tsx` (tests del enlace).
- `docs/04-api/contracts.md` (regla de navegación del tipo Canciones).
- `docs/05-features/catalog-browsing.md` (sección de búsqueda).
- Sin API, sin migración, sin dependencias nuevas.
