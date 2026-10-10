## Why

El riel "Novedades" de `/explore` hoy ordena `studio`/`single_ep` por `first_release_year` descendente. Con
granularidad de año, todo lo de un mismo año empata y el desempate es `created_at` (cuándo entró el disco a
nuestra base, no cuándo salió); no hay límite de antigüedad ni se excluyen fechas futuras. El resultado no es
"lo último que salió" sino un orden casi arbitrario dentro del año más reciente que haya en el catálogo.

## Goals

- Que "Novedades" signifique lo que dice: discos **lanzados recientemente** y ya publicados.
- Orden por fecha real de lanzamiento (día exacto), no por año ni por fecha de ingesta.
- Que el riel se omita cuando no hay suficientes novedades, igual que Mejor valorados y Más reseñados.

## Non-Goals

- No cambiar el riel "Novedades" de la página de género (`getGenreNewReleases`, `orden=recientes`): una ventana de
  90 días lo dejaría casi siempre vacío en un género; conserva su comportamiento actual.
- No leer `release_calendar_entry`: el sync del calendario ya vincula al catálogo (stub de `release_group` con
  `first_release_date` y carátula) todo lo que muestra, así que la consulta sobre `release_group` ya lo cubre.
- No tocar el calendario de lanzamientos de Inicio (ADR 0029), ni el esquema, ni los contratos de API.
- No añadir personalización ni recomendación: el riel sigue siendo igual para todas las personas.

## What Changes

- `listNewReleases` en `/explore` pasa a filtrar por `first_release_date` entre `hoy − NEW_RELEASE_WINDOW_DAYS`
  (90) y hoy (inclusive), ordenar por `first_release_date` descendente (desempate por `id`) y exigir carátula
  (`cover_thumb_url` no nulo).
- Se mantienen las categorías `studio` y `single_ep` y el tamaño `RAIL_SIZE` (12).
- El riel se omite si hay menos de `MIN_ALBUMS_FOR_SECTION` (6) álbumes elegibles.
- La consulta de la página de género sigue usando la lógica actual por año, separada de la de Explorar.
- Texto de interfaz de la descripción del riel (es/en) actualizado para reflejar la ventana.
- Se actualizan `docs/05-features/explore.md` y el spec `album-discovery`.

## Capabilities

### New Capabilities
<!-- ninguna -->

### Modified Capabilities
- `album-discovery`: el requisito "Novedades" cambia de "por año descendente, sin umbral" a "lanzados en los
  últimos 90 días, fecha completa, con carátula, orden por fecha y omisión bajo umbral".

## Impact

- Código: `src/services/discovery/discovery.ts` (`listNewReleases` y una variante por año para género),
  `src/services/discovery/constants.ts`, `src/services/genres/rails.ts` (sigue con la variante por año),
  `messages/{es,en}/catalog.json`.
- Pruebas: `src/services/discovery/*.test.ts`, `src/services/genres/rails.test.ts`.
- Docs: `docs/05-features/explore.md`; spec `openspec/specs/album-discovery/spec.md`.
- Sin migraciones, sin dependencias nuevas, sin cambios de contrato REST.
