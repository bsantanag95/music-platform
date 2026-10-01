## 1. Derivación y API

- [x] 1.1 `src/lib/rating-range.ts`: añadir `starsFromScore(score) = ⌈score / 10⌉ / 2` y una prueba de ida y vuelta (para todo `score` de 1 a 100, `isScoreCoherent(starsFromScore(score), score)`; extremos 10, 11, 90, 100) — design D3
- [x] 1.2 `src/services/social.ts`: `validateRating` y `upsertRating` usan `scoreRange` / `starsFromScore` del módulo en lugar de repetir la fórmula; con `detailedScore` y sin `stars` se derivan las estrellas; con ambos se valida coherencia (`INVALID_RATING`) como hoy
- [x] 1.3 `src/lib/api/schemas.ts`: `RatingRequestSchema` / `RatingMutationSchema` aceptan `stars` y `detailedScore` ambos opcionales con al menos uno (si no, `VALIDATION_ERROR`); `detailedScore` entero de 1 a 100
- [x] 1.4 `src/lib/api/social.ts` (`saveRating`) y la ruta `src/app/api/catalog/[target]/[id]/ratings/route.ts`: aceptar cuerpo sin `stars`; tests de la ruta y del servicio: solo puntaje crea la valoración con estrellas derivadas, solo puntaje sobre una valoración existente la reemplaza, cuerpo vacío → `400 VALIDATION_ERROR`, `{ stars }` sigue dejando el puntaje en nulo, `{ stars, detailedScore }` incoherente → `INVALID_RATING`
- [x] 1.5 `docs/04-api/contracts.md` (`PUT /ratings`): documentar `{ stars?, detailedScore? }` con la derivación y los errores; mantener `averageDetailedScore` en el `GET` (design D9)

## 2. Diálogo de puntaje y paneles

- [x] 2.1 `RatingDetailDialog.tsx`: `own` pasa a ser opcional; el campo acepta 1–100 sin banda; equivalencia en vivo ("86 → 4,5★") y, si las estrellas vigentes difieren, aviso accesible ("cambia tus estrellas de 4★ a 4,5★", `aria-live` educado); guardar envía solo `{ detailedScore }`; "Destacar" y "Borrar nota" solo con valoración (design D5)
- [x] 2.2 `AlbumRelationPanel.tsx` y `SongRelationPanel.tsx`: la acción del puntaje siempre habilitada (se elimina `detailNeedsStars`), "+" sin valoración y `86/100` con ella; al guardar se aplican las estrellas que devuelve el servidor (`applyRatings`)
- [x] 2.3 Mensajes en `messages/{es,en}/catalog.json`: equivalencia, aviso de cambio de estrellas, sin banda en el `hint`; retirar `detailNeedsStars` y claves huérfanas
- [x] 2.4 Tests del diálogo y de los dos paneles: puntuar sin estrellas previas, puntaje que cambia las estrellas (con aviso), valor fuera de 1–100 no guarda, sin valoración no hay "Destacar"/"Borrar", el aviso de puntaje descartado al cambiar estrellas sigue funcionando

## 3. Presentación del número

- [x] 3.1 `StarRatingValue.tsx`: `showScore` (por defecto `false`); con puntaje y `showScore` muestra `86/100` en lugar de `4,5`; sin él muestra `4,5`; número en tono neutro con `font-medium` (sin ámbar ni color por valor); etiqueta accesible con el puntaje solo cuando se muestra — design D6, D8
- [x] 3.2 `FeedActivityList.tsx`: la fila no pasa el puntaje; `ratingGroupValue` y la etiqueta (`ratingLabel`) dejan de incluir `· score`; retirar `ratingMeterLabelScore` si queda sin uso
- [x] 3.3 `RatingHighlights.tsx`: pasa `showScore` (`86/100` o `4,5`); `ProfileReviews.tsx`: sin puntaje (`4,5`); ajustar las etiquetas de `users.json` (`ratingLabelScore` solo para destacadas)
- [x] 3.4 `ReviewArticle.tsx` (y el modal de reseña): mostrar `86/100` junto a las estrellas solo cuando quien mira es el autor y la reseña tiene puntaje
- [x] 3.5 Tests: `StarRatingValue` (4 casos), feed (sin puntaje en fila ni corrida), destacadas (con y sin puntaje), reseñas del perfil (sin puntaje), artículo propio vs ajeno, y que ningún número coloreado difiere por valor

## 4. Comunidad y orden propio

- [x] 4.1 `AlbumHeader.tsx`: quitar `detailedValue` del detalle de la tarjeta de media y del resumen móvil; la API sigue devolviendo `averageDetailedScore` — design D9; tests de `AlbumHeader` actualizados
- [x] 4.2 `ArtistDiscography.tsx`: el orden "Tú" desempata por puntaje detallado propio (`marks.detailedScores`) antes que por título; función pura con test (4★ con 78, 72 y sin puntaje; 4,5★ primero; ascendente y descendente; sin valor al final) — design D10
- [x] 4.3 Inventario: listar con `grep` cualquier otro orden por nota propia (colección, Pendiente, listas, perfil) y aplicar el mismo desempate solo si ordena lo propio; si no hay ninguno, dejar anotado

## 5. Documentación

- [x] 5.1 `docs/01-domain/business-rules.md` y `domain-model.md`: la valoración detallada es un refinamiento opcional; bandas; derivación; entrada en cualquier orden
- [x] 5.2 `docs/05-features/ratings-and-reviews.md`: formato `86/100`, dónde se muestra y dónde no, sin color, sin promedio de comunidad; corregir `4,5 · 87` en `activity-feed.md` y `user-profile.md` si aparece
- [x] 5.3 `docs/00-product` (PRD/visión): alinear la redacción de "valoración dual" con el papel de refinamiento

## 6. Verificación

- [x] 6.1 `pnpm run typecheck && pnpm run lint && pnpm test && pnpm run build`
- [x] 6.2 En el navegador (escritorio y móvil): puntuar con número en un álbum y una canción sin valorar (las estrellas se derivan); puntuar 86 sobre 4★ y ver el aviso; el panel, la reseña propia y una destacada muestran `86/100`; el feed y las reseñas del perfil muestran estrellas + `4,5` sin puntaje; el bloque de comunidad no muestra cifra `/100`; el orden "Tú" de una discografía desempata por puntaje
- [x] 6.3 Limpiar los datos de prueba creados en la BD de desarrollo
