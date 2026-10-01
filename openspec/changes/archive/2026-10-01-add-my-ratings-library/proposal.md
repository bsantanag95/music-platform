## Why

El puntaje detallado (1–100) se definió como herramienta para **rankear lo propio**, pero hoy no existe ninguna pantalla donde el usuario vea o recorra sus propias valoraciones: la nota propia solo aparece suelta en el panel "Tu relación", la tracklist, el feed, las destacadas y la columna "Tú" de la discografía de un artista. El único orden por puntaje es el desempate dentro de una discografía. Sin un lugar para ordenar y filtrar lo que ya valoraste, el número no sirve para lo que se creó: desempatar quince discos de 4★, armar el top del año.

## What Changes

- **Nueva página "Mis valoraciones" (`/me/ratings`)**, visible solo para el dueño: lista de sus valoraciones de álbumes y canciones con carátula, título, artista, estrellas y `86/100`.
- **Edición al toque**: cambiar estrellas en la fila y abrir el mismo diálogo de puntaje con deslizador (`RatingDetailDialog`) para afinar, destacar o borrar la nota.
- **Orden** por nota (estrellas y luego puntaje; los **sin puntaje después** de los que sí dentro de las mismas estrellas, sin imputar ningún valor), por peor nota, por fecha o por título.
- **Marca "Sin afinar"** en las filas sin puntaje, que además es el acceso para afinarlas.
- **Filtros** por estrellas, tipo (álbum o canción), año de salida y década; filtrar por año da el "top del año".
- **Accesos**: el menú de usuario (escritorio y panel móvil) junto a diario y favoritos, y el perfil propio.
- **Discografía**: en la columna "Tú" la nota propia añade `Tu nota: 4,5 · 86/100` solo al tooltip y al texto accesible; lo visible sigue siendo `★ 4,5`.
- **Regla confirmada** (sin cambios de comportamiento): el puntaje de otra persona nunca se muestra salvo en las destacadas; los seguidores aprobados ven solo estrellas; el artista no tiene puntaje.

## Capabilities

### New Capabilities
- `my-ratings-library`: la página y la API de las valoraciones propias (listado, orden, filtros, paginación, edición, accesos y privacidad).

### Modified Capabilities
- `rating-display`: el puntaje también se muestra en "Mis valoraciones" y, solo en tooltip y texto accesible, en la columna "Tú" de la discografía (requisito "Formato del número y dónde se muestra el puntaje detallado").
- `cross-view-navigation`: el menú de usuario añade el acceso "Mis valoraciones" (requisito "Estructura del Header para el usuario autenticado").
- `artist-discography-view`: la nota de la columna "Tú" lleva el puntaje en tooltip y texto accesible (requisito "Contenido de la tabla").

## Goals

- Dar al puntaje un hogar donde sirva: ordenar, filtrar y afinar lo propio.
- Que se pueda sacar un ranking (p. ej. el top de un año) sin pasos extra.
- No ampliar la superficie pública del puntaje: sigue siendo del dueño (y las destacadas).

## Non-Goals

- Distribución 1–100 en la huella de gusto, afinidad entre usuarios con puntaje, crear una lista desde un ranking, mostrar el puntaje en otras superficies o el ranking de otras personas.
- Valoraciones de artistas (el artista no tiene estrellas en su página).
- Vista pública de las valoraciones de otra persona (los seguidores aprobados siguen viendo estrellas solo donde ya se ven).
- Exportación del ranking, vistas de grilla o gráficas, o agrupación por año con encabezados.
- Cambios de esquema: no hay columnas nuevas.

## Impact

- Código nuevo: `src/services/ratings/my-ratings.ts` (+ test), `GET /api/me/ratings`, `src/app/[locale]/me/ratings/page.tsx`, componentes en `src/components/ratings/`, esquemas Zod en `src/lib/api/schemas.ts`, mensajes `messages/{es,en}/ratings.json` y `common.json` (menú).
- Código tocado: `src/components/layout/user-menu-items.ts` (+ test), el perfil propio (acceso), `ArtistDiscography.tsx` y su mensaje `yourStars`.
- API: un endpoint de lectura nuevo (`GET /api/me/ratings`); no cambia ningún contrato existente. Documentar en `docs/04-api/contracts.md`.
- Docs: `docs/05-features/ratings-and-reviews.md`, `docs/05-features/user-profile.md` (acceso) y `docs/05-features/catalog-browsing.md` (tooltip de la discografía).
- Sin migraciones ni dependencias nuevas.
