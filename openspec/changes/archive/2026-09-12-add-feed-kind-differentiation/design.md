## Context

`activity-feed` compone bajo demanda seis fuentes (`listen`, `favorite`, `list`, `rating`,
`comment`, `review`) en `listFeed` y las presenta con una jerarquía de 4 tiers
(`feed-entry-tier.ts`). El tier 4 ("ambiente": seguir artista/usuario, colección física) está
**definido pero nunca activado** en el feed principal — el propio spec dice "el tier se
define para que un cambio posterior solo tenga que activarlos". Ese "activarlo" hoy existe
de otra forma: `feed-ambient-events` calcula un resumen agrupado por autor (seguir artista +
seguir usuario + colección) y lo muestra como una franja "También en tu red" al pie de
`/me/feed`, separada del listado cronológico.

Dos huecos de datos, verificados contra el código actual:

- `addItemToList` (`src/services/lists/lists.ts`) inserta el ítem pero nunca toca
  `user_list.updated_at`. `listFeed` infiere el evento de lista (`created` vs `updated`)
  comparando `updated_at` con `created_at`, así que agregar un ítem a una lista existente
  no genera nada en el feed hoy — contradice el requirement "Alcance del feed v1", que dice
  que un evento de lista sale "por la creación... o por la actualización de sus metadatos",
  sin contemplar el ítem. `user_list` ya tiene un trigger (`trg_user_list_updated_at`,
  `drizzle/0009_favorites_lists.sql`) que pisa `updated_at` en cualquier `UPDATE`.
- `feed-entry-tier.ts` reserva tier 4 para "seguir artista/usuario" pero el comentario
  dice "todavía NO llega al feed" — la única forma en que aparece es el resumen agrupado
  de `feed-ambient-events`, no una fila individual en la línea de tiempo.

Visualmente, las seis fuentes actuales comparten anatomía de fila casi total; comentario y
reseña usan literalmente el mismo `ProsePanel` (mismo borde, misma tipografía, mismo
recorte a 6 líneas), diferenciados solo por el verbo del renglón de metadatos.

Una demo visual de la dirección propuesta (glifo por tipo, reseña con voz propia, fila de
"siguió a") se validó como artifact antes de este proposal.

## Goals / Non-Goals

**Goals:**

- Dar a cada `kind` del feed un glifo mono de 14px reconocible, sin romper la Regla de
  Rareza (ámbar solo en reposo para valoración).
- Dar a la reseña un tratamiento visual propio (segundo acento del sistema: petróleo).
- Activar "seguir a un usuario" como tier 4 en la línea de tiempo principal de
  `listFeed` y `listMyRecentActivity`, con la misma regla de agrupación agresiva que ya
  usan escuchas/favoritos/ratings.
- Cerrar el hueco de "agregar ítem a lista existente" sin introducir un tipo de evento
  nuevo ni una tabla de auditoría.
- Mantener `pnpm run typecheck && lint && test && build` en verde.

**Non-Goals:**

- "Seguir a un artista" y "colección física" NO se activan en la línea de tiempo principal
  en esta iteración — siguen siendo exclusivos de la franja de `feed-ambient-events`. Solo
  "seguir usuario" se promueve, porque es el caso concreto que se pidió y el que compite
  visualmente con la franja existente.
- Quitar un ítem de una lista NO cuenta como actualización en esta iteración (solo
  agregar). Es una decisión de alcance, no una limitación técnica — se puede sumar después
  sin cambiar el mecanismo.
- Mosaico de portadas (`ListCoverMosaic`) en el evento de lista: `FeedListEventSchema` no
  trae `coverThumbs` y sumarlo es un cambio de servicio más grande; queda fuera.
- Rediseño de `ProsePanel`, `FeedRatingMeter` o del mecanismo de agrupación/pico de
  rotación existentes — se extienden, no se rehacen.

## Decisions

### 1. "Seguir usuario" reemplaza su lugar en `feed-ambient-events`, no lo duplica

Al activarse inline en la línea de tiempo principal, "seguir usuario" **se retira** de las
fuentes de `feed-ambient-events` — la franja de `/me/feed` queda con solo "seguir artista" y
"colección física". La alternativa (dejar ambas) mostraría el mismo hecho dos veces en la
misma página (una fila individual arriba, agrupada en el resumen abajo); se descartó por
confuso. "Seguir artista" y "colección física" siguen sin equivalente en la línea de tiempo
principal — no se pidió y no hay Regla de Rareza que lo justifique todavía.

### 2. La regla de visibilidad de "seguir usuario" se duplica, no se comparte

`feed-ambient-events` ya resuelve la regla de qué seguimientos son visibles para el lector
(objetivo con perfil público, o el lector ya sigue al objetivo; nunca el propio lector;
sin bloqueo) en `ambient.ts`. La nueva fuente de `listFeed` reimplementa la misma regla
in-line, con la misma forma que el resto de las fuentes de `listFeed` (cada una arma su
propio `where(...)`, sin helpers compartidos entre sí) — es el patrón ya establecido en ese
archivo, no una abstracción nueva. `listMyRecentActivity` no necesita esa regla: es la
actividad del propio lector, siempre visible para sí mismo.

### 3. Fecha del evento: `updated_at` de `user_follow`, no `created_at`

Igual que la fuente "seguir usuario" ya retirada de `feed-ambient-events`: un seguimiento
puede nacer `pending` y pasar a `accepted` después (perfiles privados); usar `updated_at`
ubica el evento en el momento en que se volvió visible, no cuando se pidió.

### 4. Agrupación de tier 4: mismo mecanismo, nuevo `groupedKind`

`groupFeedRuns`/`isGroupable` (`feed-grouping.ts`) hoy solo agrupan tier 2/3
(`listen`/`favorite`/`rating`). Se extiende `isGroupable` para aceptar tier 4 (`follow`) y
se agrega `"follow"` a `FeedEntryGroup["groupedKind"]`. Una corrida de 3+ `follow`
consecutivos del mismo autor colapsa en "Ana siguió a 4 personas", igual criterio que
"Ana registró 4 escuchas". No compite con pico de rotación (exclusivo de `listen`).

### 5. Anatomía de fila propia para `follow`, sin celda

A diferencia de tier 2/3 (que siempre abren con celda de carátula/disco), una entrada
`follow` no tiene objetivo de catálogo — el "objetivo" es otra persona. `FeedActivityList`
gana una rama de render exclusiva para `kind === "follow"`: una sola línea, sin `FeedCell`,
autor enlazado + verbo + persona seguida enlazada + fecha relativa. Es, a propósito, la fila
más callada del sistema — coherente con que tier 4 es "ambiente".

### 6. Glifo por tipo: reutiliza la familia visual de `ReactionIcons`

Íconos SVG inline de 14px, `stroke="currentColor"`, siempre acompañados del texto del verbo
(nunca la única señal) — mismo criterio de accesibilidad que ya documenta
`ReactionIcons.tsx`. Valoración no suma glifo propio: su medidor VU ya cumple ese rol.

### 7. Reseña: segundo acento del sistema, reservado

La reseña usa petróleo (`--color-petrol`) para un rótulo "Reseña", el título como titular
(`font-display`) y un borde izquierdo propio en `ProsePanel`. Es el primer uso de petróleo
en reposo dentro del feed — se documenta como reservado exclusivamente a reseña, mismo
espíritu que la Regla de Rareza ya aplica a ámbar/valoración, para que no se banalice
sumándolo a otros tipos más adelante sin una decisión explícita.

### 8. `addItemToList` toca `updated_at` solo si insertó de verdad

El insert usa `onConflictDoNothing` (idempotente si el ítem ya estaba). Se captura el
resultado de `.returning()`: solo si insertó una fila nueva, un `update` explícito
(`set({ updatedAt: new Date() })`) sigue al insert. Evita que un reintento de agregar un
ítem ya presente genere un evento de "actualizó" sin cambio real. El trigger existente
(`trg_user_list_updated_at`) ya pisaría `updated_at` en cualquier `UPDATE`, pero el `update`
explícito documenta la intención en el código en vez de depender de un efecto secundario
implícito de la base.

## Risks / Trade-offs

- [Retirar "seguir usuario" de `feed-ambient-events` es una regresión de comportamiento
  visible] → Documentado como MODIFIED (no REMOVED) porque la capacidad sigue viva para sus
  otras dos fuentes; se actualizan sus tests y su spec explícitamente, no se descubre en
  archive.
- [Duplicar la regla de visibilidad de "seguir usuario" entre `ambient.ts` (perfil
  privado/artista/colección, que sigue existiendo) y `feed.ts` (usuario)] → Aceptado:
  consistente con que `feed.ts` ya no comparte lógica de visibilidad entre sus propias seis
  fuentes; introducir un helper compartido ahora sería una abstracción prematura para dos
  únicos consumidores.
- [Una corrida de follows colapsada pierde el detalle de a quién exactamente siguió cada
  vez] → Mismo trade-off ya aceptado para escuchas/favoritos/ratings agrupados (se listan
  hasta 4 nombres enlazados + "y N más", ver `GroupRow`); no es un caso nuevo.

## Migration Plan

No aplica migración de datos ni de esquema — `user_follow` y el trigger de `user_list` ya
existen. Rollback = revertir el cambio de código; no hay estado persistido que deshacer.

## Open Questions

- ¿Quitar un ítem de una lista debería también contar como actualización? Diferido a
  pedido explícito (ver Non-Goals) — no bloqueante.
