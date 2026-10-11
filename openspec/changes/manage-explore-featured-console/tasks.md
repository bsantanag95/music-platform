## 1. Esquema

- [ ] 1.1 Migración `0070_explore_featured_console.sql`: ampliar `chk_editorial_action_action` con `feature`/`unfeature`; tabla `explore_collection_template_state`
- [ ] 1.2 Espejo en `src/db/schema.ts` y actualizar `docs/03-data/sql-model.md`

## 2. Servicio

- [ ] 2.1 `src/services/discovery/featured.ts`: listado admin, destacar, quitar, reordenar atómico, vigencia, con las invariantes de elegibilidad y códigos de error
- [ ] 2.2 `listFeaturedCollections()`: para filas `curated` exigir lista oficial no retirada y moderación visible
- [ ] 2.3 Orquestador de plantillas: respetar pausa (script y visita), `--force`, función `runTemplateNow` con lock; pausar fija `expires_at` de la colección vigente
- [ ] 2.4 Auditoría en `editorial_action` y en el estado de plantillas
- [ ] 2.5 Pruebas unitarias del servicio (elegibilidad, orden/conflicto, vigencia, retiro, pausa)

## 3. API

- [ ] 3.1 Esquemas Zod en `src/lib/api/schemas.ts` (entrada y salida)
- [ ] 3.2 Rutas `featured` (GET/POST), `featured/[listId]` (PATCH/DELETE), `featured/order` (PUT) con `withErrorHandling`, `await params` y gate de permisos
- [ ] 3.3 Rutas `templates` (GET) y `templates/[key]/pause|resume|run` (run responde 202)
- [ ] 3.4 Pruebas de rutas (403 sin `editorial.publish`, errores estables)

## 4. UI

- [ ] 4.1 Pestañas en `EditorialConsole`: "Destacadas" con orden por botones, vigencia, peso, origen y estado en riel
- [ ] 4.2 Panel "Generadas": estado, última corrida, error, pausar/reanudar/forzar con confirmación
- [ ] 4.3 Selector de listas elegibles para destacar; ocultar escritura sin `editorial.publish`
- [ ] 4.4 Mensajes `messages/{es,en}`; pruebas del componente

## 5. Verificación y documentación

- [ ] 5.1 Ampliar el smoke test de colecciones (flujo destacar → riel → retirar → fuera) y su entrada en `AGENTS.md`
- [ ] 5.2 ADR 0034, `explore.md`, `contracts.md`, `errors.md`
- [ ] 5.3 `pnpm run typecheck && pnpm run lint && pnpm test && pnpm run build`; smoke contra BD de scratch
