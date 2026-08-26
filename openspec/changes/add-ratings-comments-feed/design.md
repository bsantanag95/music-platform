## Context

El feed v1 (`src/services/feed/feed.ts`, cambio `add-favorites-and-lists`) compone bajo
demanda tres fuentes — `listen_entry`, `favorite`, `user_list` — todas con columna
`audience` propia (`private`/`followers`/`public`) filtrada además por
`audiencesForProfile` (privacidad del perfil del autor) y por bloqueos.

`rating` y `comment` (Fase 4, tablas `rating`/`comment` en `src/db/schema.ts`) no tienen
columna de audiencia: hoy son siempre visibles para cualquiera que abra la página del
catálogo, sin filtro de privacidad de perfil ni de bloqueos. El diseño maestro de Fase 5
(`docs/05-features/phase-5-design.md` §4.2 y §9) plantea a futuro una audiencia por
actividad para todo tipo de contenido, pero implementarla para rating/comment implica una
migración de esquema y cambios de API/UI fuera del alcance de este cambio (ver decisión
del usuario: alcance mínimo).

## Goals / Non-Goals

**Goals:**
- Sumar ratings y comentarios al feed de actividad como dos fuentes nuevas en la unión
  existente, con el mismo criterio de orden y paginación en memoria que las fuentes
  actuales.
- Mostrar solo el rating **vigente** por usuario y objetivo (no un historial de cambios).
- Mostrar cada comentario como una entrada independiente.
- Filtrar ratings y comentarios ajenos por la misma regla de privacidad de perfil y
  bloqueos que ya aplica al resto del feed (`audiencesForProfile`), tratándolos como
  audiencia `public` implícita.
- Mantener el contrato existente de `GET /api/me/feed` de forma aditiva.

**Non-Goals:**
- No se agrega columna `audience` a `rating` ni a `comment`.
- No se agrega selector de audiencia a los formularios de valorar/comentar.
- No se cambia el comportamiento actual de la vista de catálogo (ratings/comentarios
  siguen siendo siempre públicos ahí).
- No se resuelve la deduplicación de eventos entre fuentes (ítem pendiente general del
  feed, fuera de este cambio) ni el comportamiento del feed cuando una actividad cambia de
  audiencia — no aplica a rating/comment porque no tienen audiencia.
- No se materializa una tabla de eventos.

## Decisions

### Rating/comment como audiencia `public` implícita, filtrada solo por perfil y bloqueo

En vez de tratar rating/comment como visibles incondicionalmente (que rompería la
consistencia del feed frente a un perfil privado o un bloqueo), se les aplica la misma
matriz `audiencesForProfile` que ya comparten diario/favoritos/listas, pero fijando su
"audiencia de origen" en `public`. Efecto práctico: un rating o comentario de un perfil
privado solo aparece en el feed de sus seguidores aprobados (igual que hoy pasa con las
actividades públicas de un perfil privado en el resto del feed), y desaparece si hay
bloqueo en cualquier dirección. Esto es un cambio de comportamiento respecto a la vista de
catálogo actual (donde son incondicionalmente públicos), pero acota el feed a la misma
regla que ya rige para todo lo demás sin tocar esquema.

Alternativa descartada: mostrarlos en el feed sin ningún filtro de perfil/bloqueo (más
simple, pero inconsistente con el resto de las fuentes y filtraría contenido de un perfil
privado a cualquiera).

### Solo el rating vigente

La tabla `rating` ya modela "una valoración vigente por usuario y objetivo" (constraint de
unicidad de facto vía upsert en `upsertRating`) — no hay historial de estrellas que
deduplicar. El feed simplemente lee la fila actual de `rating` con `createdAt`/`updatedAt`;
se usa `updatedAt` como fecha de la entrada del feed (igual que ya hace `userList` para
distinguir `created` de `updated`), pero **sin** un evento `event: "created" | "updated"`
propio: a diferencia de las listas, un cambio de rating reemplaza la entrada anterior en
el feed en el mismo lugar cronológico (se reordena a `updatedAt`), no genera dos entradas.

### Cada comentario es una entrada propia

A diferencia de los ítems de lista (que no generan evento individual), cada fila de
`comment` es su propia entrada porque no hay concepto de "comentario vigente": un usuario
puede publicar varios comentarios sobre el mismo objetivo y cada uno es una opinión
distinta que vale la pena mostrar.

### Forma de las nuevas entradas en `FeedEntry`

Se agregan dos variantes al union `FeedEntry` existente en `src/services/feed/feed.ts`,
siguiendo la forma de `FeedFavorite`:

```ts
interface FeedRating {
  kind: "rating";
  id: string;
  stars: string; // numeric(2,1) como string, igual que el resto de la API de ratings
  detailedScore: number | null;
  createdAt: string; // = updatedAt de la fila
  target: { type: "artist" | "release-group" | "recording"; id: string; title: string; coverThumbUrl: string | null };
  author: FeedAuthor;
}

interface FeedComment {
  kind: "comment";
  id: string;
  body: string;
  createdAt: string;
  target: { type: "artist" | "release-group" | "recording"; id: string; title: string; coverThumbUrl: string | null };
  author: FeedAuthor;
}
```

## Risks / Trade-offs

- **[Riesgo]** Tratar rating/comment como `public` implícito para el feed pero
  incondicionalmente públicos en el catálogo crea dos reglas de visibilidad distintas para
  el mismo dato. → **Mitigación:** documentarlo explícitamente en
  `docs/05-features/activity-feed.md` y en el spec delta; es el mismo patrón que ya existe
  (el catálogo no filtra por perfil, el feed sí) y evita bloquear este cambio en una
  migración de esquema.
- **[Riesgo]** Un usuario que reordena su rating (cambia de valoración) puede sorprender a
  quien ya vio la entrada anterior del feed en otra posición. → **Mitigación:** comportamiento
  aceptado explícitamente (mismo patrón que `userList` con `updated_at`); no requiere
  mitigación adicional en v1.
- **[Trade-off]** Se agregan dos queries más a la unión bajo demanda (ahora 5 fuentes en
  paralelo). Con el volumen actual no es un problema; sigue siendo el punto ya señalado en
  `activity-feed.md` para evaluar materialización con volumen real.
