## Why

En Explorar, la sección de salones de la fama tiene dos tarjetas en la grilla de cinco columnas de Premios: tres quintos de la fila
quedan vacíos. Además, la tarjeta prioriza las incorporaciones con disco en el catálogo aunque no tengan carátula, así que sale llena
de siluetas habiendo carátulas reales más abajo, y el rótulo "Clase" junto al año no agrega nada.

## What Changes

- Con hasta dos salones, tarjetas anchas (dos por fila) con ocho carátulas desde `lg`; con tres o más, la grilla de Premios con cuatro.
- Las carátulas se eligen por prioridad: con carátula, luego con disco en el catálogo, luego el resto, cada grupo en el orden curado.
- Junto al año, cuántas grabaciones ingresaron en la clase ("25 grabaciones") en vez de "Clase".

## Impact

- `src/components/awards/HallOfFameTile.tsx` (`tileCovers`, `wide`), `messages/{es,en}/awards.json` (`hall.inducteesCount`),
  `docs/05-features/awards.md`. Sin cambios de datos ni de esquema.
