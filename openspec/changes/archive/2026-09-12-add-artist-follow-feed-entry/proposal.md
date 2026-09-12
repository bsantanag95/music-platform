## Why

`add-feed-kind-differentiation` activó "seguir a un usuario" como fila propia (tier 4) en
la línea de tiempo principal, y la retiró de la franja de eventos ambiente para no mostrar
el mismo hecho dos veces. "Seguir a un artista" quedó del otro lado de esa decisión: sigue
siendo solo un resumen agrupado al pie de `/me/feed` (`feed-ambient-events`), invisible en
la línea de tiempo. El lector no puede ver, mientras escanea su feed, que alguien que sigue
empezó a escuchar a un artista nuevo — la misma señal que "seguir a un usuario" ya expone.

## What Changes

- "Seguir a un artista" se activa como **tier 4** dentro de `listFeed` (actividad de
  seguidos) y `listMyRecentActivity` (rastro propio): una fila inline sin carátula, una
  sola línea ("Ana empezó a seguir a Radiohead"), enlazando al artista, que se pliega en
  grupo cuando el mismo autor sigue a 3 o más artistas — mismo mecanismo de corrida que ya
  usa "seguir a un usuario".
- Reutiliza el glifo de "seguir" ya existente (misma acción, distinto objetivo) en vez de
  sumar un glifo nuevo.
- **La franja "También en tu red" de `/me/feed` (`feed-ambient-events`) deja de incluir
  "seguir artista"** — ahora vive inline en la línea de tiempo principal, igual que pasó
  antes con "seguir usuario" — y conserva solo "colección física".

## Capabilities

### New Capabilities

(ninguna — todo el cambio refina capacidades existentes)

### Modified Capabilities

- `activity-feed`: el alcance del feed v1 suma "seguir a un artista" (tier 4) como octava
  fuente, con su propia regla de agrupación y su fila sin celda de carátula.
- `feed-ambient-events`: dejar de incluir "seguir artista" entre sus fuentes — ahora vive en
  la línea de tiempo principal de `activity-feed`. Queda una única fuente: colección física.

## Impact

- **Código**: `src/services/feed/feed.ts` (nueva fuente "follow-artist" en `listFeed`),
  `src/services/home/home.ts` (misma fuente en `listMyRecentActivity`),
  `src/services/feed/ambient.ts` (retirar fuente "seguir artista"),
  `src/components/feed/feed-entry-tier.ts` y `feed-grouping.ts` (nuevo kind agrupable tier
  4), `src/components/feed/FeedActivityList.tsx`, `CompactActivityRow.tsx`,
  `FeedAmbientStrip.tsx` (presentación).
- **Superficies visuales**: `/me/feed`, el preview de feed y de rastro reciente de Inicio, y
  las pestañas "De la gente que seguís" / "Tu actividad" de `/activity` heredan la fila de
  "empezó a seguir a" por reusar los mismos componentes compartidos.
- **Sin migraciones**: `artist_follow` ya existe; no hace falta ninguna tabla ni columna
  nueva.
- **i18n**: nuevas claves en `messages/{es,en}/feed.json` (verbo "empezó a seguir a", grupo
  "empezó a seguir a N artistas"); se retira `ambient.followArtistVerb` (ya sin uso).
