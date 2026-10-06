## Context

`listFeed` (`src/services/feed/feed.ts`) compone el feed bajo demanda: una query por fuente
(`pageSize + 1` filas cada una), fusión en memoria por `createdAt` y recorte por página. Hoy son
ocho fuentes (escucha, favorito, lista, valoración, comentario, reseña, seguir usuario, seguir
artista). La presentación (`FeedActivityList`) pliega corridas con `groupFeedRuns`
(`feed-grouping.ts`) según el tier de `feedEntryTier`. El mismo componente se usa en `/me/feed`,
en el preview de Inicio y en el rastro propio (`listMyRecentActivity`, variante `self`).

Hallazgos que condicionan el diseño (verificados en el código, 2026-10-06):

- `wanted_entry` **no tiene** columna `audience`: la wishlist es privada por diseño
  (`add-collection-wishlist`, D4). Exponerla requiere migración y selector.
- `list_save` no registra cuándo empezó el trackeo (`created_at` es la fecha del guardado) y el
  trackeo es privado por diseño ("el dueño no se entera").
- Los Recorridos (`artist_journey`) se crean siempre con `audience = 'private'`, sin control para
  cambiarla ni ruta de lectura ajena.
- La franja ambiente (`ambient.ts`) tiene una sola fuente: la colección física.

Decisiones del usuario (2026-10-06): wishlist con audiencia (existentes `private`); en el feed
solo los Caminos propios (crear + completar), sin trackeo.

## Goals / Non-Goals

**Goals:** ver Proposal. **Non-Goals:** tabla de eventos, trackeo/Recorridos en el feed, /100
fuera del feed, wishlist ajena fuera del feed.

## Decisions

### D1 — Puntaje detallado: `86/100` en la fila, `★ 86/100` en la corrida plegada

La fila usa `StarRatingValue` con `showScore` (ya existe para destacadas/Mis valoraciones): el
puntaje reemplaza al número de estrellas, nunca ambos (regla vigente de `rating-display`). La
etiqueta accesible usa una clave nueva `ratingLabelScore` ("4,5 de 5 estrellas, 86 de 100").
En la corrida plegada la forma compacta conserva la estrella (`★`) y reemplaza el número por
`86/100`. Alternativa descartada: `★ 4,5 · 86` (formato prohibido por `rating-display`).
Aplica también a la variante `self` (rastro propio), porque comparte componente; las reseñas del
perfil no cambian.

### D2 — Camino completado: derivado en lectura con una subconsulta correlacionada

Sin tabla de eventos, el momento de completar se deriva así, por Camino candidato:

```
completed_at = CASE WHEN count(items) > 0 AND todos los ítems tienen escucha del dueño
               THEN max(greatest(item.created_at, primera_escucha_del_dueño(item)))
               END
```

Es el instante en que el último álbum pendiente quedó cubierto: o la primera escucha del último
álbum en escucharse, o el alta de un álbum ya escuchado. Se calcula con una subconsulta escalar
(`CAMINO_COMPLETED_AT_SQL`) sobre `user_list_item` + `LEFT JOIN LATERAL` a `listen_entry`
(índice `idx_listen_entry_release_group`), dentro de la misma forma `select…where…orderBy…limit`
que el resto de las fuentes. Mismo criterio de progreso que `countsByListId` (cualquier escucha
del dueño, sin filtro de audiencia: el progreso de un Camino visible ya es público en su página
de lectura).

Consecuencias aceptadas: la entrada aparece y desaparece con el estado (quitar una escucha o
agregar un álbum pendiente la retira; como un rating vigente). Quitar un ítem pendiente que
completa el Camino no tiene marca de tiempo: la entrada toma el máximo de los ítems restantes,
que puede ser anterior a la quita. Un Camino archivado no genera entradas.

Alternativa descartada: persistir `completed_at` (se desincroniza al agregar/quitar ítems; la
decisión D2 de `add-camino` es justamente no persistir progreso).

### D3 — Camino creado: fuente propia, no evento de "lista"

Los Caminos siguen excluidos de los eventos de lista (`camino` spec, exclusión genérica). Tienen
un `kind: "camino"` propio con `event: "created" | "completed"`; la fecha de "creado" es
`user_list.created_at` (no `updated_at`: editar o archivar no genera evento, igual que hoy).
Filtros: `audience IN ('followers','public')`, `moderation_status = 'visible'`,
`journey_archived_at IS NULL`, bloqueo y cuenta activa (vía `authorIds`). Enlace:
`/users/[username]/caminos/[id]`. La query de "creado" y la de "completado" son dos fuentes
separadas (cada una con su `perSource`), ambas bajo el filtro `kind=camino`.

### D4 — Colección y wishlist: tier 3, con celda de carátula

Ambas tienen siempre un álbum como objetivo, así que usan la fila con celda de carátula, el
título del álbum y el artista enlazado — no la fila mínima de tier 4. Se clasifican como **tier 3
(presencia cotidiana)**: corridas de 3+ del mismo tipo y autor se pliegan ("sumó 4 discos a su
colección", "busca 3 discos"). El verbo lleva el formato cuando existe ("Sumó a su colección ·
Vinilo"); la nota no se muestra (es una nota de inventario, no prosa). Tier 4 queda solo para los
seguimientos. La franja ambiente se retira: mantenerla duplicaría cada alta.

### D5 — Wishlist con audiencia

Migración `0061_wanted_entry_audience.sql`: `ALTER TABLE wanted_entry ADD COLUMN audience text
NOT NULL DEFAULT 'private'` + `CHECK` del vocabulario, y luego `ALTER … SET DEFAULT 'followers'`.
Así las filas existentes quedan `private` sin un backfill inventado (el valor `private` es el que
ya tenían de hecho), y el default de la columna solo es una red de seguridad: el servicio siempre
pasa la audiencia resuelta por `resolveNewContentAudience(userId, "wanted", explicit)`, con
`TYPE_DEFAULT_AUDIENCE.wanted = "followers"` (simétrico a la colección). El alta en lote acepta
un `audience` único para todo el lote (opcional en la API); la UI de alta, igual que la de
colección, no lo envía y usa el default resuelto. La audiencia se muestra en cada entrada (página
de álbum y pestaña "Busco") y se edita desde el panel de edición de la pestaña "Busco", con el
mismo control que la colección; el `PATCH` acepta `audience`. "Aplicar a lo existente" no
cambia (la spec ya excluye la wishlist explícitamente).

### D6 — Fusión de opinión en `groupFeedRuns`

Una pasada previa en `groupFeedRuns`: si la entrada `i` es valoración, reseña o comentario y la
`i+1` (y opcionalmente la `i+2`) es de las otras clases, del mismo autor y el mismo objetivo
(`target.type` + `target.id`), se emiten como una `FeedOpinionRow` (`kind: "opinion"`) con
`rating?`, `review?`, `comment?` (a lo sumo uno de cada uno; un segundo comentario corta). Solo
adyacencia estricta en la lista cronológica: no se reordena el feed. La fila fusionada siempre
tiene prosa (una valoración no puede repetirse por objetivo, así que la fusión incluye una reseña
o un comentario) y por eso es tier 1: corta corridas y nunca se pliega. La fusión va **antes**
del barrido de álbum (una valoración de canción con comentario ya cortaba el barrido).
Presentación: verbo compuesto ("Valoró y reseñó", "Valoró y comentó", "Reseñó y comentó",
"Valoró, reseñó y comentó"), estrellas con puntaje, rótulo + título de reseña, cuerpo de la
reseña y, debajo, el comentario como segunda cita. Fecha: la más reciente.

Alternativa descartada: fusionar en el servicio (perdería la independencia de cada fuente, el
filtro por tipo y la paginación por fuente).

### D7 — Rastro propio de Inicio

`listMyRecentActivity` suma colección, wishlist y Caminos (creado/completado) del propio usuario,
sin filtro de audiencia (contenido propio, como el resto del rastro), pero sí sin Caminos
archivados. `RecentActivityEntrySchema` suma los tres kinds.

### D8 — Tests y orden de fuentes

Los tests de `listFeed` mockean `db.select` en orden. Las fuentes nuevas se agregan al final del
`Promise.all` y los tests existentes se actualizan con un helper que completa las fuentes vacías.

## Risks / Trade-offs

- [La subconsulta de completado se evalúa por Camino visible de cada seguido] → acotada por
  `authorIds` + `kind` + audiencia; los Caminos son pocos por persona. Revaluar con volumen real
  (mismo criterio que phase-5-design §9).
- [Una entrada nueva de wishlist pasa a ser visible para seguidores sin que el usuario lo note]
  → cada entrada muestra su audiencia junto al formato (página de álbum y pestaña "Busco"); las existentes no cambian; se
  documenta en el contrato y en `physical-collection.md`.
- [La fusión solo actúa con adyacencia estricta] → si otra persona actúa entre medio, quedan
  filas separadas como hoy (sin regresión).
- [Retirar la franja ambiente] → la colección sigue visible, ahora en la línea de tiempo.

## Migration Plan

1. Aplicar `0061` (`pnpm run db:migrate`): aditiva, sin reescritura de datos existentes
   (`ADD COLUMN … DEFAULT` constante). Rollback: `DROP COLUMN audience` y revertir el código.
2. Desplegar el código. Ningún backfill.

## Open Questions

- Recorridos en el feed: requiere audiencia + lectura ajena de Recorridos (cambio aparte).
