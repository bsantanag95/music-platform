## Context

`classifyPersonnel` ubica a cada persona en su nivel más alto con el orden miembro >
intérprete > producción > otros, y guarda las pistas como `{ discNumber, position }`.
`getAlbumPersonnel` ya lee todas las filas de `personnel_credit` del álbum (edición +
grabaciones de la edición representativa), con `recordingId`. La página de Créditos tiene
el detalle del álbum con `tracks` (`recordingId`, título, disco, posición).

## Decisions

### D1. Prioridad de `producer`

Nivel de un no integrante: `producer` presente → `production`; si no, intérprete →
`guests`; si no, otro tipo de producción → `production`; si no → `other`. Solo el tipo
`producer` promueve (no `programming`, `mix` ni `engineer`): un baterista que programa
sigue siendo intérprete.

### D2. Orden de roles por nivel

Al armar la entrada se ordenan los roles por un rango según el nivel: en `production`,
`producer` primero, luego otros tipos de producción, intérpretes y resto; en `guests`,
intérpretes primero. Orden estable dentro de cada rango.

### D3. `recordingId` en las pistas de cada persona

`PersonnelEntry.tracks` pasa a `{ recordingId, discNumber, position }[]`. El componente
resuelve el título con los `tracks` del detalle y enlaza cada número a `/song/{id}`.

### D4. Agrupación por canción en el servicio

Función pura `groupCreditsByTrack(credits, albumTracks)` en `personnel-levels.ts`:
devuelve `{ albumWide: TrackCreditGroup, tracks: { recordingId, groups: TrackCreditGroup }[] }`
con `TrackCreditGroup = Record<"production" | "performers" | "sound" | "other",
{ artistId, name, creditedAs, roles }[]>`. `getAlbumPersonnel` la incluye en su resultado
(`byTrack`) con las mismas filas: sin consultas nuevas.

### D5. Vista en la URL

`credits/page.tsx` lee `searchParams.view` (`"songs"` → vista por canción; cualquier
otro valor → por persona). El control segmentado son dos `Link` (`aria-current` en la
activa) con `scroll={false}`. Todo sigue siendo Server Component.

### D6. Detalles

- `+N` solo si ocultos ≥ 2 (`roles.length > ROLES_VISIBLE + 1`).
- `h2` "Créditos" con `sr-only`.
- `leadKind === "person"` → primer nivel sin tarjeta (mismo `LevelList`, sin bloque).
- `roles.instrument`: "varios instrumentos" / "various instruments".

## Risks / Trade-offs

- Un integrante no cambia de nivel (D1 aplica solo a no integrantes) → la spec de
  integrantes se mantiene.
- La vista por canción repite nombres en muchas pistas → es la lectura buscada; la vista
  por persona sigue siendo la predeterminada.

## Migration Plan

Solo lectura y UI.

## Open Questions

Ninguna.
