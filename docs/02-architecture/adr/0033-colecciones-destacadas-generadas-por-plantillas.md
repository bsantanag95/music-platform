# ADR 0033 — Colecciones destacadas generadas por plantillas, con refresco semanal bajo demanda

## Estado

Aceptado (cambio `automate-explore-collections`, 2026-10). Primer paso de dos: la generación automática. La gestión
humana desde `/admin` (destacar, reordenar, programar, pausar plantillas) es el cambio `manage-explore-featured-console`.

## Contexto

El riel "Colecciones destacadas" de `/explore` se llenaba con `scripts/seed-discovery.ts`: dos colecciones fijas,
sembradas a mano, que solo acumulaban ítems y nunca rotaban. En producción la plataforma debe publicar contenido
editorial con frecuencia sin que alguien corra un script ni despliegue. El calendario de lanzamientos (ADR 0029) ya
resolvió "refrescar sin cron" con un lock en tabla y `after()`; no hay infraestructura de cron en el proyecto.

## Decisión

1. **Plantillas como código tipado** (`src/services/discovery/collections/templates.ts`): cada una define clave, período,
   título y un selector que devuelve ids de release-group. Iniciales: `new-releases`, `top-rated-quarter`,
   `one-per-decade`, `most-reviewed-month`. Solo usan datos del catálogo y de la comunidad propia, nunca afinidad personal.
2. **Una lista por (plantilla, período)**, propiedad de `@exploracion`, pública, `kind='standard'`, no oficial. La pareja
   vive en `user_list_featured` (migración `0069`: `source`, `template_key`, `period_key`, `starts_at`, `expires_at`,
   `weight`) con índice único parcial; `rank` deja de ser único y pasa a ser desempate tras `weight`.
3. **Reemplazo completo de ítems** en transacción, sin `UPDATE` sobre `user_list` (su trigger de `updated_at` generaría
   eventos de feed; es el motivo por el que la marca destacada vive en tabla aparte, 0013/0018). Con menos de
   `MIN_ALBUMS_FOR_SECTION` álbumes no se crea ni se modifica nada.
4. **Rotación por período:** al crear la lista de un período nuevo, la anterior de la misma plantilla recibe
   `expires_at` y sale del riel; sigue pública y accesible por su URL.
5. **Refresco semanal bajo demanda, sin cron.** La portada de `/explore` programa con `after()` las plantillas cuya
   última corrida exitosa tiene más de 7 días. Una corrida por plantilla a la vez (fila `running` de menos de 15 minutos
   en `explore_collection_sync`, tomada bajo `pg_advisory_xact_lock`); un fallo se registra y conserva lo anterior sin
   frenar a las demás. `scripts/sync-explore-collections.ts` fuerza la corrida.
6. **Lectura del riel:** filas vigentes, ordenadas por `weight` desc, `rank` asc, `starts_at` desc, con tope de 6
   tarjetas. La sección "Destacadas" de Listas aplica la misma vigencia y orden.
7. **Las generadas quedan fuera de la consola editorial y del feed** (`notGeneratedCollectionCondition()`): no son obra de
   una persona ni actividad social.
8. **El seed delega:** `seed-discovery.ts` crea la cuenta curadora y ejecuta la misma generación. Las dos filas que
   sembraba el script se adoptan como plantillas en la migración (backfill por título).

## Alternativas descartadas

- **Cron externo o endpoint programado:** infraestructura nueva; el patrón bajo demanda ya está probado (ADR 0029).
- **Curaduría por archivo JSON:** la UI editorial con roles existentes (ADR 0013) la reemplaza (cambio siguiente).
- **Reglas declarativas en BD:** sobre-ingeniería sin una interfaz que las edite.
- **Acumular ítems entre corridas:** las colecciones se llenaban de discos que ya no cumplen la regla.
- **Mantener `rank` único:** impide rotar y programar sin reasignar todo el orden.

## Consecuencias

- Una visita a `/explore` en un entorno que corta las tareas posteriores a la respuesta deja la corrida `failed`; el
  script sirve de respaldo y la lectura sigue sirviendo la versión anterior.
- En un catálogo pequeño las plantillas con pocos álbumes se omiten y el riel puede quedar corto; sin filas vigentes no
  se muestra.
- Una corrida que no alcanza el mínimo cuenta como exitosa: la plantilla no reintenta hasta la semana siguiente.
- Las listas generadas no se editan a mano (el reemplazo completo borraría la edición); la curaduría humana usa listas
  `curated`.
