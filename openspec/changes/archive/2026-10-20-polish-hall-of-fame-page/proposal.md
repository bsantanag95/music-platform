## Why

En `/hall-of-fame` casi todo eran discos grises de 240 px: muchas grabaciones antiguas no tienen carátula o no tienen ficha en el
catálogo. La última clase de cada salón salía dos veces (la tarjeta del salón con ocho carátulas y, debajo, el riel con la misma
clase). Y las incorporaciones sin ficha se leían como un título largo "Rumor Has It — Reba McEntire", sin artista aparte.

## What Changes

- Índice: un bloque por salón (nombre, rango de años, clases, quién decide, todas las clases como enlaces y el riel de la última);
  sin la grilla de tarjetas. La tarjeta del salón queda solo para Explorar (sin forma detallada).
- Portada tipográfica para las incorporaciones sin carátula (inicial del título sobre un tono estable), en el riel y en la tarjeta de
  Explorar, en lugar de la silueta del disco. `LazyCoverImage` acepta un respaldo propio.
- El texto curado de un nominado sin ficha se parte en título y artista en el primer " — ", en todas las páginas de premios y salones.

## Impact

- Nuevos `TypeCover.tsx` y `nominee-text.ts`; `NomineeVisual` (opción `typeCover`), `HallOfFameLatestRail`, `HallOfFameTile` (sin
  `detailed`), `AwardTile`, `RecentWinnersRail`, `CategoryWinnersTimeline`, `LazyCoverImage` (`fallback`).
- `src/app/[locale]/(catalog)/hall-of-fame/page.tsx`, `messages/{es,en}/awards.json` (`hall.classesOf`), `docs/05-features/awards.md`.
- Sin cambios de datos ni de esquema. Para más carátulas reales hace falta resolverlas por lote en la base (operación aparte).
