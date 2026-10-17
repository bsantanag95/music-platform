## 1. Servicios

- [ ] 1.1 `decade-label.ts`: `decadeLabel(decade, locale)` (es "Años 10"…"Años 90" y cuatro cifras en el resto; en "1980s"); con prueba de 1890, 1900, 1910, 1990, 2000, 2020 en los dos idiomas
- [ ] 1.2 `discovery.ts`: `ExploreListOptions` admite `decade`; `listDecadeYears` cuenta solo años con un disco ya publicado; `listCategoriesIn(condition, { decade, year })` (tipos con álbumes en el corte); con pruebas (año por salir sin chip, tipos del corte, género dentro de la década)
- [ ] 1.3 `decade-genres.ts`: la consulta devuelve la familia con la que entró cada género y `listDecadeGenres` los ordena por familia (taxonomía) y tamaño; con prueba de orden (clásica al final, sin familia al final, desempate estable) sin cambiar la selección

## 2. Componentes

- [ ] 2.1 Extraer `CoverMosaic` de `MosaicGrid` (la disposición 4/3/2/1/0) y que `MosaicGrid` lo use; las pruebas de la grilla siguen pasando
- [ ] 2.2 `FilteredAlbumList`: filas de faceta con rótulo (`facets`, píldoras con anillo en la actual, contenido final opcional y una línea desplazable en angosto), cabecera (línea de contexto + mosaico decorativo desde `sm`), `parentCrumbs`, `clearHref` en el estado vacío y `related` bajo el título; se retiran `years`; con pruebas
- [ ] 2.3 Menú "Otras décadas" al final de la fila de años: `<details>` cerrado por defecto con panel flotante desde `md` y en el flujo en angosto; con prueba
- [ ] 2.4 `ExploreFilterBar`: `availableCategories` opcional; los demás tipos como `<span aria-disabled>` sin enlace; "Todos" y el elegido siempre activos; con prueba

## 3. Página y mensajes

- [ ] 3.1 `explore/page.tsx`, vista de década: leer `genero` (con `anio`, `tipo`, `orden`), listar con `listAlbumsByGenre(…, { decade, year })` si hay género y con `listAlbumsByDecade` si no, ignorar `familia`, títulos, miga de varios niveles, enlace a la página del género, `clearHref`, tipos disponibles y covers de la cabecera
- [ ] 3.2 Cada chip conserva el resto de parámetros según las reglas de la URL ("Toda la década" quita `anio`, "Todos" quita `genero`, cambiar de década quita `anio` y conserva `genero`); el género fuera de los 12 se agrega como chip marcado
- [ ] 3.3 Portada y vista: usar `decadeLabel` en las tarjetas, la miga, el título (en minúsculas) y el menú; retirar `decadeChip`
- [ ] 3.4 Mensajes `catalog.json` (es/en): rótulos "Año" y "Género", "Todos", línea de contexto, títulos con género y año, "Ir a la página de", "Otras décadas"; retirar los textos que ya no se usan
- [ ] 3.5 Ajustar `explore-collections-pages.test.tsx` y las pruebas de componentes a las filas nuevas, el género en la URL y los nombres de década

## 4. Verificación y documentación

- [ ] 4.1 Ampliar `scripts/smoke-test-explore-collections.ts`: década × género (solo discos de esa década con el género o un subgénero), `listDecadeYears` sin el año por salir, `listCategoriesIn`, orden de los géneros por familia; medir en scratch Rock de los 1980s y registrar el tiempo
- [ ] 4.2 Verificar en el navegador a 1280 y 375 px: filas rotuladas, primer disco a la vista, género y año combinados, "Quitar filtros" en un corte vacío, tipos deshabilitados en los 1910s, menú de otras décadas, cabecera con y sin mosaico, sin scroll horizontal de la página
- [ ] 4.3 `docs/05-features/explore.md` (vista de década, contrato de URL, nombre de la década) y `docs/04-api/contracts.md`; ajustar `AGENTS.md` (nota del smoke)
- [ ] 4.4 `pnpm run typecheck && pnpm run lint && pnpm test && pnpm run build`; `openspec validate --specs --strict`
