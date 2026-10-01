## 1. Diálogo con deslizador

- [x] 1.1 `RatingDetailDialog.tsx`: reemplazar el `input type="number"` por `input type="range"` con rango `scoreRange(own.stars)` o 1–100; valor `number | null` (D3); número grande `86/100` / `—/100` con extremos; `aria-valuetext` con estrellas
- [x] 1.2 Botones `−` / `+` (de a 1, deshabilitados en los extremos; desde `null` parten del centro) — D4
- [x] 1.3 Estrellas en vivo sin estrellas previas (`StarRatingDisplay` + `starsFromScore`); con estrellas, fila fija y rótulo del tramo — D5
- [x] 1.4 "Guardar" habilitado solo si el valor difiere del vigente; guarda `{ detailedScore }`; retirar `starsChange`
- [x] 1.5 Ayuda `?` como divulgación (`aria-expanded`/`aria-controls`), tabla de 10 tramos con la fila vigente resaltada (`aria-current`, peso) y la frase para quien no tiene estrellas — D6
- [x] 1.6 Mensajes `catalog.album.relation.detail` en es/en (D7); retirar claves sin uso

## 2. Tests

- [x] 2.1 `RatingDetailDialog.test.tsx`: rango 71–80 con 4★; 1–100 sin estrellas con estrellas en vivo; "Guardar" deshabilitado sin mover; `−`/`+` y extremos; teclado (flechas, Re Pág/Av Pág); ayuda abre/cierra con la fila resaltada; guardar envía solo `detailedScore`; sin valoración no hay Destacar/Borrar
- [x] 2.2 Ajustar los tests de `AlbumRelationPanel` / `SongRelationPanel` que usaban el campo numérico

## 3. Documentación y verificación

- [x] 3.1 `docs/05-features/ratings-and-reviews.md`: describir el deslizador y la ayuda
- [x] 3.2 `pnpm run typecheck && pnpm run lint && pnpm test && pnpm run build`
- [x] 3.3 Navegador (escritorio y móvil): álbum con 4★ (71–80, guardar 76), álbum y canción sin valorar (estrellas en vivo, derivan al guardar), `−`/`+`, teclado, ayuda
