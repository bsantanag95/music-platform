## Context

`listFeaturedCollections()` lee `user_list_featured` (migración 0018): presencia de fila = destacada,
`rank` único. Solo `scripts/seed-discovery.ts` escribe esa tabla, con dos selectores fijos que solo
agregan ítems. El calendario de lanzamientos (ADR 0029) ya resolvió "refrescar sin cron": columna de
última corrida exitosa, `after()` desde la página, lock con fila `running` bajo
`pg_advisory_xact_lock`, reemplazo completo y conservación ante fallo. Se reutiliza ese patrón.

`user_list.updated_at` lo mantiene un trigger y el feed deriva de él eventos de "lista actualizada";
por eso la marca destacada vive en tabla aparte (0013, 0018). El generador no debe actualizar
`user_list` de listas existentes.

## Goals / Non-Goals

**Goals:** colecciones frescas y rotativas sin intervención; idempotencia; un fallo no vacía el riel;
modelo reutilizable por la consola del cambio siguiente.

**Non-Goals:** UI de gestión, curaduría por JSON, cron externo, personalización.

## Decisions

1. **Plantillas como código tipado.** `src/services/discovery/collections/templates.ts` exporta un
   registro `COLLECTION_TEMPLATES` con `key`, `periodKey(now)`, `title(period)`, `select(now)` → ids de
   `release_group` y `minItems` (= `MIN_ALBUMS_FOR_SECTION`). Plantillas iniciales: `new-releases`
   (evergreen, últimos `NEW_RELEASE_WINDOW_DAYS`, con carátula), `top-rated-quarter` (período
   trimestre, valoraciones del trimestre, ≥ `MIN_RATINGS_PER_ALBUM`), `one-per-decade` (evergreen),
   `most-reviewed-month` (período mes). *Alternativa descartada:* reglas declarativas en BD;
   sobre-ingeniería sin UI que las edite.
2. **Una lista por (plantilla, período).** La lista pertenece a `@exploracion`, `audience='public'`,
   `kind='standard'`, `is_official=false`. Se identifica por `(template_key, period_key)` en
   `user_list_featured` (índice único parcial `WHERE source='template'`), no por título: renombrar no
   duplica. Evergreen usa `period_key='evergreen'`.
3. **Reemplazo completo de ítems en transacción** (borrar + insertar con `position` consecutiva). La
   restricción `(list_id, position)` es DEFERRABLE; el borrado previo evita choques. Nunca se hace
   `UPDATE user_list`, así no hay eventos de feed. Si `select` devuelve menos de `minItems`, no se
   toca la lista existente (se conserva) y no se crea una nueva.
4. **Vencimiento por rotación.** Al crear la lista de un período nuevo, la fila del período anterior
   de la misma plantilla recibe `expires_at = now()`. La lista vieja sigue siendo pública y accesible
   por su URL; solo sale del riel.
5. **Disparo semanal bajo demanda.** `explore/page.tsx` llama a `scheduleStaleCollectionSync()`
   dentro de `after()`: por plantilla, si no hay corrida `succeeded` en los últimos 7 días
   (`COLLECTION_REFRESH_DAYS`), corre. Tabla `explore_collection_sync (id, template_key, status
   running|succeeded|failed, started_at, finished_at, error)`; una fila `running` de menos de 15 min
   bloquea, tomada bajo `pg_advisory_xact_lock`. Cada plantilla es independiente: una falla no
   detiene a las demás. `scripts/sync-explore-collections.ts [--template <key>]` fuerza la corrida
   (respaldo si el entorno corta tareas posteriores a la respuesta).
6. **Esquema (migración 0069).** `user_list_featured` + `source` (`curated`|`template`, default
   `curated`), `template_key`, `period_key`, `starts_at` (default `now()`), `expires_at`, `weight`
   (SMALLINT default 0). Se elimina `uq_user_list_featured_rank`; `rank` se conserva NOT NULL > 0 como
   desempate. `CHECK`: `source='template'` ⇒ `template_key` y `period_key` no nulos; `expires_at` >
   `starts_at`. Backfill: las filas sembradas "Novedades esenciales" y "Un disco por década" de
   `@exploracion` pasan a `source='template'` con su clave y `period_key='evergreen'`.
7. **Lectura del riel.** `listFeaturedCollections()` filtra `starts_at <= now()` y `expires_at` nulo
   o futuro, ordena por `weight DESC, rank ASC, starts_at DESC` y limita a `FEATURED_RAIL_LIMIT` (6).
8. **Exclusiones.** `listEditorialLists()` descarta listas con fila `source='template'` (la consola
   humana no las ve; el cambio siguiente añade una sección propia). Se verifica que el feed no
   muestre actividad de las listas generadas y, si no las excluye ya, se agrega la condición.
9. **El seed delega.** `seed-discovery.ts` conserva `upsertCurator()` y llama al mismo orquestador;
   se elimina `COLLECTIONS`. *Alternativa descartada:* mantener dos fuentes de colecciones.

## Risks / Trade-offs

- Un entorno que corte `after()` deja la corrida `failed` → el script la fuerza; la lectura sigue
  sirviendo la versión anterior.
- Catálogo pequeño: plantillas con menos de 6 álbumes se omiten → el riel puede quedar corto; sin
  filas vigentes el riel no aparece (comportamiento ya especificado).
- Las consultas de selección corren dentro de `after()`: acotadas por índices existentes y tope de
  12 ítems; se mide en scratch antes de cerrar.
- El reemplazo completo borraría ediciones manuales en una lista generada → las generadas no se
  editan; la curaduría humana usa listas `curated` (cambio siguiente).

## Migration Plan

1. Aplicar `0069` (aditiva salvo la eliminación del índice único de `rank`).
2. Desplegar; la primera visita a `/explore` (o `sync-explore-collections.ts`) genera las colecciones.
3. Rollback: las columnas nuevas son inertes si el código vuelve atrás; al revertir el esquema se
   reasignan los `rank` repetidos y se re-crea el índice.

## Open Questions

- Ninguna bloqueante. Las plantillas iniciales y sus ventanas pueden ajustarse en la implementación
  sin cambiar el modelo.
