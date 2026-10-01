## 1. Componente compartido

- [x] 1.1 Crear `src/components/social/StarRatingValue.tsx`: `StarRatingDisplay` + número (`4.5` / `4.5 · 87`) con la misma firma que `FeedRatingMeter` (`stars: string`, `detailedScore`, `label`), `role="img"` con la etiqueta y glifos decorativos (design D1, D2)
- [x] 1.2 Tests de `StarRatingValue`: número solo, número con puntaje, etiqueta accesible única, media estrella dibujada (3,5 → 3 llenas + 1 media + 1 vacía)
- [x] 1.3 Inventario final: listar con `grep` todos los puntos donde se muestra una nota (`FeedRatingMeter`, `"★"`, chips numéricos) y confirmar que cada uno queda cubierto por las tareas siguientes

## 2. Migrar el medidor de barras

- [x] 2.1 `FeedActivityList.tsx`: reemplazar las dos apariciones de `FeedRatingMeter` por `StarRatingValue` (fila de estrellas en la entrada y en el grupo), conservando `ratingMeterLabel*`
- [x] 2.2 `RatingHighlights.tsx` y `ProfileReviews.tsx`: reemplazar `FeedRatingMeter` por `StarRatingValue`
- [x] 2.3 Eliminar `src/components/feed/FeedRatingMeter.tsx` y su test; renombrar `ratingMeterLabel*` en `messages/{es,en}/feed.json` (y sus usos) si el nombre deja de tener sentido, o dejar un comentario si se conserva
- [x] 2.4 Actualizar los tests de feed, perfil y reseñas que dependían de la estructura de barras; las consultas por etiqueta accesible no deberían cambiar
- [x] 2.5 Revisar en el navegador el feed con varias filas de rating seguidas (incluido un grupo plegado) y confirmar que el ámbar sigue siendo la excepción (design D7)
  - Feedback del 2026-09-30: la corrida plegada mostraba `(5.0)` sin estrella y con punto. Corregido: forma compacta `★ 4,5` (estrella siempre) y número con `formatStars` (coma en español). También se formateó la etiqueta/número de feed, destacadas y reseñas del perfil. Tests actualizados; `typecheck`/`lint`/`test`/`build` en verde.

## 3. Estrellas como texto

- [x] 3.1 `ReviewIndex.tsx` (`Stars` local) y `ReviewArticle.tsx`: pasar a `StarRatingDisplay` con etiqueta accesible con el valor, en lugar de `"★".repeat` + `½`
- [x] 3.2 Confirmar que `PopularCommentsTabs`, `CompactActivityRow` y `DiscMarksView` (`★ 4,5`) se mantienen como forma compacta; unificar el formato del número con `formatStars` donde aún usen `Number()` sin locale
- [x] 3.3 Tests de `ReviewIndex` / `ReviewArticle` para la fila de estrellas con media estrella

## 4. Compositor de reseñas

- [x] 4.1 `ReviewComposer.tsx`: reemplazar los diez chips por `StarRatingInput` (`legend` `starsLabel`, `valueLabel` con `formatStars`), conservando `needsStars`, la pista `reviewStarsHint` y el guardado del valor
- [x] 4.2 Actualizar `ReviewComposer.test.tsx`: elegir estrellas con el control nuevo, no publicar sin valor, no pedir estrellas cuando ya hay rating
- [x] 4.3 Eliminar `src/components/social/DualRating.tsx` y `DualRating.test.tsx` (sin consumidores) y borrar las claves de `messages/{es,en}/catalog.json` que queden huérfanas

## 5. Documentación y verificación

- [x] 5.1 `docs/05-features/ratings-and-reviews.md`: sección de la regla de representación (estrellas, fila y compacta, un solo control)
- [x] 5.2 `docs/05-features/activity-feed.md` (sección "Rating — medidor tipo VU" y la mención de la exención del glifo), `user-profile.md` y `lists-and-favorites.md`: sustituir las referencias a `FeedRatingMeter` por la fila de estrellas; revisar `DESIGN.md` por si describe el medidor como lenguaje del rating
- [x] 5.3 `pnpm run typecheck && pnpm run lint && pnpm test && pnpm run build`
- [x] 5.4 Verificar en el navegador (escritorio y móvil): feed, perfil (destacadas y reseñas), índice y artículo de reseña, y el compositor con teclado y mitades de estrella
