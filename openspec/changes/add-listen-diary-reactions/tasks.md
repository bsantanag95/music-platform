# Tasks — add-listen-diary-reactions

## 1. Migración y esquema

- [ ] 1.1 Crear `drizzle/0008_listen_entry.sql`: tabla `listen_entry` con `id`, `user_id`,
      exactamente uno de `artist_id`/`release_group_id`/`recording_id` (`CHECK
      num_nonnulls = 1`), `listen_context` (`first_listen`/`relisten`/`rediscovery`), `body`
      nullable, `reaction` nullable (`liked`/`loved`/`obsessed`/`neutral`/`disliked`),
      `audience` (`private`/`followers`/`public`), `created_at`. Sin columna de estrellas.
- [ ] 1.2 Añadir índices a `listen_entry`: por usuario+fecha, y por cada objetivo
      (`artist_id`, `release_group_id`, `recording_id`).
- [ ] 1.3 Espejar `listen_entry` en `src/db/schema.ts` con los CHECK correspondientes y exportar
      el tipo `ListenEntryRow`.
- [ ] 1.4 Actualizar `docs/03-data/sql-model.md` con la nueva tabla y sus reglas (append-only,
      reacción en lugar de estrellas).

## 2. Servicios del diario

- [ ] 2.1 Crear `src/services/diary/types.ts` con los tipos de objetivo del diario, audiencia,
      contexto y reacción (reutilizando los patrones polimórficos de `rating`/`comment`).
- [ ] 2.2 Implementar `createListenEntry(target, targetId, userId)` con audiencia por defecto
      `followers`, contexto inferido (`first_listen` si es la primera entrada del usuario sobre el
      objetivo, si no `relisten`) y validación de que el objetivo existe.
- [ ] 2.3 Implementar `updateListenEntry(id, userId, cambios)` validando propiedad, campos
      opcionales (al menos uno), longitud de `body` (≤500) y taxonomía de `reaction`.
- [ ] 2.4 Implementar `deleteListenEntry(id, userId)` con borrado físico y `404` si no existe o no
      es del propietario.
- [ ] 2.5 Implementar `listMyDiary(userId, page, pageSize)` con orden `created_at DESC, id DESC`,
      paginación estilo `GET /api/me/following` y join con el objetivo para exponer título/cover
      mínimo.
- [ ] 2.6 Garantizar que ninguna mutación del diario toca `rating`: tests que crean y editan
      entradas y verifican que la valoración vigente del objetivo no cambia.

## 3. Schemas y API

- [ ] 3.1 Agregar a `src/lib/api/schemas.ts` los enums `ListenContextSchema`,
      `ListenReactionSchema`, `DiaryAudienceSchema` y los schemas `ListenEntrySchema`,
      `CreateListenEntryRequestSchema`, `UpdateListenEntryRequestSchema`,
      `DiaryListResponseSchema`.
- [ ] 3.2 Agregar los códigos de error `LISTEN_ENTRY_NOT_FOUND` y `DIARY_TARGET_INVALID` al
      `ErrorCodeSchema` (mantener sincronizado con `docs/04-api/errors.md`).
- [ ] 3.3 Crear `src/app/api/me/diary/route.ts` con `POST` (crear escucha) y `GET` (diario con
      paginación), envueltos en `with-error-handling`.
- [ ] 3.4 Crear `src/app/api/me/diary/[id]/route.ts` con `PATCH` (ampliar/modificar) y `DELETE`
      (borrado), validando propiedad vía servicio.
- [ ] 3.5 Crear clientes en `src/lib/api/` (`createListenEntry`, `updateListenEntry`,
      `deleteListenEntry`, `getMyDiary`) usando `apiFetch` y los schemas Zod.
- [ ] 3.6 Actualizar `docs/04-api/contracts.md` y `docs/04-api/errors.md` con los nuevos
      endpoints y códigos.

## 4. Frontend — acción "Marcar como escuchado"

- [ ] 4.1 Crear el componente `MarkAsListened` (botón contextual) con estados de sesión requerida,
      carga, éxito, error y confirmación del registro.
- [ ] 4.2 Integrar `MarkAsListened` en las páginas de artista, álbum y canción sin bloquear la
      carga del contenido musical.
- [ ] 4.3 Crear el panel `ListenEntryForm` para ampliar la entrada con impresión (≤500), contexto,
      reacción y audiencia, enviando `PATCH`.
- [ ] 4.4 Conectar el flujo rápido: `POST` inmediato al pulsar y oferta de ampliación posterior.

## 5. Diario propio y reacciones

- [ ] 5.1 Crear la página `/me/diary` (Server Component) que carga el diario con paginación y
      estados vacío/carga/error.
- [ ] 5.2 Crear el componente `ReactionPicker` y la presentación de reacción ("texto + icono
      opcional"), diferenciando ausencia de reacción de `neutral`.
- [ ] 5.3 Renderizar cada entrada del diario con objetivo, contexto, impresión, reacción,
      audiencia y acciones de ampliar/borrar (solo propias).
- [ ] 5.4 Agregar el enlace al diario en el shell autenticado siguiendo la navegación social
      existente.
- [ ] 5.5 Agregar mensajes es/en (`messages/*/diary.json`) para acciones, estados y etiquetas de
      reacción (`Me gustó`/`Like it`, `Me encantó`/`Loved it`, `Obsesión`/`Obsessed`,
      `Neutro`/`Neutral`, `No me gustó`/`Didn't click`, `Sin reacción`).

## 6. Tests

- [ ] 6.1 Tests del servicio: creación, inferencia de contexto, múltiples escuchas, audiencia por
      defecto, ampliación, borrado, propiedad, `body` >500, reacción inválida y `neutral` vs
      `null`.
- [ ] 6.2 Tests de independencia con `rating`: crear/editar/borrar entradas no altera la
      valoración vigente del objetivo.
- [ ] 6.3 Tests de rutas: `POST`/`GET`/`PATCH`/`DELETE` con sesión y sin sesión, paginación,
      `404` de entrada ajena y validaciones.
- [ ] 6.4 Tests de componentes: `MarkAsListened`, `ListenEntryForm`, `ReactionPicker` y página
      del diario (estados, accesibilidad, locales).
- [ ] 6.5 Tests de clientes `src/lib/api/` parseando los wrappers reales de los nuevos endpoints.
- [ ] 6.6 Crear `scripts/smoke-test-diary.ts` (mockea `global.fetch`; no sale a internet) que
      ejercite alta, ampliación, borrado y paginación del diario contra BD scratch.

## 7. Documentación del cambio estrellas → reacción

- [ ] 7.1 Actualizar `docs/05-features/listening-diary-and-ratings.md`: eliminar `stars` del
      modelo de `listen_entry` y describir la reacción emocional (`liked`/`loved`/`obsessed`/
      `neutral`/`disliked`/ausencia) como la gramática de sensación de la escucha.
- [ ] 7.2 Actualizar `docs/05-features/phase-5-design.md`: las secciones de escucha, rating y
      favorito deben reflejar que `listen_entry` usa reacción y no estrellas.
- [ ] 7.3 Actualizar `docs/01-domain/domain-model.md` y `docs/03-data/sql-model.md` si mencionan
      estrellas en el diario o relación con rating.
- [ ] 7.4 Revisar `activity-feed.md`/`lists-and-favorites.md` y cualquier otra referencia a
      estrellas en escuchas para alinearla con la reacción emocional.

## 8. Validación e integración

- [ ] 8.1 Ejecutar `pnpm run typecheck`, `pnpm run lint`, `pnpm run test` y `pnpm run build` y
      corregir hasta que pasen.
- [ ] 8.2 Correr `scripts/smoke-test-diary.ts` contra una BD scratch (`DATABASE_URL` distinto +
      `ALLOW_SMOKE_ON_REAL_DB=1`) y limpiar los fixtures creados.
- [ ] 8.3 Revisar manualmente el flujo completo en es/en y móvil/escritorio: registro rápido,
      ampliación, borrado, audiencia y distinción `neutral`/sin reacción.
- [ ] 8.4 Verificar que la migración se registra en `_migrations` y que los datos del catálogo no
      se modifican.