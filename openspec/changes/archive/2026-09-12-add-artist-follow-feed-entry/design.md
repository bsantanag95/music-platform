## Context

`add-feed-kind-differentiation` activó "seguir a un usuario" como fila tier 4 en la línea de
tiempo principal (`listFeed`/`listMyRecentActivity`) y la retiró de `feed-ambient-events`
para no duplicarla. Ese cambio dejó a "seguir a un artista" del otro lado, sin haberlo
tocado: sigue siendo, junto con "colección física", una de las dos fuentes del resumen
agrupado al pie de `/me/feed`. No hay hueco de datos que cerrar (`artist_follow` ya registra
todo lo necesario) — es la misma promoción de tier 4 a fila propia que "seguir usuario" ya
recibió, ahora para el otro tipo de seguimiento.

`ambient.ts` calcula "seguir artista" sin regla de visibilidad propia más allá de bloqueo
(un artista no tiene perfil privado/público como una persona): cualquier follow de un
seguido del lector es visible, salvo bloqueo entre lector y autor. Esa regla es más simple
que la de "seguir usuario" (que sí depende de la visibilidad del objetivo).

## Goals / Non-Goals

**Goals:**

- Activar "seguir a un artista" como tier 4 en la línea de tiempo principal de `listFeed` y
  `listMyRecentActivity`, con la misma regla de agrupación agresiva que ya usa "seguir a un
  usuario".
- Retirar "seguir artista" de `feed-ambient-events` para no mostrar el mismo hecho dos veces
  en `/me/feed`.
- Mantener `pnpm run typecheck && lint && test && build` en verde.

**Non-Goals:**

- "Colección física" NO se activa en la línea de tiempo principal en esta iteración — sigue
  siendo exclusiva de la franja de `feed-ambient-events`. No se pidió y no cambia la
  justificación que ya documentó `add-feed-kind-differentiation` para dejarla afuera.
- Dejar de seguir a un artista NO genera ningún evento (solo altas) — mismo criterio que el
  resto de las fuentes del feed.
- Un glifo nuevo: "seguir a un artista" reusa el glifo de "seguir" ya existente (ver
  Decisión 3).

## Decisions

### 1. "Seguir artista" reemplaza su lugar en `feed-ambient-events`, no lo duplica

Mismo criterio que "seguir usuario" en el cambio anterior: al activarse inline en la línea
de tiempo principal, se retira de las fuentes de `feed-ambient-events`, que queda con una
única fuente ("colección física"). La franja sigue existiendo como mecanismo — no se
elimina la capacidad completa por quedar con una sola fuente, porque "colección física" es
igual de escasa y sigue mereciendo el tratamiento agrupado y de-enfatizado.

### 2. Sin regla de visibilidad adicional — solo bloqueo

A diferencia de "seguir usuario" (que depende de si el objetivo del seguimiento es visible
para el lector), un artista no tiene noción de perfil privado: seguir a un artista es
siempre "público" en los términos que ya usaba `feed-ambient-events` para esta fuente. La
nueva fuente de `listFeed` solo excluye por bloqueo entre lector y autor — no hay objetivo
cuya visibilidad evaluar. `listMyRecentActivity` tampoco necesita esa regla (actividad
propia, siempre visible para sí mismo).

### 3. Fecha del evento y glifo: mismo patrón que "seguir usuario"

La fecha SHALL ser `artist_follow.created_at` (a diferencia de `user_follow`, un follow de
artista no tiene estado `pending`/`accepted` — nace ya efectivo, así que no hace falta
distinguir fecha de solicitud de fecha de aceptación). El glifo reusa el mismo ícono SVG que
ya usa "seguir a un usuario" en `FeedKindIcons.tsx` — ambas entradas son la misma acción
("empezar a seguir a X"), distinguidas por el verbo y el objetivo, no por un glifo distinto.

### 4. Agrupación y anatomía de fila: mismo mecanismo que "seguir usuario"

Se extiende `isGroupable` (`feed-grouping.ts`) para aceptar también `"follow-artist"` y se
agrega ese valor a `FeedEntryGroup["groupedKind"]`. `FeedActivityList` gana una rama de
render para `kind === "follow-artist"`, misma anatomía sin celda que "seguir usuario": autor
enlazado + verbo + artista enlazado + fecha relativa.

## Risks / Trade-offs

- [Retirar "seguir artista" de `feed-ambient-events` es una regresión de comportamiento
  visible] → Documentado como MODIFIED (no REMOVED); se actualizan sus tests y su spec
  explícitamente, mismo tratamiento que "seguir usuario" en el cambio anterior.
- [La franja de eventos ambiente queda con una sola fuente] → Aceptado: "colección física"
  sigue siendo un evento escaso que se beneficia de agrupación y de-énfasis; no amerita
  disolver la capacidad por quedar con una fuente en vez de dos.

## Migration Plan

No aplica migración de datos ni de esquema — `artist_follow` ya existe. Rollback = revertir
el cambio de código; no hay estado persistido que deshacer.

## Open Questions

Ninguna.
