## 1. Esquema y migraciones

- [x] 1.1 Confirmar dónde vive hoy la especificación/servicio de la valoración suelta
      (`rating`, fuera de `album-review`) antes de diseñar `rating_highlight` — resolver la
      pregunta abierta de `design.md`. Resuelto: `src/services/social.ts` (`upsertRating`);
      la tabla `rating` (schema.ts:430) no tiene columna de audiencia propia, confirma
      `taste-fingerprint`.
- [x] 1.2 Migración: marcador "me define". Primer intento (`drizzle/0029_profile_highlights.sql`):
      booleano `is_defining` sobre `user_pinned_item` ("Destacados"), con índices únicos
      parciales por tipo. **Revisado en uso real** (ver design.md, Decisión 1): dejaba
      "Álbumes favoritos" sin forma de marcar un definitorio salvo duplicando la entidad como
      destacado — `drizzle/0030_showcase_defining_entities.sql` mueve el marcador a
      referencias directas `user_showcase.defining_artist_id`/`defining_release_group_id`
      (mismo criterio que `anthem_recording_id`) y elimina `is_defining` de
      `user_pinned_item`
- [x] 1.3 Migración: tabla `rating_highlight` (`rating_id` FK, `position`, `created_at`),
      sin tocar `rating.updated_at` — `drizzle/0029_profile_highlights.sql` + `schema.ts`
      (`ratingHighlight`)
- [x] 1.4 Migración: tabla `listen_entry_highlight` (`listen_entry_id` FK, `position`,
      `created_at`), sin tocar `listen_entry.updated_at` — `drizzle/0029_profile_highlights.sql`
      + `schema.ts` (`listenEntryHighlight`)
- [x] 1.5 Cambiar el default de `favorite.audience` a `public` en el camino de creación
      (servicio, no columna de base de datos) — confirmar que no afecta filas existentes.
      `toggleFavorite`'s default param en `favorites.ts` (ver 2.8)

## 2. Servicios

- [x] 2.1 `services/profiles/showcase.ts`: marcar/desmarcar un artista o álbum como
      definitorio, exclusivo por tipo — `setDefiningEntity`/`clearDefiningEntity` (revisado
      de `setDefiningPinnedItem`/`clearDefiningPinnedItem`, ver 1.2) + `identityCard` en
      `getShowcase`, ahora también consumible desde `OwnerAlbumFavoritesEditor`
- [x] 2.2 `services/profiles/showcase.ts`: resolver la carátula real del himno con la misma
      resolución de carátulas del catálogo, con fallback a disco — nuevo helper compartido
      `RECORDING_COVER_SQL` en `services/feed/feed.ts` (mismo criterio que
      `LIST_ITEM_SONG_COVER` de `lists.ts`)
- [x] 2.3 Nuevo servicio `rating-highlights`: fijar/desfijar una valoración propia, listar
      las valoraciones destacadas de un perfil, tope de 6. Nota: sin columna `position` —
      se ordena por `highlighted_at`, mismo patrón simple que `user_list_pin` (se corrigió
      el diseño de 1.3 de "posición 1..6" a esto, por consistencia con el precedente real
      del código y porque el spec describe fijar/quitar de a una, no un reemplazo del
      conjunto completo)
- [x] 2.4 `services/diary/diary.ts`: fijar/desfijar una entrada propia como destacada, tope
      de 6 — `highlightListenEntry`/`unhighlightListenEntry`, `isHighlighted` en `DiaryEntry`
- [x] 2.5 Servicio de visibilidad social: las entradas de diario y las valoraciones
      destacadas anulan la matriz de audiencia/relación al leerse desde el perfil —
      `listUserDiary` ahora hace OR contra `listenEntryHighlight`; las valoraciones
      destacadas nunca tuvieron una matriz general que anular (no hay endpoint de listado
      de valoraciones ajeno hoy), así que el servicio `rating-highlights` (2.3), que no
      filtra por audiencia, ya cumple esto
- [x] 2.6 `services/profiles/affinity.ts`: exponer, junto al bloque de afinidad, el
      subconjunto de artistas seguidos en común para que "Exploración" los marque sin un
      cálculo adicional. Sin cambios de código: `ProfileAffinity.sharedFollowedArtists` ya
      es exactamente ese subconjunto; el consumo queda para la UI (4.5)
- [x] 2.7 `services/profiles/stats.ts`: derivar el resumen cualitativo (hasta 3 frases) de
      la huella de gusto ya calculada — campo `summary` en `TasteFingerprint`
- [x] 2.8 `services/favorites/favorites.ts`: cambiar el default de audiencia de un favorito
      nuevo a `public`

## 3. API

- [x] 3.1 Endpoints de fijar/desfijar artista/álbum definitorio (extensión de la API existente
      de showcase), sin ruta dinámica por id de fila — `PUT/DELETE
      /api/me/profile/pinned/defining` con `{type, id}` en el body, porque opera sobre la
      entidad, no sobre una fila de destacado (ver 1.2)
- [x] 3.2 Endpoints de `rating-highlights` (crear/quitar/listar), con validación Zod y
      códigos de error (`VALIDATION_ERROR`, 404 propio) — `PUT/DELETE
      /api/me/rating-highlights/[ratingId]`, `GET /api/users/[username]/rating-highlights`.
      Nota: no hacen falta schemas Zod nuevos, ninguno de los tres lleva body (el id del
      recurso ya viaja en la URL)
- [x] 3.3 Endpoints de destacar/quitar destacado de entrada de diario, reutilizando el
      patrón de errores de `listen-diary` (`LISTEN_ENTRY_NOT_FOUND`) — `PUT/DELETE
      /api/me/diary/[id]/highlight`
- [x] 3.4 Verificar que las lecturas del perfil ajeno (`GET /api/users/[username]/...`)
      incorporan valoraciones y entradas destacadas sin exponer el resto según la matriz
      general — `listUserDiary` ya hace el OR contra destacadas; `getProfileRatingHighlights`
      nunca filtró por audiencia (por diseño, spec `rating-highlights`)

## 4. Composición del perfil (UI)

- [x] 4.1 `app/[locale]/users/[username]/page.tsx`: unificar el layout del dueño con el del
      visitante autorizado (misma composición de columnas). El caso `lockedOut` (privado sin
      acceso) se queda con su columna única propia — no hay contenido rico que componer ahí
- [x] 4.2 `sections.tsx`: recompuesto en Nivel 1 (Placa reducida + `IdentityCardSection`),
      Nivel 2 (Álbumes favoritos → Destacados generales → Valoraciones destacadas → Reseñas →
      En rotación → resumen de huella → Exploración) y Nivel 3 (rails existentes + enlace a
      huella completa vía `Level3LinksSection`)
- [x] 4.3 Nuevo componente `IdentityCard` (artista definitorio + álbum definitorio + himno),
      reutiliza `CoverThumb`/disco igual que el resto del showcase
- [x] 4.4 Nuevo componente `RatingHighlights` del perfil, reutiliza `FeedRatingMeter`
      (medidor VU existente) en vez de inventar un símbolo de estrella nuevo
- [x] 4.5 Insignia "tú también" en `ExploreSection`, alimentada por
      `sharedFollowedArtists` de la afinidad (`getProfileAffinity` ahora en `cache()` para no
      duplicar el cálculo entre `AffinitySection` y `ExplorationSection`)
- [x] 4.6 `FingerprintSummary` (texto, sin gráficos) en Nivel 1-2; los gráficos existentes
      (`TasteFingerprint`) se mudaron a la vista de Nivel 3
- [x] 4.7 Nueva ruta `/users/[username]/fingerprint` (Nivel 3) — no existía; "todas las
      valoraciones" se descartó del enlace de Nivel 3 (no hay superficie de listado de
      valoraciones en el producto, no corresponde a este change inventarla); diario/
      favoritos/listas/colección completos siguen siendo los rails existentes más abajo en
      la misma página (anclas `#diario`/`#favoritos`/`#listas`/`#coleccion`), no rutas nuevas

## 5. Dirección visual

- [x] 5.1 Tokens de `DESIGN.md` aplicados (ink/paper/amber/petrol, tríada tipográfica,
      radios 4–10px, sin sombras) — verificado en navegador contra datos reales, no solo en
      componentes aislados
- [x] 5.2 Tratamiento denso con divisores fue más allá de lo planeado: la Tarjeta de
      Identidad usa columnas con `divide-x`/`divide-y` (hairlines), mono para las etiquetas
- [x] 5.3 "Exploración" con avatares más grandes (`size-20`, antes `size-16`) e insignia
      ámbar "tú también" — único uso de ámbar en reposo fuera del medidor de valoraciones
- [x] 5.4 `impeccable detect --json` sobre los 11 archivos nuevos/cambiados de esta sección:
      **0 hallazgos**

## 6. Editores del dueño

- [x] 6.1 Editor de marcado "me define". Vive en `OwnerShowcaseEditor` (Destacados) y,
      tras la revisión de 1.2, también en `OwnerAlbumFavoritesEditor` (Álbumes favoritos) —
      un álbum marcado como favorito puede marcarse "me define" ahí mismo, sin duplicarlo
      como destacado
- [x] 6.2 Acción de destacar/quitar desde la superficie de valoraciones propias.
      Botón junto a Borrar en `DualRating.tsx` (todo tipo de objetivo, no solo álbum);
      `RatingSchema.isHighlighted` (opcional) poblado por `getRatings` vía un
      `ratingHighlight` lookup; wrappers en `lib/api/social.ts`
- [x] 6.3 Acción de destacar/quitar desde `/me/diary` (reutilizando el menú "···" ya
      existente por fila, ver `listen-diary`). Nuevo `RowMenuItem` en
      `DiaryActivityList.tsx`, mismo mecanismo de destello + anuncio `sr-only` que
      "Quiero volver a escuchar"; wrappers en `lib/api/diary.ts`

## 7. Pruebas

- [x] 7.1 Actualizar las pruebas de composición del perfil (`social-profiles`) que asumían
      el orden anterior de secciones. `page.test.tsx` reescrito: dueño y visitante comparten
      el mismo layout de 2 columnas; nueva prueba explícita de orden (Tarjeta de Identidad
      antes de Álbumes favoritos)
- [x] 7.2 Pruebas del marcador "me define" (exclusividad por tipo, Tarjeta de Identidad
      incompleta/vacía, independencia de destacados/favoritos). `showcase.test.ts`
      (`setDefiningEntity`/`clearDefiningEntity` contra `user_showcase`, resolución del
      artista/álbum definitorio en `getShowcase`) + `IdentityCard.test.tsx`
      (vacío/parcial/completo) + `OwnerShowcaseEditor.test.tsx` +
      `OwnerAlbumFavoritesEditor.test.tsx` (marcador también desde Álbumes favoritos) +
      `PinnedShowcase.test.tsx` (exclusión por coincidencia con la Tarjeta de Identidad,
      no por un campo propio del destacado)
- [x] 7.3 Pruebas de `rating-highlights` (tope de 6, idempotencia, visibilidad pública sin
      relación de seguimiento). `services/rating-highlights/rating-highlights.test.ts` (8
      pruebas) + `RatingHighlights.test.tsx` (componente) + `DualRating.test.tsx` (acción
      del dueño)
- [x] 7.4 Pruebas de destacar entradas de diario (idempotencia, anulación de la matriz de
      visibilidad, el bloqueo sigue ocultando). `diary.test.ts` (highlight/unhighlight,
      tope, SQL de `listUserDiary` incluye `listen_entry_highlight`) +
      `DiaryActivityList.test.tsx` (acción desde el menú "···")
- [x] 7.5 Pruebas del default de audiencia de favoritos (nuevo default, no retroactividad
      sobre filas existentes). `favorites.test.ts`
- [x] 7.6 Pruebas de la insignia de afinidad en "Exploración" (con/sin sesión, dueño propio,
      bloqueo). `ExploreSection.test.tsx` (`sharedArtistIds`) + `sections.test.tsx`
      (construcción del Set desde `getProfileAffinity`)
- [x] 7.7 Pruebas del resumen cualitativo de la huella de gusto (con/sin datos suficientes,
      respeto de audiencia). `stats.test.ts` (describe "summary") + `FingerprintSummary.test.tsx`

## 8. Documentación

- [x] 8.1 Actualizar `docs/05-features/user-profile.md` (o equivalente) con la nueva
      jerarquía de 3 niveles
- [x] 8.2 Actualizar la memoria del proyecto (`profile-redesign.md`) marcando las decisiones
      como implementadas
- [x] 8.3 Verificar `typecheck`, `lint`, `test` y `build` antes de considerar el change listo
      para archivar. Los cuatro en verde: 1723/1723 tests, 0 errores de tipos, mismos 4
      warnings de lint preexistentes (no relacionados), `next build` genera las 40 páginas +
      todas las rutas de API nuevas sin error
