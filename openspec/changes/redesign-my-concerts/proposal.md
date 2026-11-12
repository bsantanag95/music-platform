## Why

Tras el pulido de `polish-my-concerts`, el usuario pidió llevar Mis conciertos a la vista ideal del mockup (2026-11-12): un
resumen que cuente algo (cifras, desde cuándo, el más visto), un aviso para completar los registros sin ciudad o país,
una vista por artista y filas más ricas (fecha como bloque, foto del artista, concierto compartido con cuántas personas
estuvieron).

## What Changes

- Resumen con cifras primero: conciertos, artistas, ciudades (nuevo total) y países, sin ceros; "Desde …" y el más visto.
- Aviso de registros a completar (sin ciudad o país, sin enlazar) con un filtro para ver solo esos.
- Barra fija con las vistas Por año / Por artista y saltos a cada año.
- Filas con la fecha como bloque, la foto del artista (o su inicial), "Festival" y cuántas personas estuvieron en el
  concierto compartido. La misma fila sirve a la página de conciertos de un perfil.
- API: `totals.cities`, `artist.photoUrl`, `concertKind` y `concertAttendees` en cada registro (aditivo).

## Capabilities

### Modified Capabilities
- `concert-log`: la página Mis conciertos.

## Impact

`OwnConcerts.tsx`, `ConcertYearList.tsx`, `ConcertsSummary.tsx` y `ConcertArtistGrid.tsx` (nuevos), `concert-ui.tsx`,
`concert-format.ts`, `services/concerts/{concerts,shared}.ts`, `ConcertEntrySchema`/`ConcertTotalsSchema`, mensajes
`concerts`, tests, `docs/04-api/contracts.md` y `docs/05-features/my-concerts.md`. Sin migración: las cifras salen de
columnas existentes y los conciertos enlazados se leen por lote (dos consultas por página).
