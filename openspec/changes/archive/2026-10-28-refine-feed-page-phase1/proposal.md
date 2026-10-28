## Why

La auditoría de `/me/feed` (2026-10-27) encontró que la página quedó por detrás de la pestaña "Siguiendo" de `/activity`,
que muestra el mismo feed con bloques por fecha y la reseña como tarjeta. La decisión es que `/me/feed` sea la versión
completa del feed de seguidos, así que primero tiene que estar a la altura:

- **Cabecera centrada y sin contexto:** sin migas ni subtítulo, en `max-w-2xl`, distinta del resto de `/me/*`.
- **Filtros que se pierden y se confunden:** búsqueda, tipo y persona no van en la URL; los selects muestran su etiqueta
  ("Tipo", "Autor") como valor vacío y miden 33 px.
- **Todo dice "hace 1 mes":** sin bloques de fecha, y la reseña se vuelca como texto corrido.
- **"· Público" en actividad ajena:** la audiencia que eligió otra persona no le sirve al lector y alarga la línea de
  metadato, que en móvil ya se parte en tres.
- **Vacío sin matiz:** no distingue "no sigues a nadie" de "la gente que sigues no publicó nada".

## What Changes

- Cabecera a la izquierda con migas (Inicio / Actividad), título "Actividad" y subtítulo, en `max-w-3xl`.
- `q`, `kind` y `author` (nombre de usuario) en la URL con `replaceState`; la página los valida y sirve la primera
  página ya filtrada. Selects con "Todos los tipos" / "Todas las personas", en caja y de 44 px en puntero grueso.
- Bloques de fecha (Hoy / Esta semana / Este mes / Antes) y reseña como tarjeta, los mismos opt-in que `/activity`.
- La audiencia solo se muestra en el rastro propio, nunca en filas de otra persona (en `/me/feed`, Inicio y
  `/activity` → Siguiendo).
- Dos estados vacíos: sin seguidos (enlace a buscar personas) y con seguidos sin actividad (enlace a la comunidad).

### Non-Goals

- Franja de personas, chips de tipo y "Nuevo desde tu última visita" (Fase 2).
- Fusión por persona, disco y día y riel lateral (Fase 3).
- Cambios en el contrato de `GET /api/me/feed`.

## Capabilities

### Modified Capabilities

- `activity-feed`: página completa del feed en `/me/feed` (cabecera, filtros en la URL, bloques, tarjeta de reseña,
  estados vacíos) y audiencia solo en el rastro propio.

## Impact

- `src/app/[locale]/me/feed/page.tsx`, `src/components/feed/FeedList.tsx`, `src/components/feed/FeedActivityList.tsx`,
  `src/components/ui/FilterSelect.tsx` (alto táctil).
- `messages/{es,en}/feed.json`, `docs/05-features/activity-feed.md`.
- Sin cambios de esquema ni de API.
