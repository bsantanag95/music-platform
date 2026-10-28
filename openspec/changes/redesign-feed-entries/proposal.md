## Why

Las Fases 1 y 2 (`refine-feed-page-phase1`, `redesign-feed-people`) arreglaron la página y la barra de `/me/feed`. La
auditoría dejó pendiente lo que dicen las filas y el contexto:

- **Un disco, cinco filas:** una persona que valora, suma a su colección, marca como favorito, escucha y reseña el
  mismo disco el mismo día ocupa cinco filas seguidas. Solo se funden valoración, reseña y comentario.
- **"En tu red esta semana" desaparece** cuando no hay coincidencias en 7 días, y cuando aparece empuja el feed hacia
  abajo en lugar de acompañarlo.
- **Nada dice quién se movió** esta semana en la red.
- **El bloque "Nuevo" no tiene cierre:** no se marca dónde termina lo nuevo y empieza lo ya visto.

## What Changes

- **Una entrada por persona, disco y día:** las entradas seguidas de la misma persona sobre el mismo álbum el mismo día
  (en la zona horaria de la app) se funden en una fila con chips de acción (valoración, favorito, escucha, colección,
  búsqueda) y, debajo, la reseña como tarjeta, el comentario y la nota de escucha. Solo en el feed de seguidos.
- **Riel lateral desde `lg`:** "En tu red esta semana" pasa al costado; si la semana no tiene coincidencias, mira 30
  días ("En tu red este mes"). Debajo, "Quiénes más se movieron" (hasta cinco personas, sin cifras). Por debajo de `lg`,
  la convergencia sigue encima del listado y "Quiénes más se movieron" no se muestra.
- **"Estás al día":** al terminar el bloque "Nuevo desde tu última visita", una línea separa lo ya visto.

### Non-Goals

- Fracciones, rankings o cifras de actividad por persona.
- Cambiar la fusión en Inicio, en `/activity` → Tú o en el rastro propio.

## Capabilities

### Modified Capabilities

- `activity-feed`: fusión por persona, disco y día; riel lateral; cierre del bloque de novedades.
- `network-convergence`: el panel va en el riel desde `lg` y amplía la ventana a 30 días cuando la semana no tiene
  coincidencias.

## Impact

- `src/components/feed/feed-grouping.ts` (`FeedAlbumDayRow`), `feed-date-sections.ts`, `FeedActivityList.tsx`.
- `src/services/feed/convergence.ts` (ventana), `src/services/feed/feed.ts` (`listMostActiveAuthors`).
- `src/app/[locale]/me/feed/page.tsx`, `src/components/feed/NetworkConvergence.tsx`, `FeedContextRail.tsx`.
- `messages/{es,en}/feed.json`, `docs/05-features/activity-feed.md`. Sin cambios de esquema ni de API.
