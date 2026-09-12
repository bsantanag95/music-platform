## Why

Hoy el feed trata sus fuentes (escucha, favorito, evento de lista, valoración, comentario,
reseña) como variaciones de una misma fila: solo cambia el verbo del renglón de metadatos.
Comentario y reseña son visualmente idénticos pese a que la reseña es, de las seis fuentes
actuales, la que más esfuerzo editorial tiene. Además, dos huecos de datos concretos dejan
actividad real invisible: agregar un ítem a una lista existente no genera nada en el feed
(`addItemToList` nunca toca `updated_at`), y "seguir a un usuario" — tier 4 ya nombrado en
`feed-entry-tier.ts` pero nunca activado — no aparece en la línea de tiempo, solo como
resumen agrupado al pie de `/me/feed` (`feed-ambient-events`).

## What Changes

- Cada entrada del feed (`FeedActivityList`, `CompactActivityRow`) gana un glifo mono de
  14px junto al verbo — misma familia visual que los íconos de reacción de escucha,
  siempre acompañado del texto, nunca la única señal.
- La reseña gana identidad propia: rótulo "Reseña" en petróleo (segundo acento del
  sistema, hoy sin usar en el feed), su título como titular, y borde izquierdo propio —
  deja de ser visualmente idéntica a un comentario.
- Agregar un ítem a una lista existente ahora también cuenta como "actualizó una lista":
  `addItemToList` toca `user_list.updated_at` cuando efectivamente inserta un ítem, y esa
  lista reaparece en el feed como la misma entrada "Actualizó una lista" que ya existe (sin
  tipo de registro nuevo). Quitar un ítem queda fuera de esta iteración.
- "Seguir a un usuario" se activa como **tier 4** dentro de `listFeed` (actividad de
  seguidos) y `listMyRecentActivity` (rastro propio): una fila inline sin carátula, una
  sola línea ("Ana siguió a Fran"), que se pliega en grupo cuando el mismo autor sigue a 3
  o más personas seguidas — mismo mecanismo de corrida que ya usan escuchas, favoritos y
  ratings.
- **La franja "También en tu red" de `/me/feed` (`feed-ambient-events`) deja de incluir
  "seguir usuario"** — ahora vive inline en la línea de tiempo principal — y conserva solo
  "seguir artista" y "colección física", para no mostrar el mismo hecho dos veces en la
  misma página.

## Capabilities

### New Capabilities

(ninguna — todo el cambio refina capacidades existentes)

### Modified Capabilities

- `activity-feed`: la jerarquía de presentación gana diferenciación visual por tipo (glifo
  por `kind`, tratamiento propio de reseña); el alcance del feed v1 suma "seguir a un
  usuario" (tier 4, antes definido pero no activado) como séptima fuente, con su propia
  regla de agrupación; y agregar un ítem a una lista existente pasa a contar como
  actualización de esa lista.
- `feed-ambient-events`: dejar de incluir "seguir usuario" entre sus fuentes — ahora vive
  en la línea de tiempo principal de `activity-feed`, no en el resumen agrupado al pie de
  `/me/feed`.

## Impact

- **Código**: `src/services/feed/feed.ts` (nueva fuente "follow" en `listFeed`),
  `src/services/home/home.ts` (misma fuente en `listMyRecentActivity`),
  `src/services/lists/lists.ts` (`addItemToList` toca `updated_at`),
  `src/services/feed/ambient.ts` (retirar fuente "seguir usuario"),
  `src/components/feed/feed-entry-tier.ts` y `feed-grouping.ts` (tier 4 agrupable),
  `src/components/feed/FeedActivityList.tsx`, `CompactActivityRow.tsx`,
  `FeedAmbientStrip.tsx` (presentación).
- **Superficies visuales**: `/me/feed`, el preview de feed y de rastro reciente de Inicio,
  y las pestañas "De la gente que seguís" / "Tu actividad" de `/activity` heredan el glifo
  por tipo, el tratamiento de reseña y la fila de "siguió a" por reusar los mismos
  componentes compartidos — sin cambios propios en esas páginas.
- **Sin migraciones**: `user_follow` y el trigger `trg_user_list_updated_at` ya existen;
  no hace falta ninguna tabla ni columna nueva.
- **i18n**: nuevas claves en `messages/{es,en}/feed.json` (verbo "siguió a", grupo "siguió
  a N personas", rótulo "Reseña"); se retira `ambient.followUserVerb` (ya sin uso).
