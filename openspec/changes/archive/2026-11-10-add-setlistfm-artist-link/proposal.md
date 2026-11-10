## Why

La página de artista no dice nada de la vida en vivo del artista. setlist.fm documenta sus conciertos, y MusicBrainz ya
declara la página de cada artista en setlist.fm como relación de URL (`setlistfm`), en la misma request de la ficha que
hacemos hoy. Un enlace basta para llevar a esos conciertos sin depender de la API de setlist.fm (clave, cuota diaria, uso
solo no comercial y prohibición de guardar datos), que sí exigiría una pestaña con la lista de conciertos.

## Goals

- Una fila **En vivo** en la ficha del artista con el enlace "Conciertos en setlist.fm ↗" para grupos y personas.
- Usar la URL que declara MusicBrainz; si el artista no la tiene (o su ficha aún no se actualizó), enlazar a la búsqueda
  del artista por nombre en setlist.fm.

## Non-Goals

- Integrar la API de setlist.fm, listar conciertos dentro de la plataforma o una pestaña Shows.
- Registrar conciertos a los que fue la persona ("Estuve ahí") — posible proyecto aparte.
- Otros servicios de conciertos (Songkick, Bandsintown) o más enlaces curados.

## What Changes

- Los enlaces curados suman el tipo `setlistfm`, tomado de la relación de URL `setlistfm` de MusicBrainz (activa, con
  host `setlist.fm`). Es la única base de datos externa que se guarda como enlace.
- Migración `0090`: el `CHECK` de `artist_link.kind` acepta `setlistfm`. Sin backfill: el enlace llega con la
  actualización de la ficha (cada 30 días) y mientras tanto rige la búsqueda por nombre.
- La ficha de la cabecera muestra la fila **En vivo** después de Enlaces, solo para grupos y personas.

## Capabilities

### New Capabilities

_(ninguna)_

### Modified Capabilities

- `artist-profile-facts`: los enlaces curados incluyen la página del artista en setlist.fm.
- `artist-header`: la ficha suma la fila En vivo con el enlace a setlist.fm (directo o búsqueda).

## Impact

- Código: `src/services/musicbrainz/artist-profile-mappers.ts`, `src/services/catalog/artist-profile-read.ts`,
  `src/components/artist/ArtistHeader.tsx` (+ `artist-format.ts`), mensajes `es`/`en`, tests.
- Esquema: `drizzle/0090_artist_link_setlistfm.sql`, `src/db/schema.ts`, `docs/03-data/sql-model.md`.
- Docs: `docs/03-data/data-licensing.md` (setlist.fm solo como enlace, sin usar su API).
- Sin dependencias nuevas, sin variables de entorno, sin requests externas adicionales.
