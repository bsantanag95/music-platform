## Why

La dirección `redefine-content-hierarchy` (D9) define un **tier 4 "ambiente / automático"**:
eventos derivados sin una acción expresiva —seguir a un artista, seguir a otra persona,
sumar un disco a la colección física—. `rework-feed-tiers` reservó el tier pero lo dejó
**fuera del feed**; el clasificador `feedEntryTier` tiene la rama `4` sin fuente. D9 admite
dos tratamientos: "agrupación agresiva **o quedar fuera del feed principal**". Este cambio
elige el segundo: una **franja compacta y aparte** en `/me/feed`, para que la actividad de
seguimiento y colección de tu red sea visible sin diluir el listado cronológico de
actividad expresiva.

## What Changes

- Nueva **franja "También en tu red"** al pie de `/me/feed`, debajo del listado
  cronológico: un resumen agrupado y agresivamente compacto de los eventos ambiente
  recientes de las personas que seguís.
- **Tres fuentes**, agrupadas **por autor y tipo** (una línea por persona y tipo, nunca un
  evento suelto por acción):
  - **Seguir artista** (`artist_follow`) — "{persona} siguió a {artistas}".
  - **Seguir usuario** (`user_follow`, relación aceptada) — "{persona} empezó a seguir a
    {personas}".
  - **Colección física** (`collection_entry`) — "{persona} sumó {discos} a su colección".
- **Visibilidad**:
  - `artist_follow`: público implícito (mismo criterio que la sección "Exploración" del
    perfil), filtrado por seguido con relación aceptada + sin bloqueo.
  - `collection_entry`: audiencia propia (`followers`/`public`) + seguido aceptado + sin
    bloqueo.
  - `user_follow`: el evento aparece solo si el **objetivo del seguimiento tiene perfil
    público** (o el lector ya lo sigue con relación aceptada), el objetivo no es el propio
    lector, y no hay bloqueo lector↔objetivo. Solo relaciones `accepted`.
  - En las tres, la actividad del **propio lector no aparece**.
- **Ventana** de 14 días (los eventos ambiente son escasos; constante con nombre).
- **Tono ambiente**: la franja es visualmente menor y muted, sin carátulas grandes, sin
  contador destacado; es un coda del feed, no un competidor por la atención.
- **Sin migración, sin endpoint, sin fetcher**: cálculo bajo demanda en el Server Component
  de la página (`cache()`), igual criterio que `network-convergence` / `taste-fingerprint`.
  La franja colapsa entera si no hay eventos.
- **No toca** el listado cronológico: `feedEntryTier`, `groupFeedRuns`, `FeedEntry`,
  `FEED_KINDS` y `/api/me/feed` quedan igual. La franja es una superficie separada.

## Capabilities

### New Capabilities

- `feed-ambient-events`: la franja de eventos ambiente (tier 4) de `/me/feed` — las tres
  fuentes que la alimentan, su filtrado por visibilidad, la exclusión de la actividad del
  propio lector, la ventana, la agrupación agresiva por autor y tipo, y su presentación
  compacta y de-enfatizada al pie del feed, separada del listado cronológico.

### Modified Capabilities

_Ninguna._ `activity-feed` (el listado cronológico) no cambia: la franja es una superficie
nueva y separada, y el escenario "los eventos ambiente no aparecen en el listado" sigue
siendo cierto para ese listado.

## Impact

- **Nuevo servicio** `src/services/feed/ambient.ts` — `getFeedAmbientEvents(viewerId)`
  memoizado por request. Tres consultas (artist_follow / user_follow / collection_entry)
  filtradas por seguidos visibles + ventana, agrupadas por autor y tipo en memoria.
- **Nuevo componente** `src/components/feed/FeedAmbientStrip.tsx` — Server Component,
  colapsa si vacío.
- **Modificado** `src/app/[locale]/me/feed/page.tsx` — resuelve los eventos ambiente junto
  al feed y la convergencia, y renderiza la franja **debajo** de `<FeedList>`.
- **i18n** `messages/{es,en}/feed.json` — bloque `ambient` (encabezado, plantillas por
  tipo, "y N más").
- **Docs** `docs/05-features/activity-feed.md` — la fila "Automática" de la tabla de las
  cuatro naturalezas pasa de "todavía no llega al feed" a "franja al pie de `/me/feed`";
  nueva sección describiendo la franja.
- Sin cambios de esquema: `artist_follow`, `user_follow` y `collection_entry` ya existen
  con sus índices por `user_id` / `created_at`.
