# add-diary-social-surfaces

## Why

El diario de escucha (`listen_entry`) está implementado pero sus lecturas están limitadas al dueño
(`GET /api/me/diary`): "perfil y feed quedan para cambios posteriores" (`docs/04-api/contracts.md`).
La Fase 5 define que la unidad de la experiencia es la actividad de una persona sobre el catálogo y
que el feed se computa bajo demanda desde las tablas de actividad sin tabla materializada. Este
incremento abre el diario a dos superficies sociales: el perfil ajeno (ver el diario de otra persona
según su audiencia) y el feed (ver las escuchas de los usuarios seguidos).

## Goals

- Que un visitante pueda leer las entradas del diario de otro usuario respetando la audiencia de
  cada entrada, la visibilidad del perfil y los bloqueos.
- Que el feed muestre las escuchas de los usuarios seguidos que sean visibles para el lector, en
  orden cronológico descendente y paginado.
- Cerrar en el diseño maestro una decisión pendiente de `phase-5-design.md` (§14): una entrada
  pública de un perfil privado solo la ven los seguidores aprobados y el dueño.
- Reutilizar la capa de servicios y componentes existente del diario sin duplicar lógica.

## Non-Goals

- Incluir ratings, comentarios, favoritos o listas en el feed: el feed v1 es exclusivamente de
  entradas del diario (`listen_entry`). Los demás eventos se agregan en incrementos posteriores.
- Materializar una tabla de eventos de feed.
- Modificar la gestión del diario propio (crear, ampliar, borrar) ni su contrato existente.
- Cambios de schema: `listen_entry.audience` y los índices existentes son suficientes.

## What Changes

- **Visibilidad del diario ajeno**: nueva regla de lectura que combina bloqueos, relación de
  seguimiento, visibilidad del perfil y audiencia de cada entrada.
- **Diario en perfil ajeno**: sección de diario en `users/[username]` visible según la regla de
  visibilidad; lista vacía (no `403`) cuando el visitante no tiene permiso, sin revelar existencia.
- **Feed v1 (solo diario)**: endpoint autenticado `GET /api/me/feed` con las entradas de los
  usuarios seguidos (relación `accepted`) que sean visibles para el lector, paginado.
- **UI de feed**: nueva página `/[locale]/me/feed` y acceso desde la navegación autenticada.
- **Documentación actualizada en el mismo cambio**: `contracts.md`, `phase-5-design.md` (§14),
  `activity-feed.md`, `docs/README.md`.

## Capabilities

### New Capabilities

- `diary-visibility`: regla de visibilidad para leer entradas ajenas del diario (bloqueos,
  seguimiento, visibilidad de perfil, audiencia de entrada) y lectura paginada del diario de un
  usuario desde su perfil.
- `activity-feed`: feed de actividad v1 compuesto por las entradas del diario de los usuarios
  seguidos que sean visibles para el lector, en orden cronológico descendente y con paginación.

### Modified Capabilities

<!-- Ninguna capacidad existente cambia de comportamiento a nivel de spec: `listen-diary`,
`social-profiles`, `user-following` y `social-blocking` permanecen intactos. La lectura social es
una superficie nueva, no una alteración del diario propio ni del grafo social. -->

## Impact

- **Servicios**: nuevo helper de visibilidad y funciones de lectura social en `src/services/diary/`
  (`visibleAudiencesFor`, `listUserDiary`, `listFeed`), reutilizando `selectEntries`/`serializeEntry`.
- **API**: `GET /api/users/[username]/diary` (público, lista vacía sin permiso) y
  `GET /api/me/feed` (requiere sesión). Schemas Zod en `src/lib/api/schemas.ts`.
- **Frontend**: sección de diario en `users/[username]/page.tsx` (modo lectura de `DiaryList`),
  página `me/feed`, enlace en el shell autenticado, mensajes i18n es/en.
- **Docs**: `04-api/contracts.md`, `05-features/phase-5-design.md`, `05-features/activity-feed.md`,
  `docs/README.md`.
- **Tests**: unitarios de servicio (matriz de visibilidad), rutas y smoke test
  (`scripts/smoke-test-diary-social.ts`) contra BD scratch.