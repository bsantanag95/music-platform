## 1. Base de datos

- [x] 1.1 Crear `drizzle/0065_comment_topic.sql` (comprobar antes que `0065` siga libre): `ADD COLUMN topic TEXT`; `UPDATE comment SET topic = 'general' WHERE artist_id IS NOT NULL`; después los `CHECK` `chk_comment_topic_values`, `chk_comment_topic_artist_only` y `chk_comment_artist_topic_required`; índice parcial `idx_comment_artist_topic (artist_id, topic, created_at DESC) WHERE artist_id IS NOT NULL`
- [x] 1.2 Reflejar `topic` y los tres `CHECK` en `comment` de `src/db/schema.ts` y exportar la constante `COMMENT_TOPICS` con su tipo
- [x] 1.3 Actualizar `docs/03-data/sql-model.md` (sección `comment`: columna, restricciones, relleno)

## 2. Servicio y API

- [x] 2.1 `src/lib/api/schemas.ts`: `CommentTopicSchema` desde `COMMENT_TOPICS`; `topic` opcional en `CommentRequestSchema`; `topic: CommentTopic | null` en `CommentSchema`; actualizar los schemas de feed que llevan un comentario
- [x] 2.2 `src/services/social.ts`: `createComment` valida el tema según el objetivo (`INVALID_TOPIC` en álbum/canción o valor inválido; `general` por defecto en artista); `listComments` acepta `topic` y rechaza el filtro en álbum/canción; `serializeComment` devuelve `topic`; `updateComment` no toca el tema
- [x] 2.3 `src/app/api/catalog/[target]/[id]/comments/route.ts`: leer `topic` del query en `GET` y del body en `POST`
- [x] 2.4 `src/lib/api/social.ts`: `getComments` y `createComment` aceptan `topic`
- [x] 2.5 Registrar el código `INVALID_TOPIC` en `docs/04-api/errors.md` y en `messages/{es,en}` (`errors.INVALID_TOPIC`)
- [x] 2.6 Actualizar `docs/04-api/contracts.md` (`GET/POST /api/catalog/{target}/{id}/comments`: `topic`, `INVALID_TOPIC`; forma del comentario de feed)
- [x] 2.7 Pruebas del servicio y de la ruta: tema por defecto, tema inválido, tema en álbum, filtro, paginación con filtro, el tema no cambia al editar

## 3. Superficies que muestran el comentario

- [x] 3.1 `src/services/feed/feed.ts` y `src/services/activity/community-activity.ts`: incluir `topic` en las entradas de comentario de artista
- [x] 3.2 `src/services/home/home.ts`: incluir `topic` en "Comentarios populares" de artista
- [x] 3.3 `src/services/profiles/data-export.ts`: incluir `topic` en la exportación de comentarios
- [x] 3.4 Mostrar la etiqueta de tema en el render del feed, de la actividad de comunidad y de `PopularComments`; pruebas de componente

## 4. Interfaz

- [x] 4.1 `src/components/social/Comments.tsx`: quitar `variant`; añadir `topics?: boolean`; chips Todos + temas con filtro en servidor (reemplaza la lista, reinicia paginación), selector de tema en el formulario (arranca en `general` o en el chip activo), etiqueta de tema en cada comentario, estado vacío por tema
- [x] 4.2 `src/app/[locale]/(catalog)/artist/[id]/(tabs)/layout.tsx`: pasar `topics` y dejar de pasar `variant="notes"`
- [x] 4.3 `messages/{es,en}/catalog.json`: añadir los textos de temas, chips, selector y vacíos; eliminar `notesHeading`, `notesIntro`, `notesLabel`, `notesSubmit`, `noNotes`, `loginToNote`
- [x] 4.4 Pruebas de `Comments` (chips, selector preseleccionado, filtro, álbum/canción sin cambios, accesibilidad de los chips)

## 5. Documentación

- [x] 5.1 `docs/05-features/catalog-browsing.md` (la línea de "notas de la comunidad" pasa a describir Comentarios con temas)
- [x] 5.2 `docs/05-features/activity-feed.md` y `docs/05-features/home.md` (etiqueta de tema)
- [x] 5.3 Revisar menciones residuales de "notas de la comunidad" en `openspec/specs/` (el `Purpose` de `artist-page-layout` y el escenario "La discografía va primero" de `catalog-artist`) y en `docs/`

## 6. Verificación

- [x] 6.1 Smoke test `scripts/smoke-test-artist-comment-topics.ts` contra BD de scratch (`ALLOW_SMOKE_ON_REAL_DB=1`): migración con relleno, `CHECK`, filtro y paginación, tema por defecto, rechazos; borra sus fixtures (usuarios `smoke_topic_*`, artista sintético `5e0ce000-…`); documentar su limpieza en `AGENTS.md`
- [x] 6.2 `pnpm run typecheck && pnpm run lint && pnpm test && pnpm run build`
- [x] 6.3 Probar en el navegador la página de artista (escritorio y móvil) y la de álbum/canción sin cambios
