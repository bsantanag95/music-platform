## 1. Refactor previo y documentación de diseño

- [ ] 1.1 Extraer `audiencesForProfile` de `src/services/diary/visibility.ts` a
      `src/services/social/visibility.ts` como helper compartido que devuelve `Audience[]`, y
      adaptar los callers de `diary/` sin romper su comportamiento
- [ ] 1.2 Correr `pnpm run typecheck && pnpm run lint && pnpm run test` con los tests de
      `diary/` y `social/` verdes antes de seguir

## 2. Migración y schema

- [ ] 2.1 Crear `drizzle/0009_favorites_lists.sql` con las tablas `favorite`, `user_list` y
      `user_list_item` siguiendo el patrón de objetivo único (`num_nonnulls = 1`), CHECK de
      audiencias, índices únicos parciales por objetivo, `UNIQUE DEFERRABLE (list_id, position)`
      y trigger `trg_user_list_item_target_type` que valide el tipo contra `entity_type`
- [ ] 2.2 Añadir trigger de `updated_at` para `user_list` (regla del proyecto: lo mantiene la BD)
- [ ] 2.3 Espejo manual en `src/db/schema.ts`: tablas `favorite`, `user_list`, `user_list_item`
      con sus índices y tipos `FavoriteRow`, `UserListRow`, `UserListItemRow`
- [ ] 2.4 Aplicar `pnpm run db:migrate` y verificar el esquema contra una BD de scratch
- [ ] 2.5 Actualizar `docs/03-data/sql-model.md` con el propósito y relaciones de las tres tablas

## 3. Servicios de favoritos

- [ ] 3.1 Crear `src/services/favorites/types.ts` con los valores estables de objetivo y
      audiencia (reutilizando `Audience` compartida)
- [ ] 3.2 Implementar `src/services/favorites/favorites.ts`: toggle idempotente, cambio de
      audiencia, listado propio paginado y listado ajeno filtrado por la matriz de visibilidad
- [ ] 3.3 Tests unitarios `favorites.test.ts` (idempotencia, unicidad por usuario/objetivo,
      visibilidad, bloqueos)

## 4. Servicios de listas

- [ ] 4.1 Crear `src/services/lists/types.ts` con `entityType` y límites de texto (title 100,
      description 500, fijados en Zod y documentados en `contracts.md`)
- [ ] 4.2 Implementar `src/services/lists/lists.ts`: CRUD de listas, agregar/quitar ítems con
      validación de tipo, reordenamiento transaccional y lectura ajena filtrada por visibilidad
- [ ] 4.3 Tests unitarios `lists.test.ts` (mono-tipo, idempotencia de ítems, reorden, borrado en
      cascada, propiedad y visibilidad)

## 5. API REST de favoritos

- [ ] 5.1 Añadir `POST /api/me/favorites` (crea/upsert idempotente) y
      `DELETE /api/me/favorites` (borra idempotente) con `with-error-handling` y Zod
- [ ] 5.2 Añadir `GET /api/me/favorites` (listado propio paginado)
- [ ] 5.3 Añadir `GET /api/users/[username]/favorites` (listado ajeno filtrado por visibilidad)
- [ ] 5.4 Actualizar `src/lib/api/schemas.ts` y `src/lib/api/client.ts` con los nuevos contratos

## 6. API REST de listas

- [ ] 6.1 Añadir `POST /api/me/lists`, `GET /api/me/lists` (sin conteo ni ítems inline) y
      `GET /api/me/lists/[listId]` (con ítems)
- [ ] 6.2 Añadir `PATCH /api/me/lists/[listId]` y `DELETE /api/me/lists/[listId]`
- [ ] 6.3 Añadir `POST /api/me/lists/[listId]/items`, `DELETE /api/me/lists/[listId]/items/[itemId]`
      y `PUT /api/me/lists/[listId]/items` (reorden)
- [ ] 6.4 Añadir `GET /api/users/[username]/lists` y `GET /api/users/[username]/lists/[listId]`
- [ ] 6.5 Actualizar `src/lib/api/schemas.ts` y `src/lib/api/client.ts` con los nuevos contratos

## 7. Feed ampliado

- [ ] 7.1 Ampliar la composición del feed para unir escuchas, favoritos y eventos de listas bajo
      demanda, con orden `created_at DESC` y desempate por fuente + id
- [ ] 7.2 Mantener la regla de audiencias (`audiencesForProfile` compartida) y bloqueos en las
      tres fuentes; un evento de creación al crear la lista y uno de actualización (con
      `updated_at`) cuando cambian título/descripción/audiencia, nunca por ítem
- [ ] 7.3 Tests unitarios del feed con las tres fuentes y visibilidad

## 8. UI de favoritos y listas

- [ ] 8.1 Acción contextual de favorito (toggle) en las páginas de artista, álbum y canción con
      estados de carga/éxito/error/sesión requerida
- [ ] 8.2 Acción "añadir a lista" en las páginas de catálogo con selector de listas compatibles
      y opción de crear lista nueva
- [ ] 8.3 Página `/me/favorites` y sección de favoritos en `/users/[username]`
- [ ] 8.4 Páginas `/me/lists`, `/me/lists/[id]` (detalle + editor con reorden y confirmaciones
      destructivas) y sección de listas en `/users/[username]`
- [ ] 8.5 Entradas de Favoritos y Listas en la navegación autenticada (menú secundario en móvil)
- [ ] 8.6 Mensajes i18n es/en para todas las superficies nuevas y estados vacíos accesibles

## 9. Feed en UI

- [ ] 9.1 Renderizar los nuevos tipos de entrada (favorito, lista creada/actualizada) en el feed
      con jerarquía visual y enlace al perfil del autor
- [ ] 9.2 Traducir los textos del feed ampliado en es/en

## 10. Contratos y documentación

- [ ] 10.1 Actualizar `docs/04-api/contracts.md` con los endpoints nuevos de favoritos y listas
- [ ] 10.2 Actualizar `docs/04-api/errors.md` con códigos nuevos si aplica (`FAVORITE_*`,
      `LIST_NOT_FOUND`, etc.)
- [ ] 10.3 Actualizar `docs/05-features/lists-and-favorites.md` de conceptual a especificación
      cerrada (favorito 3 niveles, listas mono-tipo, dueño único)
- [ ] 10.4 Actualizar `docs/01-domain/domain-model.md` (favorito en tres niveles, lista mono-tipo)
      y `docs/02-architecture/adr/` si alguna decisión lo amerita
- [ ] 10.5 Actualizar `docs/05-features/phase-5-design.md` (§14 decisiones cerradas),
      `docs/05-features/activity-feed.md`, `docs/05-features/README.md` y `docs/00-product/roadmap.md`
- [ ] 10.6 Sincronizar los specs principales en `openspec/specs/` si `opsx-sync-specs` lo requiere

## 11. Verificación final

- [ ] 11.1 Correr `pnpm run typecheck && pnpm run lint && pnpm run test && pnpm run build`
- [ ] 11.2 Revisar que el checklist de AGENTS.md quede cumplido (documentación actualizada en el
      mismo cambio; sin tocar `catalog/` ni `musicbrainz/`)
- [ ] 11.3 Confirmar con el usuario antes de archivar el cambio (no archivarlo de forma
      automática)