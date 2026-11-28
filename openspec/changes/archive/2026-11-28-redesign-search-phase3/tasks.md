## 1. Reglas y lecturas

- [x] 1.1 `albumView(query, others)` puro (design D1): `grid` con ≥ 4 discos y la mitad o más con el título de la consulta; tests de ejemplo («the wall», «ok computer», < 4) y de propiedades (el resultado solo depende de los títulos; permutar la lista no lo cambia)
- [x] 1.2 `sameTitleAsQuery(title, query)` compartido (normalizado, sin artículo inicial) para la rejilla y las filas de canciones, con tests
- [x] 1.3 `findInAllOtherTypes(type, query)`: coincidencias locales en cada otro tipo de catálogo en paralelo (hasta 3 por tipo), `localOnly`, errores → sin ese tipo; tests de que no sale a MusicBrainz

## 2. Rejilla de Álbumes

- [x] 2.1 `AlbumGrid` (design D2): tarjetas con `ResultCover`, `AlbumQuickActions variant="cover"`, artista como titular, categoría · año y título si difiere
- [x] 2.2 `AlbumRemote`: «Otros discos llamados «x»» con rejilla o «Otros álbumes» con filas según `albumView`
- [x] 2.3 `LoadMoreResults` con `view` para Álbumes; agrega tarjetas en la rejilla
- [x] 2.4 Teléfono: 2 columnas sin desbordes a 390 px; el menú «…» sobre la carátula, como en las discografías

## 3. Canciones

- [x] 3.1 `SongRow`/`SongList` reciben la consulta; con el mismo título, artista como titular y título en la meta (no en la avanzada)
- [x] 3.2 Tests de las filas («creep»: artista arriba; título distinto: como antes)

## 4. Estado sin resultados

- [x] 4.1 `SearchNoResults` (design D4): título grande, «¿Quisiste decir…?», «En otros tipos» en `Suspense` con accesos simples de fallback, consejos y búsqueda avanzada, «O empieza por aquí» (Explorar, `/explore#lanzamientos`, Listas)
- [x] 4.2 Filas mini compartidas (`OtherTypeRows`) entre el panel lateral y el estado vacío; fila de artista con retrato o inicial
- [x] 4.3 Columna lateral del estado vacío: `RecentSearches`; nada si no hay
- [x] 4.4 `sections.tsx`: la rápida sin filtro usa `SearchNoResults`; con filtro, `SearchEmpty` («Quitar filtros»); la avanzada sin cambios
- [x] 4.5 Tests: estado vacío con y sin coincidencias en otros tipos, con filtro y en la avanzada

## 5. Textos, documentación y verificación

- [x] 5.1 Textos en `messages/{es,en}/catalog.json` (mismas claves) y `pnpm run i18n:client-messages`
- [x] 5.2 `docs/05-features/catalog-browsing.md`: rejilla, filas de canciones, estado vacío; quitar «Pendiente: fase 3»
- [x] 5.3 `pnpm run verify` y `pnpm run build`
- [x] 5.4 Navegador a 1440, 1024, 820 y 390 px: «the wall», «ok computer», «creep», «qzxvbnmqk» (los tres tipos), una consulta vacía en un tipo con coincidencias en otro, un filtro que vacía la lista; `/search/advanced` sin cambios
