## Context

`/admin` ([page.tsx](src/app/[locale]/admin/page.tsx)) exige `editorial.author` y monta
`EditorialConsole` sobre `/api/admin/editorial/lists/*`. El servicio `lists/editorial.ts` gestiona el
flujo de estados y escribe `editorial_action`. `automate-explore-collections` añade a
`user_list_featured` origen, plantilla, período, vigencia y peso, y la tabla `explore_collection_sync`.
Este cambio agrega la escritura humana sobre esas estructuras.

## Goals / Non-Goals

**Goals:** destacar/quitar/reordenar/programar, y pausar/forzar plantillas, con permisos, validación
en servicio y auditoría. **Non-Goals:** editar listas generadas, UI de roles, nuevos permisos.

## Decisions

1. **Permisos sin cambios.** Lectura de los paneles: `editorial.author`. Escritura (destacar, quitar,
   reordenar, vigencia, plantillas): `editorial.publish`. Destacar decide qué ve la portada de todos,
   por eso queda con quien ya publica. *Alternativa descartada:* permitir a `editorial_curator`;
   reintroduce el acoplamiento autoría/publicación que resolvió ADR 0013.
2. **Servicio `discovery/featured.ts`** con `listFeaturedAdmin()`, `featureList(listId, opts, actor)`,
   `unfeatureList`, `reorderFeatured(ids, actor)` y `updateFeaturedSchedule`. Invariantes impuestas
   ahí, no en la UI: la lista debe ser de `@exploracion`, `is_official` y no retirada,
   `audience='public'`, `kind='standard'` y `moderation_status='visible'`; si no, `ApiError` con
   código (`FEATURE_NOT_PUBLISHED`, `FEATURE_NOT_ELIGIBLE`). `weight`/`rank` se recalculan en una
   transacción al reordenar (el orden recibido define `weight` descendente).
3. **Salida automática.** `listFeaturedCollections()` ya exige `audience='public'`; se agrega
   `is_official AND official_withdrawn_at IS NULL` solo para filas `source='curated'`. Retirar una
   lista la saca del riel sin borrar su fila (queda reutilizable si se republica). Quitar de destacadas
   borra la fila `curated`; en una `template` se fija `expires_at = now()` (la plantilla puede volver a
   crearla en el siguiente período; para impedirlo se pausa).
4. **Plantillas.** Tabla `explore_collection_template_state (template_key PK, paused_at, paused_by,
   updated_at)` (la migración crea la fila al pausar). El orquestador omite plantillas pausadas, tanto
   en la visita como en el script, salvo `--force`. "Forzar" desde la UI llama a la misma función con
   el lock de `explore_collection_sync`, en `after()`, y responde 202. Pausar además fija `expires_at`
   en la colección vigente para retirarla del riel de inmediato (acción explícita en el panel, con
   confirmación).
5. **Auditoría.** `editorial_action` amplía su `CHECK` con `feature` y `unfeature` (listas curadas; el
   FK `list_id` ya existe). Pausar/reanudar se audita en `paused_by/paused_at` más el historial en
   `editorial_action` con la lista vigente de la plantilla si la hay. Reordenar y cambiar vigencia
   registran `feature` sobre cada lista afectada.
6. **API.** `GET/POST /api/admin/editorial/featured`, `PATCH/DELETE .../featured/[listId]`,
   `PUT .../featured/order`, `GET .../templates`, `POST .../templates/[key]/pause|resume|run`. Todo
   handler con `withErrorHandling`, `await params` y validación Zod en entrada y salida. Contratos y
   errores en `contracts.md`/`errors.md`.
7. **UI.** Dos paneles nuevos en `EditorialConsole` (pestañas): "Destacadas" (tabla ordenable con
   botones subir/bajar —accesible sin arrastrar—, selector de vigencia, peso, etiqueta de origen) y
   "Generadas" (estado, última corrida, error, pausar/forzar). El selector de "destacar" ofrece solo
   listas elegibles. Textos en `messages/{es,en}`. Los controles de escritura se ocultan si falta
   `editorial.publish`, y el servidor igualmente los rechaza.

## Risks / Trade-offs

- Dos personas reordenan a la vez → el reordenamiento envía la lista completa de ids y falla con
  `FEATURED_ORDER_CONFLICT` si el conjunto cambió.
- Una lista curada que se vuelve ineligible sale en silencio → el panel la marca "Fuera del riel" con
  el motivo.
- Pausar una plantilla deja el riel corto → el panel muestra cuántas tarjetas vigentes hay.

## Migration Plan

1. Aplicar `0070` (amplía un `CHECK`, crea tabla). Aditiva.
2. Desplegar API y UI juntos. Rollback: el `CHECK` ampliado es inocuo para el código anterior.

## Open Questions

- ¿Se notifica al equipo cuando una plantilla falla N veces seguidas? Fuera de alcance; el panel
  muestra el último error.
