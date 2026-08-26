## Why

El feed v1 (`add-favorites-and-lists`) solo compone escuchas, favoritos y eventos de lista.
El diseño maestro de Fase 5 (`docs/05-features/phase-5-design.md`, sección 9) y el propio
documento de feature (`docs/05-features/activity-feed.md`) dejan explícito que ratings y
comentarios también deben aparecer en el feed. Sin ellos, la Fase 5 no puede considerarse
cerrada: son las dos formas de opinión más ricas sobre una escucha y hoy quedan invisibles
para quien sigue a otro usuario.

## What Changes

- `listFeed` (`src/services/feed/feed.ts`) suma dos fuentes nuevas a la unión: `rating` y
  `comment`, con el mismo criterio de orden (`createdAt DESC`, desempate por id) y la misma
  paginación en memoria que ya usan escuchas/favoritos/listas.
- Ratings y comentarios **no tienen columna de audiencia** (a diferencia de `listen_entry`,
  `favorite` y `userList`): hoy son siempre visibles en la página del catálogo. Este cambio
  **no** introduce audiencia por actividad para ellos — se tratan como audiencia `public`
  implícita a efectos del feed, filtrados únicamente por la privacidad del perfil del autor
  (`audiencesForProfile`) y por bloqueos, igual que ya ocurre en la vista de catálogo. La
  audiencia por actividad para rating/comment queda fuera de este cambio (ver Non-Goals en
  `design.md`).
- Un nuevo rating de un usuario reemplaza al vigente (mismo objetivo): el feed debe mostrar
  solo la entrada correspondiente a la valoración vigente, no un historial de cambios de
  estrellas.
- Cada comentario genera su propia entrada de feed (a diferencia de las listas, donde un
  ítem agregado no genera evento): un usuario puede publicar varios comentarios sobre el
  mismo objetivo y cada uno es una actividad distinta.
- `GET /api/me/feed` expone las nuevas entradas (`kind: "rating"`, `kind: "comment"`) sin
  romper el contrato de las existentes.
- `openspec/specs/activity-feed/spec.md` se actualiza (delta spec) para reflejar el nuevo
  alcance del feed v1.

## Capabilities

### New Capabilities

(ninguna — no se introduce una capability nueva)

### Modified Capabilities

- `activity-feed`: el requisito "Alcance del feed v1" cambia — el feed ahora SHALL incluir
  ratings y comentarios además de escuchas, favoritos y eventos de lista. Se agregan
  escenarios de reemplazo de rating vigente y de múltiples comentarios por objetivo.

## Impact

- **Código:** `src/services/feed/feed.ts`, `src/services/feed/feed.test.ts`,
  `src/app/api/me/feed/route.ts`, `src/app/api/me/feed/route.test.ts`,
  `src/components/feed/FeedList.tsx` (nuevo render por tipo de entrada), catálogos de
  mensajes i18n para los textos de las nuevas entradas.
- **API:** `GET /api/me/feed` — respuesta ampliada de forma aditiva (nuevos valores de
  `kind`), sin cambios en los contratos existentes de `rating`/`comment` en las rutas de
  catálogo.
- **Esquema:** ninguno (no se agrega audiencia a `rating`/`comment` en este cambio).
- **Documentación:** `docs/05-features/activity-feed.md`, `docs/00-product/roadmap.md`
  (actualizar el estado de la Fase 5 una vez implementado).
