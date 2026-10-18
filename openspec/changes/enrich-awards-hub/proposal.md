## Why

El hub `/awards` es un título y cinco tarjetas: las mismas de la sección "Premios" de Explorar, sin nada propio, y debajo la
página vacía. Además, una grilla plana no escala: con quince o veinte premios sería un muro de tarjetas iguales.

## What Changes

- **Tarjetas del hub más completas** (modo detallado de la tarjeta compartida): rango de años cargados, cantidad de ceremonias,
  quién vota y las cinco ediciones anteriores como atajos. La tarjeta de Explorar no cambia.
- **"Ganadores recientes":** muro de carátulas con el ganador destacado de las últimas tres ceremonias de cada premio, de la más
  reciente a la más antigua; cada carátula abre el álbum (o la ceremonia si el ganador no está en el catálogo) y lleva premio y año.
- **"Los más premiados":** ranking de artistas con más premios ganados, cruzando todos los premios y ceremonias, con la forma del
  chart de "Popular ahora". Regla nueva de conteo (ver la spec).
- **Agrupación por tipo de premio preparada y apagada** (`GROUP_AWARDS_ON_HUB`): generales, música latina, crítica y jurado, otros.
- Línea de cifras bajo el título: "5 premios · 28 ceremonias".

## Impact

- `src/services/awards/read.ts`: `LatestCeremony` suma `voting` y `years`; nuevas `listRecentHeadlineWinners`,
  `listMostAwardedArtists` y `recentPerAward`; el ganador destacado sale de un helper compartido.
- `src/components/awards/`: `AwardTile` (modo `detailed`), `RecentWinnersRail`, `award-groups`.
- `src/app/[locale]/(catalog)/awards/page.tsx`, `messages/{es,en}/awards.json`, `docs/05-features/awards.md`.
- Sin cambios de esquema.
