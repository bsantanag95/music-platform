## 1. Servicios de lectura de canción

- [ ] 1.1 `src/services/catalog/recording-reactions.ts` — `getRecordingReactionSummary(recordingId)`: `GROUP BY reaction` sobre `listen_entry` con `audience = 'public'` y `reaction IS NOT NULL`; devuelve `{ total, byReaction: Record<ListenReaction, number>, top: ListenReaction | null }` (`null`/`total: 0` cuando no hay). No importa nada del diario personal
- [ ] 1.2 `src/services/diary/diary.ts` — `listMyListensForRecording(userId, recordingId)`: entradas propias con ese `recording_id`, orden fecha desc, con `listenContext` / `reaction` / `audience` / `body` / `createdAt`
- [ ] 1.3 Tests: `recording-reactions.test.ts` (agrega solo públicas, ignora private/followers y reacción null, `top` = la de mayor conteo, vacío → total 0); `diary.test.ts` caso nuevo para `listMyListensForRecording`

## 2. Zod

- [ ] 2.1 `src/lib/api/schemas.ts`: `RecordingReactionSummarySchema` (`{ total, byReaction, top: ReactionSchema.nullable() }`), `RecordingListenHistoryEntrySchema` / `RecordingListenHistorySchema`
- [ ] 2.2 Reusar `ListenReaction` / `LISTEN_REACTIONS` existentes; no duplicar el enum

## 3. Componentes de canción

- [ ] 3.1 `src/components/catalog/SongAlbums.tsx` (server): tarjetas de los release-groups contenedores (carátula + título + año, enlace `/album/{id}`), ordenadas por `first_release_date`, marca "aparición principal" en el primero; recibe las apariciones ya resueltas
- [ ] 3.2 `src/components/catalog/SongReactionSummary.tsx` (server): línea de tono cultural ("N personas la registraron · sobre todo **{top}**"), sin porcentajes ni gráfico; no renderiza si `total === 0`
- [ ] 3.3 `src/components/catalog/SongListenHistory.tsx` (server): lista compacta fecha + contexto + reacción propia + enlace a `/me/diary`; no renderiza sin entradas
- [ ] 3.4 `src/components/social/SongStarDisclosure.tsx` (client): `<details>` colapsado ("Añadir una valoración de estrellas"), abierto si ya hay estrellas; reusa la lógica de guardar/borrar rating de `recording` de `DualRating` (extraer a un hook o componente compartido, sin duplicar llamadas API)
- [ ] 3.5 `src/components/catalog/SongTechnicalDetails.tsx` (server): créditos + apariciones completas dentro de `<details>` (OQ1: plegado por defecto)

## 4. Página de canción

- [ ] 4.1 Reescribir `src/app/[locale]/(catalog)/song/[id]/page.tsx` con el orden de D2: breadcrumbs → encabezado (título + artista, variante como metadato pequeño) → `SongAlbums` → acciones (`MarkAsListened` / `FavoriteButton` / `AddToListButton`) → `SongListenHistory` → `SongReactionSummary` → `Comments` (recording) → `SongStarDisclosure` → `SongTechnicalDetails`
- [ ] 4.2 Quitar `SocialSection` completo de la canción; montar `Comments` directo (o `SocialSection mode="notes"` si se decide compartir). `getRatings` de canción solo para hidratar `SongStarDisclosure`
- [ ] 4.3 Cargar en paralelo: `getRecordingDetail`, `getRecordingReactionSummary`, `listMyListensForRecording` (si hay sesión), `getRatings`, `listComments`
- [ ] 4.4 i18n `catalog.json` (`song.*`): `containingAlbumsHeading`, `mainAppearance`, `reactionSummary` (ICU con `{count}` y `{top}`), `yourHistoryHeading`, `starsDisclosure`, `technicalDetailsHeading`

## 5. Página de artista

- [ ] 5.1 Reordenar `src/app/[locale]/(catalog)/artist/[id]/page.tsx`: `ArtistHeader` → `AlbumGrid` (discografía) → acciones → `ArtistMemberships` → notas de la comunidad
- [ ] 5.2 `SocialSection`: añadir prop `mode?: "full" | "notes"` (default `"full"`); en `"notes"` no renderiza `DualRating` ni `Reviews`, solo `Comments`. La página de artista pasa `mode="notes"`. Alternativa: montar `Comments` directo en artista y dejar `SocialSection` sin cambio — elegir en la implementación lo de menor superficie
- [ ] 5.3 No pasar/of computar `getRatings` para el artista si ya no se muestra (evitar consulta muerta); mantener `listComments`
- [ ] 5.4 i18n `catalog.json` (`artist.*`): `notesHeading`, `notesPlaceholder`, `notesIntro` ("empezá por aquí")

## 6. Composición, regresión y verificación

- [ ] 6.1 Tests de la página de canción (o de sus secciones): álbum contenedor primero; sin editor de reseña/rating primario; `SongStarDisclosure` abierto solo con estrellas previas; historial oculto sin sesión; resumen de reacción oculto sin públicas
- [ ] 6.2 Tests de la página de artista: discografía antes que membresías y que notas; sin `DualRating`; `Comments` presente
- [ ] 6.3 Confirmar sin regresión en la página de **álbum** (estrellas + reseña siguen primarias) y en `MarkAsListened` / diario / feed
- [ ] 6.4 Verificación en el navegador: canción con álbum + reacciones públicas + historial propio; canción sin nada de eso (secciones ausentes); artista con discografía arriba y notas sin estrellas; consola sin errores

## 7. Docs

- [ ] 7.1 `docs/05-features/` — página de canción mínima (qué muestra y qué no), reacción vs estrellas, reacción agregada pública; página de artista discografía-forward y notas sin rating
- [ ] 7.2 Nota en la doc de datos: `rating` sigue aceptando artista/canción; el cambio es de presentación, los datos viejos se conservan

## 8. Cierre

- [ ] 8.1 `openspec validate rebalance-catalog-detail-pages --strict` pasa
- [ ] 8.2 `typecheck`, `lint`, `test`, `build` en verde
- [ ] 8.3 Archivar el cambio y sincronizar specs cuando esté implementado y aprobado
