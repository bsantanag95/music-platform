## 1. Esquema y modelo de datos

- [x] 1.1 Crear `drizzle/0012_physical_collection.sql`: tabla `collection_entry` (`id`,
  `user_id` FK `app_user` on delete cascade, `release_group_id` FK `release_group` on delete
  cascade, `format` text not null, `attributes` text[] not null default `'{}'`, `note` text,
  `audience` text not null default `'followers'`, `created_at`, `updated_at`).
- [x] 1.2 Añadir en la migración los `CHECK`: `format IN ('vinyl','cd','cassette','other')`,
  `audience IN ('private','followers','public')`, `note IS NULL OR length(note) <= 140`, y
  `attributes <@ ARRAY[...]::text[]` con el vocabulario cerrado de design.md D3.
- [x] 1.3 Añadir índices: `idx_collection_entry_user_created (user_id, created_at desc)`,
  `idx_collection_entry_user_release_group (user_id, release_group_id)`,
  `idx_collection_entry_release_group (release_group_id)`, GIN `idx_collection_entry_attributes (attributes)`.
- [x] 1.4 Añadir el trigger `trg_collection_entry_updated_at` para `updated_at` (patrón de `user_list`).
- [x] 1.5 Aplicar la migración con `pnpm run db:migrate` y verificar que corre en limpio.
- [x] 1.6 Espejar la tabla en `src/db/schema.ts` (`collectionEntry` + `CollectionEntryRow`),
  sin `any`, con los mismos `check`/índices declarados.
- [x] 1.7 Actualizar `docs/03-data/sql-model.md` con la tabla, índices, CHECK y trigger.

## 2. Vocabulario y servicio de dominio

- [x] 2.1 Crear `src/services/collection/vocabulary.ts`: constantes tipadas de `FORMATS` y
  `EDITION_ATTRIBUTES` (fuente única de verdad, reutilizada por Zod y por la UI).
- [x] 2.2 Crear `src/services/collection/types.ts`: tipos de entrada, filtros y resultados
  paginados.
- [x] 2.3 Crear `src/services/collection/collection.ts`: `addEntry`, `updateEntry`,
  `removeEntry`, `listOwnCollection` (con filtros `format`/`attribute`, paginación offset +
  `id DESC`), `listProfileCollection` (filtrada con `audiencesForProfile` de
  `src/services/social/visibility.ts` + bloqueos de `blocking`), `listOwnEntriesForReleaseGroup`.
- [x] 2.4 `addEntry` valida que el `release_group` existe (si no, error mapeable a `ALBUM_NOT_FOUND`),
  deduplica y ordena `attributes` antes de persistir, y crea siempre una entrada nueva.
- [x] 2.5 `removeEntry`/`updateEntry` devuelven "no encontrado" cuando la entrada no existe o
  no es del usuario (sin revelar existencia ajena).
- [x] 2.6 `src/services/collection/collection.test.ts`: alta, alta múltiple del mismo álbum y
  formato, edición, borrado propio/ajeno/inexistente, filtros por formato y atributo,
  paginación, matriz de visibilidad (público/seguidor/privado/bloqueo), independencia de
  favoritos/escuchas/ratings/comentarios/listas.

## 3. API REST

- [x] 3.1 Añadir el código `COLLECTION_ENTRY_NOT_FOUND` (404) al manejo de errores y su
  mensaje localizado; actualizar `docs/04-api/errors.md` y el catálogo de mensajes.
- [x] 3.2 `src/app/api/me/collection/route.ts`: `POST` (crear, `201`) y `GET` (lista propia
  paginada con query `format`/`attribute`), con `with-error-handling`, Zod de entrada y de
  salida, `AUTH_REQUIRED` sin sesión.
- [x] 3.3 `src/app/api/me/collection/[entryId]/route.ts`: `PATCH` (edición parcial) y
  `DELETE` (`204`), con `await params`, validación Zod y `COLLECTION_ENTRY_NOT_FOUND`.
- [x] 3.4 `src/app/api/users/[username]/collection/route.ts`: `GET` público paginado, filtrado
  por visibilidad; lista vacía sin permiso; `USER_NOT_FOUND` si el `username` no existe.
- [x] 3.5 Tests de ruta para los tres endpoints (auth, validación, paginación inválida →
  `VALIDATION_ERROR`, visibilidad, `404` de álbum y de entrada).
- [x] 3.6 Actualizar `docs/04-api/contracts.md` con los nuevos endpoints, cuerpos y ejemplos.

## 4. UI — acción en la página de álbum

- [x] 4.1 Cargar en el Server Component de la página de álbum las entradas propias del usuario
  autenticado para ese `release_group` (`listOwnEntriesForReleaseGroup`).
- [x] 4.2 Crear el Client Component de la acción "Agregar a la colección" en
  `src/components/catalog/`: selector de formato obligatorio, selector opcional de atributos
  (del vocabulario), nota opcional (<=140), con estados de carga/éxito/error/sesión requerida.
- [x] 4.3 Mostrar las copias propias ya registradas para el álbum, cada una con acción de
  quitar; usar TanStack Query vía `src/lib/api/client.ts` y validar respuestas con Zod.
- [x] 4.4 Asegurar que la acción no bloquea la carga del contenido musical y es accesible
  (foco, `aria-live` en la confirmación).
- [x] 4.5 Tests de componente: sin sesión, alta con formato, alta con atributos+nota, quitar
  una copia, error de API mapeado por `code`.

## 5. UI — página propia `/me/collection`

- [x] 5.1 Crear la ruta `/me/collection` (Server Component) que lista la colección propia
  paginada en formato de lista (álbum, artista, formato, atributos como chips, nota).
- [x] 5.2 Añadir filtros por formato y por atributo (query params, sin recargar de más;
  progresivo con TanStack Query si aplica).
- [x] 5.3 Estado vacío localizado y estado de error no técnico.
- [x] 5.4 Enlace de navegación autenticada a `/me/collection` junto a favoritos/listas.
- [x] 5.5 Tests de la página: render con entradas, filtros, estado vacío, paginación.

## 6. UI — sección en el perfil de usuario

- [x] 6.1 Añadir la sección "Colección" al perfil público (`/users/[username]`), paginada,
  respetando la audiencia por entrada y los bloqueos.
- [x] 6.2 No revelar existencia de colección cuando el visitante no tiene permiso (sección
  ausente o vacía, según el patrón de favoritos/listas en el perfil).
- [x] 6.3 Tests: perfil público, seguidor aprobado, perfil privado sin relación, bloqueo,
  `username` inexistente.

## 7. i18n

- [x] 7.1 Añadir mensajes es/en para la acción de álbum, `/me/collection`, la sección de
  perfil, los nombres de formato y de atributos, y el nuevo código de error.
- [x] 7.2 Verificar que no quedan textos hardcodeados y que `i18n-messages` valida.

## 8. Documentación y cierre

- [x] 8.1 Crear `docs/05-features/physical-collection.md` (modelo, vocabulario congelado,
  superficies, audiencias, Non-Goals) y enlazarlo desde `docs/05-features/README.md`.
- [x] 8.2 Actualizar `docs/01-domain/domain-model.md` con la entidad Colección física.
- [x] 8.3 Actualizar `docs/02-architecture/data-classification.md` con `collection_entry`.
- [x] 8.4 Actualizar `docs/00-product/roadmap.md` (incremento dentro de Fase 5) y añadir
  `docs/00-product/product_philosophy.md` §6.6 con la decisión (entidad dedicada + grano por
  copia + vocabulario cerrado + feed fuera de alcance).
- [x] 8.5 Ejecutar `pnpm typecheck`, `pnpm lint`, `pnpm test` y `pnpm build`; dejar todo verde.
- [x] 8.6 `openspec validate add-physical-collection --strict` sin errores.
