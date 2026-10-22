## 1. Componente compartido del puntaje

- [x] 1.1 `RatingScore.tsx`: botón de puntaje con variantes `full` (`86/100`, `/100` atenuado) y `compact` (`86`); sin puntaje un guion con `title="Sin afinar"`; etiqueta accesible recibida; 44 px con puntero grueso; pruebas.

## 2. Gráfico con la nota visible

- [x] 2.1 `RatingTile.tsx`: quitar el overlay; leyenda bajo la carátula (título, detalle según `display`, estrellas, `RatingScore` compacto); el enlace conserva su etiqueta accesible y la marca de tipo; `priority` intacta.
- [x] 2.2 `RatingsGraphic.tsx`: separación de la cuadrícula acorde a la leyenda.
- [x] 2.3 `RatingTile.test.tsx`: reescribir para la leyenda (sin overlay, puntaje abre el diálogo, detalle según `showArtist`/`showType`, etiquetas accesibles, marca de tipo).

## 3. Detallada compacta

- [x] 3.1 `RatingsDetailed.tsx`: filas separadas por divisores (sin `gap-4`).
- [x] 3.2 `MyRatingRow.tsx`: carátula de 40 px desde `sm`, `py-2`, estrellas y `RatingScore` de ancho fijo a la derecha; `MyRatingRow.test.tsx` actualizado.

## 4. Índice como tabla

- [x] 4.1 `ratings.json` es/en: encabezados de columna (`colTitle`, `colType`, `colYear`, `colStars`, `colScore`).
- [x] 4.2 `RatingsIndex.tsx`: `<table>` con encabezados `sr-only` bajo `sm`, celdas alineadas, título con artista debajo en móvil, `RatingScore` completo; ajustar las pruebas que buscaban `li`.

## 5. Integración, documentación y verificación

- [x] 5.1 `MyRatingsList.test.tsx`: ajustar las pruebas a la leyenda del Gráfico, al guion y a la tabla del Índice.
- [x] 5.2 `docs/05-features/ratings-and-reviews.md`: Gráfico con la nota visible, guion de "sin afinar", Detallada compacta, Índice como tabla.
- [x] 5.3 `pnpm run typecheck && pnpm run lint && pnpm test` y `pnpm run build`.
- [x] 5.4 Verificación en el navegador (escritorio y 375 px) desde el worktree, en las tres vistas.
