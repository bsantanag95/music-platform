## Context

`listFeed` y `listMyRecentActivity` ya resuelven el nombre del artista principal acreditado
de un álbum o canción con `PRIMARY_ARTIST_SQL` (`src/services/feed/feed.ts`), una subquery
escalar sobre `credit` con `role = 'primary'`. Ese nombre se muestra en `TargetTitle`
(`feed-row-parts.tsx`) como texto plano debajo del título. No existe hoy ninguna columna con
el **id** de ese artista en el payload — solo el nombre.

## Goals / Non-Goals

**Goals:**

- Enlazar el nombre del artista acreditado (álbum o canción) a `/artist/:id` en las
  superficies que usan `FeedActivityList`.
- Mantener `pnpm run typecheck && lint && test && build` en verde.

**Non-Goals:**

- `CompactActivityRow` (bloque compacto de Inicio, "Recientes" de `/activity`) no gana esta
  capacidad — hoy no muestra el nombre del artista en absoluto, y sumarlo es un cambio de
  layout más grande, no pedido.
- `/me/diary` no gana el enlace — `ListenTargetInfoSchema.artistId` queda opcional y sin
  poblar ahí, mismo criterio que ya usa `artistName` (solo lo puebla el feed).

## Decisions

### 1. Subquery hermana (`PRIMARY_ARTIST_ID_SQL`), no una fila compuesta

En vez de cambiar `PRIMARY_ARTIST_SQL` para devolver `(name, id)` como una fila, se agrega
una subquery escalar hermana que selecciona `a.id` con la misma condición `WHERE`. Encaja
con el patrón ya establecido en el archivo: cada columna del `SELECT` se pide por separado
(`artistName: artist.name`, `releaseTitle: releaseGroup.title`, etc.), no como structs. Dos
subqueries casi idénticas es más repetitivo que una sola con fila compuesta, pero consistente
con el resto del archivo y más simple de tipar con Drizzle (`sql<string | null>`).

### 2. `artistId` opcional en los schemas, mismo criterio que `artistName`

`ListenTargetInfoSchema`, `FavoriteTargetInfoSchema` y `FeedTargetInfoSchema` ya declaran
`artistName` como `.nullable().optional()` con el comentario "opcional: solo lo puebla el
feed". `artistId` sigue exactamente el mismo criterio — así el diario propio (que reusa
`ListenTargetInfoSchema` pero no computa este campo) no necesita ningún cambio.

### 3. Sin enlace cuando el objetivo ya es el artista

Cuando el objetivo de la entrada es un artista (no un álbum ni una canción), `artistName`
(y ahora `artistId`) es `null` por diseño — el título de la fila ya es el artista y ya
enlaza a su página. `targetLink()` no necesita una rama especial: simplemente no hay
`artistName` que envolver en un link.

### 4. `TargetTitle` gana `artistHref` opcional, sin romper `DiaryActivityList`

`TargetTitle` es compartido entre `FeedActivityList` y `DiaryActivityList`
(`feed-row-parts.tsx`). `DiaryActivityList` pasa `artist={entry.target.subtitle}` (un campo
distinto, sin id disponible) — al ser `artistHref` un prop opcional que por defecto es
`null`, ese llamado sigue mostrando el artista como texto plano sin ningún cambio en el
diario.

## Risks / Trade-offs

- [Dos subqueries casi idénticas en vez de una] → Aceptado: es el patrón ya establecido en
  el archivo (columnas sueltas, no structs); una fila compuesta sería una abstracción nueva
  para un solo caso de uso.

## Migration Plan

No aplica migración de datos ni de esquema — `credit`/`artist` ya existen. Rollback =
revertir el cambio de código.
