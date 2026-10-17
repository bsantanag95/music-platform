## 1. Servicios

- [x] 1.1 `decade-covers.ts`: `listDecadeCovers()` con una consulta con ventana (`row_number() over (partition by década order by albumSignalOrder())`, hasta 4 discos `studio` con carátula por década), caché en memoria de 6 h con promesa en vuelo y error no cacheado (mapa vacío); con prueba (hasta 4, estable, década sin carátulas queda fuera del mapa, caché)
- [x] 1.2 `decade-genres.ts`: `listDecadeGenres(decade)` con los 12 géneros de estilo con más álbumes de la década (género efectivo con herencia, el conteo solo ordena, como mucho 3 por familia), caché por década de 6 h, década inválida → `[]` sin consultar; con prueba
- [x] 1.3 `discovery.ts`: `DecadeBucket` lleva `covers`; `getExplorePage` las lee junto al resto; `listDecadeYears(decade)` (años con álbumes, ascendentes)
- [x] 1.4 `discovery.ts`: `bestOrder` pasa a `bestOrderFor({ yearTiebreak })` (se conserva `bestOrder` para el resto); `listAlbumsFiltered` acepta `year`, valida que sea de la década y no usa el año como desempate cuando hay `decade`; `listAlbumsByDecade` acepta `year`; con pruebas (año fuera de la década, orden sin apilar el último año, orden de familia/género sin cambios)

## 2. Componentes

- [x] 2.1 Renombrar `FamilyGrid` a `MosaicGrid` (`MosaicTile`) con `id`, `headingId` y `listId` como parámetros; géneros y décadas la usan; ajustar sus pruebas
- [x] 2.2 `FilteredAlbumList`: fila `years` (chips con `SliceNav`, siempre visible) y `parentCrumb` opcional en la miga de pan; con prueba
- [x] 2.3 Eliminar `DecadeHistogram.tsx` y sus pruebas

## 3. Página y mensajes

- [x] 3.1 `explore/page.tsx`: portada con `MosaicGrid` de décadas (descendente, desde 1950 en la grilla, anteriores detrás de "Décadas anteriores"), colocada tras Géneros; `jumpItems` en el orden nuevo
- [x] 3.2 `explore/page.tsx`: vista de década con `?anio=` (validado contra la década y tolerante), fila de años, géneros de la década enlazados a `genreHref(slug)?tab=albums&decada=<año>`, otras décadas en desplegable cerrado, título "Álbumes de <año>" y miga de pan con año
- [x] 3.3 Mensajes `catalog.json` (es/en): `decadesDescription` nueva, `earlierDecades`, `decadeYearsLabel`, `decadeAllYears`, `decadeGenresLabel`, `yearResultsHeading`; retirar `decadeBarLabel` y `decadesEarlier`
- [x] 3.4 Ajustar `explore-collections-pages.test.tsx`, `discovery-sections.test.tsx` y `ExploreJumpNav.test.tsx` al orden y a las tarjetas nuevas

## 4. Verificación y documentación

- [x] 4.1 Ampliar `scripts/smoke-test-explore-collections.ts` con discos sintéticos de varias décadas y años (`5e0ce000-0000-4000-8000-0000000009f7…9fe`, los cubre la limpieza `…09f%`): `listDecadeCovers` (solo estudio con carátula, hasta 4, estable), `listDecadeGenres`, `listDecadeYears` y el orden de una década sin apilar el último año; medir en scratch la consulta de géneros de los 90 y comprobar que la fila no sea monótona (lo era: tope de 3 por familia)
- [x] 4.2 Verificar en el navegador a 1280 y 375 px: tarjetas de década (mosaico 4/3/2/1/0 carátulas), "Décadas anteriores" desplegable, vista de década con años, géneros y selector plegado, año elegido y vuelta a "Toda la década", sin scroll horizontal
- [x] 4.3 `docs/05-features/explore.md` (sección de décadas, vista de década y orden) y nota de que no hay ADR nuevo (mismos patrones de los ADR 0040/0041); ajustar `AGENTS.md` (nota del smoke)
- [x] 4.4 `pnpm run typecheck && pnpm run lint && pnpm test && pnpm run build`; `openspec validate --specs --strict`
