## Why

La Fase 5 del roadmap tiene implementada la capa de presencia manual (escuchas), el diario
y el feed v1, pero faltan las señales curatoriales: favoritos y listas personales. Sin ellas
la experiencia social queda incompleta: el usuario puede registrar *qué escuchó* y dar su
*opinión*, pero no puede expresar de forma liviana *qué le gusta* ni armar colecciones
curadas para descubrir y compartir música. `05-features/lists-and-favorites.md` está en
estado conceptual y `phase-5-design.md` (paso 5 del orden de implementación) marca este
cambio vertical como el siguiente.

## What Changes

- **Favorito**: señal simple, sin escala numérica, sobre artista, álbum (release group) y
  canción (recording). Se puede marcar y quitar. Tiene audiencia propia
  (`private`/`followers`/`public`), independiente de escucha, rating y comentario. Es un
  toggle idempotente: un usuario tiene a lo sumo un favorito por objetivo.
- **Listas**: colecciones curadas con título y descripción opcional, de **un solo tipo de
  entidad** por lista (artista, álbum o canción), propiedad de **un único usuario** (no
  colaborativas en v1). Orden manual de elementos, agregar/quitar, visibilidad
  (`private`/`followers`/`public`), edición y borrado por el propietario.
- **Superficies**: acciones contextuales en las páginas de artista/álbum/canción (marcar
  favorito, añadir a lista), páginas propias de favoritos y listas, editor de lista y
  secciones públicas en el perfil de usuario respetando audiencias y bloqueos.
- **Feed**: la composición v1 se amplía para incluir favoritos y listas publicadas, con la
  misma paginación (offset + tiebreaker `id DESC`) y respetando el modelo de audiencias
  existente.
- **Docs**: se resuelven las contradicciones pendientes. `domain-model.md` pasa el favorito
  a tres niveles (hoy dice "solo artista"); `lists-and-favorites.md` pasa de conceptual a
  especificación cerrada; `phase-5-design.md` §14 marca las decisiones cerradas;
  `04-api/contracts.md`, `errors.md`, `03-data/sql-model.md` y `05-features/README.md` se
  actualizan en el mismo cambio.

## Capabilities

### New Capabilities

- `favorites`: marca de interés liviana (toggle) sobre artista, álbum o canción, con
  audiencia propia, vista propia y pública, y estados de UI completos.
- `lists`: colecciones curadas mono-tipo (artista/álbum/canción), propiedad de un único
  usuario, con orden manual, visibilidad por audiencia, edición/borrado y superficies propias
  y públicas.

### Modified Capabilities

- `activity-feed`: el feed v1 (hoy solo escuchas del diario) pasa a incluir también
  favoritos y listas publicadas/actualizadas, manteniendo paginación y reglas de audiencia.

## Impact

- **Schema**: nueva migración `NNNN_favorites_lists.sql` con tablas `favorite`, `user_list`
  y `user_list_item` + espejo manual en `src/db/schema.ts` (tipos `*Row`).
- **Servicios**: nuevos `src/services/favorites/` y `src/services/lists/`, reutilizando el
  modelo de audiencias de `src/services/diary/visibility.ts` y bloqueos de
  `src/services/social/blocking.ts`.
- **API**: nuevos endpoints bajo `/api/me/favorites`, `/api/me/lists` y
  `/api/users/[username]/favorites|lists`, todos con `with-error-handling` y `await params`
  (Next 15).
- **UI**: acciones contextuales en páginas de catálogo, páginas `/me/favorites`,
  `/me/lists` y secciones en perfiles de usuario; i18n es/en; navegación autenticada.
- **Docs**: `domain-model.md`, `lists-and-favorites.md`, `phase-5-design.md`,
  `sql-model.md`, `contracts.md`, `errors.md`, `activity-feed.md`, `05-features/README.md`
  y `roadmap.md`.