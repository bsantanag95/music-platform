# ADR 0009 — Borrado físico (no soft-delete) para `rating` y `comment`

**Estado:** Aceptado

## Contexto

`conventions.md` dejaba esta decisión explícitamente pendiente: *"Aún no definido si se usará soft delete (columna `deleted_at`) o borrado físico — pendiente de decidir antes de la Fase 4, cuando el borrado de valoraciones/comentarios sea una funcionalidad real."* Fase 4 es ese momento.

## Decisión

`rating` y `comment` usan **borrado físico** (`DELETE` real). No se introduce `deleted_at` ni ninguna forma de soft-delete en estas dos tablas.

## Justificación

- Los índices únicos parciales de `rating` (`uq_rating_user_artist`, `uq_rating_user_release_group`, `uq_rating_user_recording` — ver `03-data/sql-model.md`) ya resuelven "una valoración vigente por usuario y objetivo" contando solo filas existentes. Un borrado físico deja el camino libre para que el usuario vuelva a valorar sin fricción. Un soft-delete obligaría a modificar los tres índices para excluir filas "borradas" (`AND deleted_at IS NULL`), agregando complejidad justo sobre el punto que **ADR 0002 ya señala como el más delicado del esquema**.
- Con **múltiples modelos distintos escribiendo queries** a lo largo del tiempo (es el modelo de trabajo elegido para este proyecto), "olvidar el filtro `deleted_at IS NULL` en una query nueva" es una clase de bug real y silenciosa — mostraría contenido que el usuario ya creía borrado. Es preferible eliminar la clase de bug que confiar en que la revisión cruzada siempre la atrape.
- Ninguna función del producto planificada hasta ahora necesita el historial de lo borrado: `activity-feed.md` se alimenta de acciones positivas (nueva entrada de diario, cambio de rating, nuevo comentario), nunca de razonar sobre elementos eliminados.
- Es coherente con el principio ya aplicado en el proyecto de no anticipar infraestructura o complejidad sin señal real de necesidad (mismo criterio que la evaluación de Object Storage para carátulas en `data-licensing.md`, o el registro histórico de escuchas en `listening-diary-and-ratings.md`, deliberadamente separado de `rating` en vez de forzarlo ahí).

## Alternativas consideradas

- **Soft-delete con `deleted_at`** en ambas tablas: descartado por el costo de mantener los índices parciales sincronizados y el riesgo de fuga de contenido "borrado" por una query que olvide el filtro.
- **Soft-delete solo para `comment`** (pensando en moderación futura) pero físico para `rating`: descartado por inconsistencia de patrón sin necesidad concreta hoy. `ratings-and-reviews.md` ya deja explícitamente abierta la pregunta de moderación/reporte de comentarios como "a resolver al implementar, no antes" — cuando esa función se decida, se revisita este ADR con el problema real delante, no antes.

## Consecuencias

- Un `rating` o `comment` borrado **no es recuperable** — no hay papelera ni historial. Comunicar esto en la UI de confirmación de borrado es responsabilidad del agente Frontend cuando implemente esa acción.
- Ningún agente debe agregar una columna `deleted_at` a `rating` ni `comment` sin reabrir este ADR explícitamente.
- Si en el futuro aparece una necesidad real de auditoría o moderación (no solo hipotética), se evalúa como una extensión nueva y documentada, no como una reversión silenciosa de esta decisión.
