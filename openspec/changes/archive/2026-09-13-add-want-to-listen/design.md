## Context

El proyecto ya resuelve tres señales sobre un objetivo de catálogo (artista, álbum, canción)
con el mismo idioma de esquema: `favorite` (interés genérico), `listenEntry` (escucha
retrospectiva) y `userListItem` (pertenencia a una lista con nombre). Las tres usan el mismo
patrón: tres columnas FK nullable (`artistId`, `releaseGroupId`, `recordingId`) + un
`CHECK num_nonnulls(...) = 1`, y una capa de servicio en `src/services/<dominio>/` que
resuelve el objetivo, valida su existencia y opera con `db` (Drizzle) directamente.

Want to Listen es una señal nueva, prospectiva ("quiero escuchar"), acotada por decisión de
producto a **artista y álbum únicamente** — no a canciones. Se descartó nombrarla "Watchlist"
por ser terminología de video (Letterboxd/Trakt); "Want to Listen" es el equivalente adaptado
al dominio de escucha, en línea con cómo Musicboard nombra la misma señal. Su ciclo de vida
está acoplado al diario: registrar una escucha (`createListenEntry` en
`src/services/diary/diary.ts:102`) del mismo objetivo debe retirar la entrada de Want to
Listen correspondiente, sin acción manual.

## Goals / Non-Goals

**Goals:**
- Modelar `wantToListenEntry` reutilizando el patrón de objetivo polimórfico ya validado por
  `favorite`, pero restringido a `artistId`/`releaseGroupId` (sin `recordingId`).
- Toggle idempotente + listado propio paginado, replicando la forma de
  `src/services/favorites/favorites.ts` (`toggleFavorite`, `isFavorited`, `listMyFavorites`).
- Auto-remoción transaccional al registrar una escucha del mismo objetivo.
- Acción de catálogo (`WantToListenButton`) solo en páginas de artista y álbum.

**Non-Goals:**
- Want to Listen de canciones (recording) — explícitamente fuera de alcance.
- Audiencia/visibilidad social sobre la lista (a diferencia de `favorite`, no es una señal
  pública): es una lista de gestión personal, visible solo para su dueño, igual que la vista
  de gestión de `lists` (ver memoria de proyecto `list-detail-scope`).
- Cualquier cambio de comportamiento en `favorite`, `lists` o en los requisitos ya
  publicados de `listen-diary`.
- Notificaciones, recordatorios o cualquier lógica de "sugerencia" sobre la lista.

## Decisions

### D1. Tabla propia `wantToListenEntry`, no una lista especial (`userList`)
Alternativa considerada: marcar una lista `userList` como `isSystem`. Se descarta porque
`userListItem` no tiene campo de estado y mezclaría dos conceptos (colección nombrable vs.
señal binaria); además la vista de detalle de listas es de gestión pura (memoria
`list-detail-scope`) y no está pensada para un flujo de auto-remoción por escucha. Una tabla
dedicada, calcada de `favorite`, es más simple y consistente con el idiom ya establecido.

### D2. Nombre: "Want to Listen" en vez de "Watchlist"
Alternativas consideradas: "Watchlist" (descartada por connotación de video/cine, no de
escucha), "Listenlist" (descartada por sonar forzada, dos sílabas "listen"/"list" que no
fluyen) y "To Listen" (descartada por ambigua como rótulo aislado de navegación). "Want to
Listen" replica el patrón de Goodreads ("Want to Read") y es coherente con el tono intencional
y personal que ya define `listen-diary` (evita explícitamente lenguaje de checklist/completado
— ver `openspec/specs/listen-diary/spec.md`, "Encuadre del diario como registro intencional").
El slug de la capability y los identificadores técnicos usan `want-to-listen`/`wantToListen`,
siguiendo la convención de slugs compuestos ya usada por `listen-diary` y `artist-following`.

### D3. Solo dos columnas de objetivo (`artistId`, `releaseGroupId`), sin `recordingId`
El `CHECK num_nonnulls` se reduce a dos columnas: `num_nonnulls(artist_id, release_group_id) = 1`.
Esto hace estructuralmente imposible crear una entrada de Want to Listen de canción, en vez de
depender solo de validación en la capa de servicio o de UI.

### D4. Unicidad por `(userId, artistId, releaseGroupId)`
Igual que otras señales, a lo sumo una entrada por usuario y objetivo. Se implementa con dos
índices únicos parciales en la migración SQL cruda (uno por columna de objetivo no nula),
replicando el criterio que ya usan `review`/`rating` (ver comentario en `schema.ts:891` sobre
"índices únicos parciales por columna, definidos en la migración SQL cruda").

### D5. Auto-remoción síncrona dentro de `createListenEntry`
Alternativa considerada: evento/job asíncrono. Se descarta por sobre-ingeniería — el volumen
es bajo (una fila a borrar, sin fan-out) y el proyecto no tiene infraestructura de eventos.
En cambio, `createListenEntry` (`src/services/diary/diary.ts`) llama, dentro de la misma
función, a una nueva `removeWantToListenEntryForTarget(target, userId)` de
`src/services/want-to-listen/want-to-listen.ts` inmediatamente después del insert. No se
envuelve en una transacción explícita de Postgres: si el borrado fallara tras crear la
escucha, la escucha ya creada es el efecto principal y deseado; el peor caso es una entrada
obsoleta en la lista, que el propio flujo de "marcar como escuchado" desde la página de
catálogo ya cubre visualmente (ver Escenarios de la spec). Solo se aplica cuando el target de
la escucha es `artist` o `release-group`; para `recording` no hay entrada que limpiar.

### D6. Reutilizar el patrón REST de favoritos (`/api/me/want-to-listen`)
Mismo contrato que `/api/me/favorites`: `GET` (listado propio paginado), `POST` (toggle),
`DELETE` (quitar por target). No se agrega `PATCH` de audiencia (Non-Goal: sin audiencia).
Nuevo `WantToListenTargetTypeSchema = z.enum(["artist", "release-group"])` en
`src/lib/api/schemas.ts`, más angosto que `SocialTargetTypeSchema`, para que la validación de
tipo de objetivo ocurra en el borde HTTP y no solo en la base de datos.

### D7. `WantToListenButton` como componente nuevo, no una prop en `FavoriteButton`
`FavoriteButton` (`src/components/favorites/FavoriteButton.tsx`) ya tiene su propia
copia/i18n/target type. Want to Listen tiene rótulos y estados propios ("Quiero escuchar" /
"En tu lista"); forzar una unión de props degradaría la legibilidad de ambos componentes sin
ahorro real. Se crea `src/components/want-to-listen/WantToListenButton.tsx` siguiendo la misma
forma (toggle, estado `authenticated`/`initialActive`, `Link` a login si no hay sesión).

## Risks / Trade-offs

- **[Riesgo] Duplicación de código entre `favorites.ts` y el nuevo `want-to-listen.ts`**
  (resolver objetivo, toggle idempotente, listar con paginación) → Mitigación: aceptable por
  ahora, coherente con que `lists`, `favorites` y `listen-diary` ya duplican esta forma
  independientemente en vez de compartir una abstracción genérica; extraer una abstracción
  común queda fuera de alcance de este cambio (evitar over-engineering prematuro).
- **[Riesgo] Migración añade dos índices únicos parciales nuevos** → Mitigación: tabla nueva y
  vacía, sin datos existentes que migrar; el costo de la migración es mínimo.
- **[Riesgo] Un usuario podría querer "recordar por qué" agregó algo a la lista** (nota) →
  Fuera de alcance explícito (Non-Goals); si se pide más adelante, es una extensión aditiva
  (columna `note` nullable) que no rompe este diseño.

## Migration Plan

1. Migración SQL cruda: `CREATE TABLE want_to_listen_entry` con columnas, `CHECK num_nonnulls`,
   índices (`idx_want_to_listen_entry_user_created`, `idx_want_to_listen_entry_artist`,
   `idx_want_to_listen_entry_release_group`) y los dos índices únicos parciales.
2. Espejo en `src/db/schema.ts` (`export const wantToListenEntry = pgTable(...)`), siguiendo
   exactamente la forma de `favorite`.
3. Capa de servicio, contrato Zod, endpoints API, hook de auto-remoción en el diario.
4. UI: `WantToListenButton` en páginas de artista y álbum; página de listado propio.
5. Sin datos preexistentes que migrar (tabla nueva). Rollback: `DROP TABLE
   want_to_listen_entry` más revertir el espejo de schema.ts y el hook en `createListenEntry`.

## Open Questions

Ninguna abierta — alcance, modelo de datos y nombre ya acordados con el usuario antes de este
diseño.
