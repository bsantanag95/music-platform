## 1. Modelo de datos

- [x] 1.1 Verificar el siguiente número de migración libre en `drizzle/` (hay worktrees que podrían haber agregado migraciones) y crear `NNNN_editorial_curation.sql`: agregar `editorial_author_id`, `editorial_submitted_at` y `editorial_submitted_by` a `user_list`, y crear la tabla `editorial_action` (`id`, `list_id`, `actor_id`, `action`, `created_at`) con `CHECK` de acciones `create`/`edit`/`submit`/`publish`/`withdraw`.
- [x] 1.2 Espejo del esquema en `src/db/schema.ts` (columnas de `user_list` y tabla `editorial_action` con sus tipos `*Row`).
- [x] 1.3 Actualizar `docs/03-data/sql-model.md` con las columnas nuevas, la tabla de auditoría y la derivación de estados borrador/propuesta/publicada/retirada.

## 2. Autorización y roles

- [x] 2.1 Agregar `editorial.author` y conservar/ajustar `editorial.publish` en `Permission`, y actualizar `ROLE_PERMISSIONS` en `src/services/auth/permissions.ts` (`editorial_curator` → `editorial.author`; `admin` → `editorial.author` + `editorial.publish` + moderación + `platform.manage_roles`).
- [x] 2.2 Agregar `editorial_curator` a `PlatformRole` en `src/services/auth/roles.ts`.
- [x] 2.3 Actualizar `src/services/auth/authorization.test.ts` (y permisos relacionados) para cubrir `editorial_curator` (author sin publish) y `admin` (ambos).

## 3. Servicios editoriales

- [x] 3.1 Implementar la creación de borradores editoriales sobre listas de `@exploracion` con `editorial.author`, forzando `audience = 'public'` y registrando `editorial_author_id` y una acción `create` en `editorial_action`.
- [x] 3.2 Implementar variantes editoriales de edición de ítems —`addItemToList`/`removeItemFromList`/`reorderListItems` en `src/services/lists/lists.ts` hoy se scopan por `ownerId = actor`— que en lugar de eso verifiquen la condición editorial (owner `@exploracion` + `editorial_author_id NOT NULL`). Incluye la resolución de entidades de MusicBrainz por tipo (`artist`/`release_group`/`recording`) y la validación de que el tipo coincida con el de la lista.
- [x] 3.3 Implementar la edición de metadatos (título, descripción, audiencia fija `public`) con `editorial.author`, registrando acción `edit`.
- [x] 3.4 Implementar la propuesta con `editorial.author`, fijando `editorial_submitted_at`/`editorial_submitted_by` y registrando acción `submit`.
- [x] 3.5 Implementar el borrado de borradores editoriales nunca publicados con `editorial.author`: solo listas con `is_official = false` y `official_withdrawn_at IS NULL`; excluye publicadas y retiradas; cascada de ítems ya existente; sin acción de auditoría (el FK `list_id` cascada).
- [x] 3.6 Actualizar `publishOfficialList`/`unpublishOfficialList` en `src/services/lists/editorial.ts` para exigir `editorial.publish` y registrar acciones `publish`/`withdraw`.
- [x] 3.7 Exponer un helper que derive el estado editorial (borrador/propuesta/publicada/retirada) y ampliar `listEditorialLists` con el filtro `status` para `draft`/`submitted` además de `published`/`withdrawn`, devolviendo autoría y estado.
- [x] 3.8 Tests de servicio: creación/edición de metadatos y de ítems/propuesta/borrado, rechazo sin permiso (`403`), lista personal ajena (`404`), intento de borrar una publicada/retirada, audiencia forzada a `public` y trazabilidad de auditoría.

## 4. API

- [x] 4.1 `POST /api/admin/editorial/lists` para crear borrador (`editorial.author`), con validación Zod del body.
- [x] 4.2 `PATCH /api/admin/editorial/lists/[listId]` para editar borrador (`editorial.author`), dejando de publicar.
- [x] 4.3 Endpoints de ítems del borrador (agregar/quitar/reordenar) con `editorial.author`.
- [x] 4.4 `DELETE /api/admin/editorial/lists/[listId]` para borrar un borrador nunca publicado (`editorial.author`), respondiendo `404` para listas personales, publicadas o retiradas.
- [x] 4.5 `POST /api/admin/editorial/lists/[listId]/submit` para proponer (`editorial.author`).
- [x] 4.6 `POST /api/admin/editorial/lists/[listId]/publish` y `.../withdraw` para publicar/retirar (`editorial.publish`).
- [x] 4.7 Ajustar `GET /api/admin/editorial/lists` para incluir estado y autoría, gateado por `editorial.author`.
- [x] 4.8 Tests de rutas: mapeo de códigos de permiso (`403`), conflicto de estado y contratos de respuesta.

## 5. Interfaz

- [x] 5.1 Cambiar `/[locale]/admin` para exigir `editorial.author` y renderizar controles de publicar/retirar solo con `editorial.publish`. No crear una página paralela para curadores.
- [x] 5.2 Extender `EditorialConsole.tsx` con los estados borrador/propuesta además de publicada/retirada, mostrando "creada por" el autor original, acciones según permiso y borrado de borradores nunca publicados.
- [x] 5.3 Actualizar el enlace de navegación para mostrarse con `editorial.author` y ajustar `Header.tsx`/`Header.test.tsx`.
- [x] 5.4 Agregar/ajustar mensajes i18n (`messages/es/common.json`, `messages/en/common.json`) para los nuevos estados, "creada por" y acciones.
- [x] 5.5 Tests de componente de la consola editorial y del Header.

## 6. Documentación y ADR

- [x] 6.1 Agregar ADR 0013 que documente el rol editorial separado y sustituya la consecuencia de ADR 0012 sobre no introducirlo.
- [x] 6.2 Actualizar `docs/02-architecture/auth.md` (sección 7) con `editorial_curator`, los dos permisos editoriales (`editorial.author`, `editorial.publish`) y la distinción entre el rol y la cuenta curadora `@exploracion`.
- [x] 6.3 Actualizar `docs/01-domain/business-rules.md` y `docs/01-domain/domain-model.md` con el rol y la separación autoría/publicación.
- [x] 6.4 Actualizar `docs/00-product/product_philosophy.md` (§6.3) resolviendo el pendiente de qué rol publica.
- [x] 6.5 Actualizar `docs/04-api/contracts.md` con los nuevos endpoints y el cambio de `PATCH`.

## 7. Verificación

- [x] 7.1 Ejecutar `pnpm run typecheck`.
- [x] 7.2 Ejecutar `pnpm run lint`.
- [x] 7.3 Ejecutar `pnpm run test`.
- [x] 7.4 Ejecutar `pnpm run build`.
- [x] 7.5 Verificar manualmente con usuario normal, curador y admin (crear/editar/proponer/borrar/publicar/retirar).
