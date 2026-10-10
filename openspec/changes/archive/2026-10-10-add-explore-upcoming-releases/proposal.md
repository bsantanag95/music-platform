## Why

Explorar ya muestra lo recién lanzado (Novedades, últimos 90 días) pero no lo que viene. Inicio tiene un
riel de "Próximos lanzamientos", pero es un resumen: 12 discos elegidos por popularidad, un disco por artista,
tope de 3 por familia de géneros y una ventana de 60 días (90 como máximo). Quien quiere saber qué sale en los
próximos meses no tiene dónde recorrerlo completo ni ordenado por fecha.

## Goals

- Dar a Explorar una vista de lanzamientos futuros que **aporte más que el resumen de Inicio**: ventana más
  amplia, orden cronológico, sin recorte por popularidad ni por artista, con la fecha visible y un listado
  completo y paginado.
- Mantener la regla de Explorar: igual para todas las personas, sin personalización.

## Non-Goals

- No tocar el riel de Inicio ni el calendario de lanzamientos (ADR 0029), ni su sync.
- No leer `release_calendar_entry`: los futuros que el calendario muestra ya están en el catálogo como stub de
  `release_group` con `first_release_date` y carátula.
- No añadir selector "De tus artistas", marca "Anunciado" ni ranking por oyentes.
- No cambiar el riel Novedades (pasado) ni el de la página de género.
- Sin migraciones, sin dependencias nuevas, sin cambios en contratos REST.

## What Changes

- Nuevo riel **"Próximos lanzamientos"** en `/explore`, justo debajo de Novedades: `studio`/`single_ep` con
  `first_release_date` posterior a hoy y hasta hoy + `UPCOMING_WINDOW_DAYS` (180), con carátula, por fecha
  **ascendente** (el más cercano primero), hasta `RAIL_SIZE` (12). Se omite con menos de
  `MIN_ALBUMS_FOR_SECTION` (6).
- Cada tarjeta del riel y del listado muestra la **fecha exacta** de lanzamiento (p. ej. "24 oct") en lugar del
  año.
- "Ver todo →" abre un listado completo y paginado `/explore?proximos=1`, en orden cronológico, con filtro por
  tipo (`tipo=`) y sin selector de orden.
- Nuevas funciones `listUpcomingReleases` y `listUpcomingAlbums` en el servicio de descubrimiento; `AlbumCard`
  acepta una etiqueta de fecha opcional; `ExploreFilterBar` permite ocultar el orden.
- Se actualizan el spec `album-discovery`, `docs/05-features/explore.md` y las cadenas es/en.

## Capabilities

### New Capabilities
<!-- ninguna -->

### Modified Capabilities
- `album-discovery`: se añaden los requisitos del riel "Próximos lanzamientos" y de su listado completo.

## Impact

- Código: `src/services/discovery/{constants,discovery,explore-params}.ts`,
  `src/app/[locale]/(catalog)/explore/page.tsx`, `src/components/catalog/AlbumCard.tsx`,
  `src/components/discovery/{AlbumRail,FilteredAlbumList,ExploreFilterBar}.tsx`, `messages/{es,en}/catalog.json`.
- Pruebas: servicio, parámetros de URL, `AlbumCard`, secciones de descubrimiento.
- Docs: `docs/05-features/explore.md` (y nota cruzada en `home.md`); spec `album-discovery`.
