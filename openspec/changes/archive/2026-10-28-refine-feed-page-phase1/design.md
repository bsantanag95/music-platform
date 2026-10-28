## Context

`/me/feed` renderiza `NetworkConvergence` y `FeedList` (filtros en estado local, `FeedActivityList` con `clamp`).
`/activity` → Siguiendo usa el mismo `listFeed` y ya activa `dateSections` y `reviewCard` en `FeedActivityList`.

## Decisions

### D1. Nombre "Actividad"

El usuario eligió "Actividad" (más simple y general) en lugar de "Siguiendo". El menú ya la llama así; `/activity`
sigue siendo "Comunidad". Migas: Inicio / Actividad.

### D2. Filtros en la URL

`q`, `kind` y `author`. `author` lleva el nombre de usuario (legible y estable para compartir), no el id; la página lo
resuelve contra `listFeedAuthors` y descarta uno que no sea un seguido aceptado, igual que un `kind` fuera de
`FEED_KINDS`. La primera página llega del servidor ya filtrada y siembra la query de esa combinación. `FeedList` escribe
con `replaceState` (sin historial), mismo criterio que `/me/progress`.

### D3. Bloques y tarjeta de reseña

Se activan los opt-in existentes (`dateSections`, `reviewCard`): misma lectura que `/activity`, sin código nuevo de
presentación.

### D4. Audiencia solo en el rastro propio

La audiencia de una fila ajena no le dice nada al lector (si la ve, puede verla). Se muestra solo con `variant` "self" u
"own". Aplica a todas las superficies que usan `variant="feed"`.

### D5. Estados vacíos

`authors` vacío ⇒ "Todavía no sigues a nadie" con "Buscar personas" (`/users`). Con seguidos pero sin entradas ⇒ "La
gente que sigues todavía no publicó nada" con "Ver la comunidad" (`/activity`). Con filtros, el vacío de resultados de
siempre.

### D6. Selects

Variante `boxed` de `FilterSelect` (a la altura del buscador) con primera opción "Todos los tipos" / "Todas las
personas"; `FilterSelect` gana `pointer-coarse:min-h-11` para todos sus usos.
