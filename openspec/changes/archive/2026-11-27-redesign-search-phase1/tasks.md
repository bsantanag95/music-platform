## 1. Arreglos

- [x] 1.1 `displayCount(total, listed)` puro en `src/services/catalog/search/` (`max(total ?? 0, listed)`), con tests (total 0 con 8 listados, total null, total mayor)
- [x] 1.2 Usarlo en `ArtistRemote`, `AlbumRemote` y `AlternativeCountFor` de `sections.tsx`
- [x] 1.3 Textos `cachedTag` («en el catálogo» / «in the catalog») y `fromCatalog` («En el catálogo» / «In the catalog») en `messages/{es,en}/catalog.json`; actualizar los tests que esperan el texto viejo

## 2. Un solo buscador

- [x] 2.1 `ScopedSearchField size="page"`: 64 px (54 por debajo de `sm`), texto de 20–22 px, selector con etiqueta (solo icono por debajo de `sm`) y Buscar (solo icono por debajo de `sm`, con nombre accesible «Buscar»); se conservan el combobox «Texto a buscar», las sugerencias y el envío
- [x] 2.2 `SearchForm` usa la variante, ancho máximo ~54rem, marca el campo con `data-search-page-field`; la portada sin consulta también
- [x] 2.3 Header: en `/search` (exacto) la zona central de búsqueda de escritorio pasa a `invisible` con `aria-hidden` e `inert`; por debajo de `lg` sin cambios
- [x] 2.4 Atajo `/`: en `/search` desde `lg` enfoca `[data-search-page-field]`; en el resto, igual que hoy
- [x] 2.5 Tests de `Header.test.tsx`: campo oculto e inerte en `/search`, visible en `/search/advanced` y en otras rutas; `/` enfoca el campo de la página en `/search`

## 3. Marco, pestañas y columna lateral

- [x] 3.1 `page.tsx`: marco `max-w-[88rem]` con los márgenes del sitio; con consulta, rejilla de 12 columnas desde `lg` (resultados 8, lateral 4 `sticky` bajo el Header); una columna por debajo
- [x] 3.2 Las secciones de la rápida devuelven por separado los resultados y el contenido de la lateral (filtros y «Acotar»); con `advanced`, la salida es la de hoy
- [x] 3.3 `SearchTypeTabs` en pastillas (activa en papel sobre tinta) con la cifra en la activa; `SearchSummary` deja «Resultados para «x»» como `h2` oculto y pasa la cifra a la pestaña; fallback del streaming sin cifra
- [x] 3.4 Filtros en la lateral desde `lg`: Persona/Grupo (Artistas), Tipo y Década (Álbumes) como grupos con título, siempre abiertos; por debajo de `lg`, Persona/Grupo como hoy y Álbumes tras **Filtros**
- [x] 3.5 `RefineHint` («Acotar» por artista) en la lateral desde `lg` en Álbumes y Canciones; por debajo, en su lugar actual
- [x] 3.6 `loading.tsx` con el mismo marco y columnas, para que la página no salte al cargar

## 4. Encabezados de grupo

- [x] 4.1 `ResultsGroupHeading` (`h3`, display negrita 20–22 px, cifra opcional en `font-data`) en `search-results/`
- [x] 4.2 Usarlo en «Otros artistas llamados «x»» (con cantidad), «Más resultados» y «Otras canciones con este título» cuando no es `advanced`
- [x] 4.3 Tests en `search-results.test.tsx` y `sections.test.tsx`: encabezados `h3` en la rápida, los de hoy en la avanzada

## 5. Documentación y verificación

- [x] 5.1 `pnpm run i18n:client-messages`
- [x] 5.2 `docs/05-features/catalog-browsing.md` (o donde se describa `/search`): marco, un solo buscador, columna lateral y plan de las fases 2 y 3; revisar que la Ayuda (`messages/{es,en}/info.json`) sigue siendo cierta
- [x] 5.3 Revisar F2 de `docs/05-features/feature-map.md` y `e2e/catalog.e2e.ts`: el combobox «Texto a buscar» y el botón «Buscar» conservan sus nombres
- [x] 5.4 `pnpm run verify` (typecheck, lint, tests del diff) y `pnpm run build`
- [x] 5.5 Navegador a 1440, 1024, 820 y 390 px con «pink» (Artistas), «the wall» (Álbumes), «creep» (Canciones), «radiohed» y «qzxvbnmqk»: un solo campo en escritorio, cifra en la pestaña, lateral fija, sin desbordes, primer resultado en la primera pantalla a 375 × 812; `/search/advanced` sin cambios visibles
