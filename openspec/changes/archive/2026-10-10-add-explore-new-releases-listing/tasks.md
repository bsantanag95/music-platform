## 1. Servicio

- [x] 1.1 En `src/services/discovery/discovery.ts`: extraer `newReleasesCondition()` y `newReleasesOrder()` de
  `listNewReleases` (sin cambiar su comportamiento) y hacer que el riel las use.
- [x] 1.2 `listNewAlbums(page, { category })`: consulta propia sin `rating`, misma condición y orden, con `paginate`
  y `toAlbumPage`, validando el tipo como `listUpcomingAlbums`; sin umbral.

## 2. Interfaz

- [x] 2.1 `explore/page.tsx`: riel de Novedades con `seeAll` a `/explore?novedades=1` y `dateLabels`.
- [x] 2.2 `explore/page.tsx`: corte `?novedades=1` (prioridad después de `proximos`) con `FilteredAlbumList`,
  `hideSort` y `dateLabels`.
- [x] 2.3 Cortes hermanos "Novedades | Próximos lanzamientos" en ambos listados (`siblings`, conservando `tipo`,
  construidos con `exploreListHref`).
- [x] 2.4 Cadenas es/en: encabezado, kicker, miga y etiqueta de navegación del listado de novedades; renombrar
  `upcomingSeeAll` a `seeAll` (común a ambos rieles) y actualizar su uso.

## 3. Pruebas

- [x] 3.1 Servicio: `listNewAlbums` (condición y orden descendente, sin `rating`, paginación, tipo inválido →
  `VALIDATION_ERROR`, sin umbral); que `listNewReleases` conserve su comportamiento tras la extracción.
- [x] 3.2 Verificar con una consulta de solo lectura contra la BD y en el navegador: riel con "Ver todo" y fecha,
  `?novedades=1`, `?proximos=1`, chips hermanos y prioridad con ambos parámetros.

## 4. Documentación

- [x] 4.1 `docs/05-features/explore.md`: fila de Novedades (fecha y "Ver todo"), listado de novedades, cortes
  hermanos y orden de prioridad de los cortes.

## 5. Cierre

- [x] 5.1 `pnpm run typecheck && pnpm run lint && pnpm run test && pnpm run build` pasan.
