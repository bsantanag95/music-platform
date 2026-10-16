## 1. Puntuación de popularidad

- [x] 1.1 `src/services/discovery/popularity.ts`: constantes de pesos y tope; unión de gestos por objetivo (álbum, canción, artista con atribución al artista principal) con usuario, tipo, peso y fecha; filtros de privacidad (cuentas activas, `audience <> 'private'`, listas no privadas, reseñas visibles)
- [x] 1.2 Agregación por persona y objetivo (tipos distintos, tope 4) y por objetivo (puntuación, personas, actividad más reciente), con orden y desempate; pruebas del SQL generado y de cada escenario de la capacidad `popularity`
- [x] 1.3 Ventana que se agranda (30 días → 90 → siempre con umbral 1) por tipo, con el escalón informado; caché de 15 minutos con `ttl-cache.ts`; pruebas
- [x] 1.4 Medir la consulta en scratch (las tres pestañas) y anotar la medida en el diseño

## 2. Explorar

- [x] 2.1 `getExplorePage`: `popular` (álbumes, artistas, canciones con su ventana y personas) en lugar de `mostReviewed`; retirar `listMostReviewed` y `MIN_REVIEWS_PER_ALBUM` si no quedan usos
- [x] 2.2 Componente `PopularNow`: pestañas accesibles (`tablist`, flechas, primera con resultado activa, sin JS la de álbumes), riel de álbumes y listas numeradas de artistas (foto o inicial) y canciones (carátula del disco y artista), cifra solo desde 5; pruebas de render
- [x] 2.3 `explore/page.tsx`: la sección va después de Colecciones; la navegación rápida cambia `mas-resenados` por `popular`; ajustar `explore-collections-pages.test.tsx` y `ExploreJumpNav.test.tsx`

## 3. Orden "Populares" de los listados

- [x] 3.1 `listAlbumsFiltered` con `sort: popular`: orden por la posición del disco en el ranking de popularidad de siempre (`allTimeAlbumRanking`, caché de 15 min, `array_position`), luego el orden "Destacados"; pruebas
- [x] 3.2 Etiqueta `sortPopular`: "Populares" / "Popular"

## 4. Colección mensual

- [x] 4.1 Plantilla `popular-month` (familia `rankings`, peso de comunidad, umbral de 2 personas, omisión sin discos) en lugar de `most-reviewed-month` en el registro; títulos es/en; `TEMPLATE_FAMILY`
- [x] 4.2 Presentador de `popular-month` (resumen del mes, numerado, "N personas" desde 5) y retiro del de `most-reviewed-month`; claves y mensajes es/en; pruebas del registro y de los mensajes
- [x] 4.3 Comprobar que una colección archivada de `most-reviewed-month` sigue mostrándose con su título y su familia

## 5. Verificación y documentación

- [x] 5.1 Ampliar `scripts/smoke-test-explore-collections.ts`: puntuación con gestos sintéticos (personas distintas, tope, privacidad, cuenta desactivada, ventana), orden "Populares" y `popular-month`
- [x] 5.2 Verificar en el navegador a 1280 y 375 px: pestañas, teclado, subtítulo de ventana, cifras, sin scroll horizontal
- [x] 5.3 `docs/01-domain/business-rules.md` (regla de popularidad), ADR 0041 (popularidad por personas distintas y ventana adaptable), `docs/05-features/explore.md`, nota del smoke en `AGENTS.md`
- [x] 5.4 `pnpm run typecheck && pnpm run lint && pnpm test && pnpm run build`; `openspec validate --specs --strict`
