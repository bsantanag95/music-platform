## Context

La Fase 5 tiene implementados privacidad/perfil, seguimiento, presencia manual (`listen_entry`),
diario y feed v1 (solo escuchas). Faltan las señales curatoriales: favoritos y listas
(`phase-5-design.md` paso 5). La base de datos ya resuelve el patrón de "objetivo polimórfico
único" en `rating`, `comment` y `listen_entry` (columnas `artist_id`/`release_group_id`/
`recording_id` con `CHECK num_nonnulls(...) = 1`), y el modelo de audiencias
(`private`/`followers`/`public`) ya persiste en `listen_entry.audience` con la matriz de
visibilidad en `src/services/diary/visibility.ts`. Este cambio reutiliza ambos patrones, no
introduce dependencias nuevas y no toca `catalog/` ni `musicbrainz/`.

## Goals / Non-Goals

**Goals:**

- Favorito como toggle idempotente sobre artista, álbum y canción, con audiencia propia.
- Listas curadas de un solo tipo de entidad, propietario único, con orden manual.
- Superficies propias (`/me/favorites`, `/me/lists`) y públicas en el perfil de usuario,
  respetando audiencias y bloqueos.
- Feed v1 ampliado con favoritos y listas, manteniendo paginación y reglas de visibilidad.
- Contratos REST y documentación (`/docs`) actualizados en el mismo cambio.

**Non-Goals:**

- Listas colaborativas y listas mixtas (se dejan para un incremento posterior).
- Scrobbling automático (paso 7 de Fase 5, separado).
- Materialización de eventos de feed (se mantiene el cálculo bajo demanda).
- Bloqueo/reporte nuevos (ya existen `user_block` y las reglas de `social-blocking`).
- Racha, contadores de completitud o cualquier mecánica de juego.

## Decisions

### D1. Modelo de datos: tres tablas con el patrón de objetivo único existente

`favorite` y `user_list_item` usan el mismo patrón de `listen_entry`/`rating`/`comment`:
tres FKs `artist_id`/`release_group_id`/`recording_id` nullable con
`CHECK (num_nonnulls(...) = 1)` e índice único parcial por objetivo (para que el toggle
favorito y el ítem de lista sean idempotentes). No se usa un `target_type` ENUM + UUID
genérico: rompería el tipado y el enrutado hacia las tablas de catálogo.

- `favorite(id, user_id, artist_id?, release_group_id?, recording_id?, audience, created_at)`.
  Índice único parcial por `(user_id, <target>)` para garantizar a lo sumo un favorito por
  usuario y objetivo. `audience` default `followers`, coherente con `listen_entry`.
- `user_list(id, owner_id, entity_type, title, description?, audience, created_at, updated_at)`.
  `entity_type` fijo por lista (`artist`/`release_group`/`recording`) — decisión de negocio:
  listas mono-tipo v1. `updated_at` lo mantiene un trigger (regla del proyecto: nunca
  actualizarlo desde la app).
- `user_list_item(id, list_id, position, artist_id?, release_group_id?, recording_id?, created_at)`.
  `position` entero para orden manual, `UNIQUE DEFERRABLE (list_id, position)` para permitir
  reordenar en una transacción, e índice único parcial por `(list_id, <target>)` para evitar
  duplicados. La validación de que el objetivo coincida con `entity_type` de la lista cruza
  tablas y por tanto vive en un trigger (`trg_user_list_item_target_type`), mismo criterio que
  `trg_membership_types`.

**Alternativas descartadas:** un solo `target_id` UUID + `target_type` sin FK real (pierde
integridad referencial); materializar el tipo en `user_list_item` y no validar contra la lista
(inconsistencia posible); tabla polimórfica de actividades para el feed (prematura, ver D5).

### D2. Toggle de favorito idempotente, no contador

`POST /api/me/favorites` (crea; si ya existe devuelve el existente con `200` en vez de error)
y `DELETE /api/me/favorites` (borra; idempotente, `204` aunque no exista). El toggle de UI no
necesita conocer el id de la fila: la API recibe `{ target: { type, id }, audience }`. La
unicidad se garantiza en SQL (D1), no por lectura+escritura en la app.

**Alternativa descartada:** `PUT` con semántica de "establecer estado" — es equivalente pero
introduce un verbo nuevo; `POST`/`DELETE` se alinean con el resto de la API.

### D3. Audiencia: reutilizar la matriz de visibilidad

La regla de `diary-visibility` (bloqueo, perfil privado, relación de seguimiento) es genérica
y se aplica igual a favoritos y listas. Se extrae `audiencesForProfile` a
`src/services/social/visibility.ts` como helper compartido (devuelve `Audience[]`, no
`DiaryAudience[]`), y `diary/visibility.ts` lo reexporta/adapta para no romper sus callers.
Los servicios de favoritos y listas usan el mismo helper para filtrar lecturas ajenas.

**Alternativa descartada:** duplicar la matriz en tres módulos (riesgo de divergencia que el
proyecto ya detectó como bug en el pasado).

### D4. API de listas: CRUD propio + endpoints de ítems

- `POST /api/me/lists` (crear), `GET /api/me/lists` (listar propias), `GET /api/me/lists/[listId]`
  (detalle con ítems), `PATCH /api/me/lists/[listId]` (editar título/descripción/audiencia),
  `DELETE /api/me/lists/[listId]` (borrar, `204`).
- ítems: `POST /api/me/lists/[listId]/items` (agregar con `position` al final),
  `DELETE /api/me/lists/[listId]/items/[itemId]` y
  `PUT /api/me/lists/[listId]/items` (reordenar con el array ordenado de `itemId`).
- Vistas públicas: `GET /api/users/[username]/favorites` y `GET /api/users/[username]/lists`
  (paginadas, sin ítems), `GET /api/users/[username]/lists/[listId]` (con ítems). Todas
  filtran por la matriz de visibilidad (D3); si no hay permiso devuelven lista vacía, sin
  revelar si el usuario tiene contenido.
- Todo se envuelve con `with-error-handling`, `await params` (Next 15) y validación Zod de
  entrada, igual que `src/app/api/me/diary/route.ts`.

**Alternativa descartada:** un solo endpoint genérico `/api/me/collections` con sub-recursos
— mezcla dos conceptos (favorito ≠ lista) y complica el contrato.

### D5. Feed: composición bajo demanda sin tabla de eventos

El feed v1 (offset + `id DESC` sobre `listen_entry`) se amplía uniendo tres fuentes bajo
demanda: escuchas, favoritos y eventos de listas (creación y actualización de metadatos, no
un evento por ítem). El orden es `created_at DESC` con desempate por fuente + id; las
colisiones de timestamp son raras y aceptables en v1. Se reutiliza la matriz de visibilidad y
los bloqueos. No se materializa tabla de eventos hasta que el volumen lo justifique.

**Alternativa descartada:** materializar eventos ahora — el proyecto decidió evaluarlo con
volumen real (`phase-5-design.md` §9).

## Risks / Trade-offs

- [Reordenar ítems con `UNIQUE DEFERRABLE`] → Se reordenan en una transacción que reescribe
  `position` completo; si una operación parcial falla, la transacción revierte y la
  restricción nunca se viola de forma observable.
- [Feed heterogéneo: desempate por timestamp frágil] → Aceptado en v1; si aparece colisión
  visible, se añade un `activity_id` secuencial compartido en un incremento posterior.
- [Cross-table CHECK obliga a trigger] → Se documenta en `sql-model.md` y se refleja el
  patrón de `trg_membership_types`; los smoke tests no tocan esto porque no se modifica
  `catalog/` ni `musicbrainz/`.
- [Extracción de `audiencesForProfile` puede romper callers de `diary/`] → Se hace como
  primer commit del cambio con typecheck + tests de `diary/` verdes antes de seguir.
- [Default de audiencia `followers` en favorito] → Coherente con `listen_entry`; el usuario
  puede cambiarlo después de publicar (modelo de audiencia por actividad).

## Migration Plan

1. Nueva migración `drizzle/0009_favorites_lists.sql` (número siguiente a `0008_listen_entry`),
   aplicada por `pnpm run db:migrate`. Nunca se edita una migración ya aplicada.
2. Espejo manual en `src/db/schema.ts` (tablas `favorite`, `user_list`, `user_list_item` +
   tipos `*Row`) y actualización de `docs/03-data/sql-model.md` en el mismo commit.
3. Extracción de `audiencesForProfile` a `social/visibility.ts` con tests verdes previos.
4. Rollback: no se contempla rollback de migraciones (política del proyecto); los fixes van
   hacia adelante en migraciones nuevas.

## Resolución de Open Questions (cerradas)

- **Límites de texto**: título de lista hasta **100** caracteres y descripción hasta **500**
  (coherente con el límite de `body` de `listen_entry`). Se fijan en el contrato Zod y se
  documentan en `contracts.md`.
- **Conteo de ítems**: `GET /api/me/lists` **no** incluye conteo inline; el detalle
  `GET /api/me/lists/[listId]` es quien trae los ítems.
- **Eventos de lista en el feed**: un evento de **lista creada** al crear, y un evento de
  **lista actualizada** con fecha `updated_at` cuando cambian título, descripción o audiencia.
  Sin evento por ítem (coherente con el spec delta de `activity-feed`).