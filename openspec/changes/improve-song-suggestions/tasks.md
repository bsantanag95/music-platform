## 1. Línea base

- [x] 1.1 Guardar la medición actual de `suggest('song')` sobre scratch (`on`, `one`, `stairway`, `bohemian rh`, `taste`, `metallica one`, `oasis wonderw`, `hey jude`): tiempos y las 6 sugerencias de cada una

## 2. Lecturas en lote (`local-match.ts`)

- [x] 2.1 `recordingSignals(ids)`: artista principal (id, nombre, discografía explorada), álbumes distintos por grabación y seguidores por artista, en consultas en lote; pruebas con la base mockeada
- [x] 2.2 `recordingsByArtistsAndTitlePrefix(artistIds, rest, limit)`: grabaciones con crédito principal cuyo título normalizado empieza por el resto; pruebas
- [x] 2.3 Mover `baseSongTitle` a `normalize.ts` (reexportado desde `songs.ts`) para reutilizarlo sin importar el módulo de búsqueda de Canciones

## 3. Sugerencias de canción (`suggest.ts`)

- [x] 3.1 Pool de 80 con 3+ caracteres normalizados y 40 con 2; puente en paralelo con el pool (solo con resto de 2+ caracteres)
- [x] 3.2 Agrupación por título base + artista principal; representante con más álbumes; señales del grupo (suma de actividad, máximo de álbumes)
- [x] 3.3 Orden por bloques (puente → cubre → difusa) y desempates (nivel → actividad → álbumes → artista explorado/seguidores → similitud); cortar a 6
- [x] 3.4 Pruebas en `suggest.test.ts`: duplicados colapsados con la versión de más álbumes, artistas distintos separados, puente `metallica one` y `oasis wonderw`, actividad antes que álbumes, grabación sin álbumes detrás, difusas solo como relleno, errata `bohemian rapsody`, resto de 1 carácter sin puente

## 4. Documentación y verificación

- [x] 4.1 `docs/04-api/contracts.md`: orden y agrupación de las sugerencias de canción en `GET /api/search/suggest`
- [x] 4.2 Repetir la medición de 1.1: mediana ≤ 40 ms con 3+ caracteres y `on` sin empeorar; anotar antes/después en el diseño
- [x] 4.3 `pnpm run typecheck && pnpm run lint && pnpm run test && pnpm run build` (build fuera del checkout si hay un servidor de desarrollo corriendo)
- [x] 4.4 Verificación en el navegador del buscador del Header con el tipo Canciones (`one`, `metallica one`, `oasis wonderw`)
