## 1. Servicio y API

- [x] 1.1 Esquemas Zod en `src/lib/api/schemas.ts`: `MyRatingsFiltersSchema` (`sort` `best|worst|recent|title` con `best` por defecto, `stars` ½–5 en pasos de ½, `type` `release-group|recording`, `year` entero, `decade` entero múltiplo de 10) y el tipo de respuesta (filas, `total`, `hasNext`, `facets.years`) — design D2, D5
- [x] 1.2 `src/services/ratings/my-ratings.ts` (`listMyRatings(userId, page, pageSize, filters)`): una consulta sobre `rating` del usuario con `artist_id IS NULL`, joins a `release_group` / `recording`, artista con `PRIMARY_ARTIST_SQL`, carátula de canción con `RECORDING_COVER_SQL`, año de canción como el menor `first_release_year` de sus álbumes (D3), filtros, orden `best`/`worst`/`recent`/`title` con `detailed_score ... nulls last` y desempate por `updated_at desc, id` (D4), `total` y años disponibles
- [x] 1.3 Tests del servicio (`my-ratings.test.ts`): solo filas del usuario, sin filas de artista, cada orden (incluidos los sin puntaje después en ambos sentidos), cada filtro y sus combinaciones, año de canción (menor año; sin año queda fuera de año y década), año manda sobre década, facetas, paginación y `hasNext`
- [x] 1.4 `GET /api/me/ratings` (`src/app/api/me/ratings/route.ts`, con `withErrorHandling`, `requireUser`, `parsePagination` y los filtros validados; `400 VALIDATION_ERROR` si son inválidos; sin parámetro de usuario — D1) y su test (`401` sin sesión, `400`, filtros, sin fuga de otros usuarios)
- [x] 1.5 `docs/04-api/contracts.md`: documentar `GET /api/me/ratings` (parámetros, respuesta, errores) y que es solo del dueño

## 2. Página y lista

- [x] 2.1 `src/app/[locale]/me/ratings/page.tsx` (`requirePageUser`, carga inicial con los parámetros de la query validados e ignorando los inválidos — D6) y mensajes `messages/{es,en}/ratings.json` registrados en el proveedor de i18n
- [x] 2.2 `src/components/ratings/MyRatingsList.tsx`: lista cliente con "cargar más", barra de herramientas (orden, estrellas, tipo, año con las facetas, década deshabilitada con año), estado reflejado en la query string con `history.replaceState`, "Limpiar filtros" y estados vacíos (sin valoraciones / sin resultados) — D6, D9
- [x] 2.3 `src/components/ratings/MyRatingRow.tsx`: carátula (`CoverThumb`), título y artista enlazados (`catalog-links`), tipo, año, `StarRatingValue` con `showScore`, `StarRatingInput` compacto y botón del puntaje con la marca "Sin afinar" (D8, D9)
- [x] 2.4 Edición en la fila (D7): cambiar estrellas con la regla de puntaje coherente y aviso accesible (`isScoreCoherent`), `RatingDetailDialog` por fila (afinar, destacar, borrar), actualización local sin reordenar, borrar quita la fila y baja el total
- [x] 2.5 Tests de `MyRatingsList` / `MyRatingRow`: render con y sin puntaje, filtros y orden (llaman al API con los parámetros esperados), "Limpiar filtros", cambio de estrellas con puntaje coherente e incoherente (aviso), diálogo, borrado, marca "Sin afinar" como acción, vacíos

## 3. Accesos

- [x] 3.1 `user-menu-items.ts`: añadir `ratings` (grupo `library`, `header` y `panel`, después de favoritos), etiqueta `ratings` en `messages/{es,en}/common.json` y actualizar `user-menu-items.test.ts` y los tests del Header que enumeran los accesos
- [x] 3.2 Perfil propio: localizar el componente de gestión del dueño (junto a `OwnerProfileBar` / accesos del dueño) y añadir el enlace "Mis valoraciones" solo para el dueño; test de que un visitante no lo ve — D10

## 4. Tooltip de la discografía

- [x] 4.1 `ArtistDiscography.tsx` (`DiscMarksView`): con puntaje, `title` y texto accesible usan el mensaje nuevo `yourStarsScore` ("Tu nota: 4,5 · 86/100"); sin puntaje siguen con `yourStars`; lo visible no cambia (`★ 4,5`). Mensajes es/en y test (con y sin puntaje) — D11

## 5. Documentación

- [x] 5.1 `docs/05-features/ratings-and-reviews.md`: sección "Mis valoraciones" (propósito, orden con los sin puntaje después, filtros, marca "Sin afinar", edición en la fila, privacidad) y la excepción del tooltip
- [x] 5.2 `docs/05-features/user-profile.md` (enlace del dueño) y `docs/05-features/catalog-browsing.md` (tooltip de la discografía)

## 6. Verificación

- [x] 6.1 `pnpm run typecheck && pnpm run lint && pnpm test && pnpm run build`
- [x] 6.2 `EXPLAIN` de la consulta del listado con un usuario con muchas valoraciones (o fixtures sintéticos en una BD de scratch) para confirmar que usa `idx_rating_user` y no degrada; si pesa, resolver artista/carátula/año de canciones por lote
- [x] 6.3 Navegador (escritorio y móvil): `/me/ratings` con álbumes y canciones; orden por mejor nota con desempate por puntaje y los sin puntaje después; filtros (año = top del año, estrellas, tipo, década); cambiar estrellas con puntaje coherente e incoherente; afinar desde "Sin afinar"; borrar; accesos del menú y del perfil propio; tooltip de la discografía; un visitante no ve el enlace del perfil ni puede abrir `/me/ratings`
- [x] 6.4 Limpiar los datos de prueba creados en la BD de desarrollo
