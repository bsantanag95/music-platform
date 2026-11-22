## 1. Lanzamientos

- [x] 1.1 Mover `ReleaseTimetable` (y su test; `release-dates.ts` si solo lo usa él) de `components/home/` a `components/discovery/`; actualizar Inicio
- [x] 1.2 Opciones `status`, `seeAll` y `partIds` en `ReleaseTimetable`; sin ellas, Inicio idéntico
- [x] 1.3 Portada: sección `lanzamientos` con `SectionHeading` y el horario (novedades → «Publicado», próximos → cuenta regresiva, «Ver todo →» por parte, anclas `novedades`/`proximos`) en lugar de los dos rieles
- [x] 1.4 Mensajes de encabezado y descripción de Lanzamientos (es/en)
- [x] 1.5 Tests: estado por fila, «Ver todo» en lugar de la cifra, anclas de las partes, una sola parte a todo el ancho

## 2. Premios

- [x] 2.1 Extraer `headlineText(ceremony)` de `AwardTile` (título y crédito del destacado) y reutilizarla
- [x] 2.2 `CeremonyRow` (servidor): columnas con filete, premio, año, edición, categoría con trofeo, título y artista, sin carátula; fila táctil por debajo de `lg`
- [x] 2.3 `AwardsExploreSection` usa `CeremonyRow`; el hub `/awards` sigue con `AwardTileGrid`
- [x] 2.4 Tests: una entrada por premio en orden, enlace a la ceremonia, sin imágenes, texto del destacado resuelto y sin resolver

## 3. Salones

- [x] 3.1 `HallOfFameTile compact` y `HallOfFameTileGrid compact` (dos columnas desde `md`, tira de 4 carátulas, nombre y año)
- [x] 3.2 `HallOfFameExploreSection` usa `compact`; `/hall-of-fame` sin cambios
- [x] 3.3 Tests: tarjeta compacta con 4 carátulas, nombre, año y enlace a la clase

## 4. Orden y pasillos

- [x] 4.1 Reordenar la portada: Colecciones, Popular, Mejor valorados, Géneros, Décadas, Lanzamientos, Premios, Salones
- [x] 4.2 `jumpItems` con `lanzamientos` (visible con alguna de las dos partes); mensaje `jump.releases`; retirar `jump.newReleases`/`jump.upcoming` si quedan sin uso
- [x] 4.3 Tests de la portada: orden de las secciones y de la barra

## 5. Documentación y verificación

- [x] 5.1 `pnpm run i18n:client-messages`
- [x] 5.2 `docs/05-features/explore.md` (orden, Lanzamientos, Premios, Salones) y `home.md` (ruta del horario)
- [x] 5.3 `pnpm run verify` y `pnpm run build`
- [x] 5.4 Verificación en el navegador a 1440, 1024, 820 y 390 px: horario de dos columnas y cuenta regresiva, fila de ceremonias sin desborde, salones compactos, barra marcando «Lanzamientos»; Inicio, `/awards` y `/hall-of-fame` sin cambios visibles
