## 1. Esquema

- [x] 1.1 Crear `drizzle/0098_list_theme.sql`: `theme` con `CHECK (theme IS NULL OR theme IN (...10 valores))`, `subject_artist_id` y `subject_genre_id` con FK `ON DELETE SET NULL`, `CHECK (num_nonnulls(subject_artist_id, subject_genre_id) <= 1)`, índice parcial `(theme, created_at DESC) WHERE theme IS NOT NULL` e índices parciales por cada `subject_*`; sin backfill
- [x] 1.2 Espejar en `src/db/schema.ts` (columnas, checks, índices) y documentar en `docs/03-data/sql-model.md`
- [x] 1.3 Agregar `LIST_THEMES` (orden de presentación) y `ListTheme` en `src/services/lists/types.ts`, con un test que compare la constante con el `CHECK` de la migración
- [x] 1.4 Aplicar la migración en la BD de scratch y verificar que las listas existentes quedan con `theme = NULL`

## 2. Servicio y API

- [x] 2.1 `createList` y `updateList` aceptan `theme` y el "sobre"; validan que el artista o género exista; al editar, fijar uno limpia el otro; `theme: null` en una edición es error de validación
- [x] 2.2 `UserListSummary` expone `theme` y `subject` (`{type,id,name,slug?}` o `null`) con `LEFT JOIN` en las consultas de resumen y detalle (propias, públicas, comunidad, guardadas, vista previa), con el nombre del género localizado
- [x] 2.3 `CreateListRequestSchema` exige `theme`; `UpdateListRequestSchema` lo acepta sin `null`; ambos aceptan `subjectArtistId`/`subjectGenreId` y rechazan los dos con valor; tipos de respuesta actualizados en `src/lib/api/schemas.ts` y `src/lib/api/lists.ts`
- [x] 2.4 `parseListFilters` y `GET /api/lists/discover` aceptan `theme` (ignorado si no es válido) y filtran en el servidor; `/me/lists` acepta además `theme=none`
- [x] 2.5 `listMyLists` devuelve `unthemedCount`
- [x] 2.6 Tests de servicio y de rutas: tema requerido, fuera del vocabulario, "sobre" doble, "sobre" inexistente, cambiar tema, quitar "sobre", `theme: null` rechazado, filtro por tema, `theme` inválido ignorado
- [x] 2.7 Actualizar `docs/04-api/contracts.md` (crear, editar, respuesta de lista, discover) y `errors.md` si aparece un código nuevo

## 3. Altas del sistema

- [x] 3.1 Camino (`camino.ts`) nace con `start_here`
- [x] 3.2 Recorrido de artista (`artist-journeys.ts`) nace con `start_here` y `subject_artist_id` = su artista
- [x] 3.3 Top N (`laminas.ts`) y tier list (`tiers.ts`) nacen con `personal_ranking`
- [x] 3.4 Tests de cada alta; colecciones generadas y borradores editoriales siguen sin tema (test que lo fije)

## 4. Interfaz

- [x] 4.1 `ListThemeChip` + `LIST_THEME_TONES` con los tonos en tokens del sistema; medir el contraste AA de los 10 chips (tokens nuevos documentados en `design-tokens-naming.md` si hacen falta)
- [x] 4.2 Selector de "sobre" (`ListSubjectPicker`): segmentado Artista · Género, artistas con `useTargetSearch("artist")`, géneros con `GET /api/genres/search` (que suma `id` a su respuesta, aditivo), quitar con ×
- [x] 4.3 `ListForm`: cuadrícula de temas (radio, nombre + descripción, sin preselección, 2 columnas en teléfono / 3 desde `sm`) y "sobre" opcional; Crear deshabilitado sin título o sin tema
- [x] 4.4 `NewListPanel`: chips compactos de tema (44 px, sin preselección, sin "sobre")
- [x] 4.5 `ListMetaForm`: editar tema (sin opción de quitarlo) y "sobre"
- [x] 4.6 Chip y "sobre <nombre>" enlazado en `ListRow`, `ListPreview`, `ListDetailHeader` y las tarjetas y filas de `/me/lists`; sin chip para listas sin tema en superficies públicas
- [x] 4.7 Selector "Tema" en `CommunityListsToolbar` (`?theme=`), con el reparto de filas de la spec (en fila desde `lg`, fila propia debajo de los segmentos por debajo) y 44 px de alto
- [x] 4.8 Aviso de clasificación en `/me/lists` (`unthemedCount`, hasta 5 listas con chips de tema, `PATCH` por toque; "Ver todas" amplía el aviso a 50 en el lugar, con `GET /api/me/lists?theme=none`)
- [x] 4.9 Mensajes `messages/{es,en}` (nombres y descripciones de los 10 temas, "sobre", selector, aviso) y `pnpm run i18n:client-messages`
- [x] 4.10 Tests de componentes: formulario sin tema no envía, chip y "sobre" en la fila, filtro de tema en la URL, aviso que desaparece

## 5. Documentación

- [x] 5.1 `docs/05-features/lists-and-favorites.md`: tema y "sobre", vocabulario, altas del sistema, plan de 3 fases y decisiones D1–D6; sacar "Temas / etiquetas" del backlog
- [x] 5.2 `docs/01-domain/domain-model.md` y `business-rules.md`: tema obligatorio al crear, uno por lista, "sobre" a lo sumo uno
- [x] 5.3 Ayuda (`messages/{es,en}/info.json`, línea "Listas: …"): mencionar que cada lista elige un tema; actualizar la fecha en `src/lib/info-pages.ts`
- [ ] 5.4 Agregar `## Purpose` a la spec nueva `list-themes` al archivar

## 6. Verificación

- [x] 6.1 `pnpm run typecheck && pnpm run lint && pnpm test && pnpm run build`
- [x] 6.2 `pnpm run verify` sobre el árbol final
- [x] 6.3 Recorrido en el navegador a 390, 1024 y 1440: crear lista con tema y "sobre", editarla, clasificar desde `/me/lists`, filtrar `/lists` por tema, chip en fila, vista previa y detalle
