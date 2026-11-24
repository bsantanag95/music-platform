## Why

La auditoría de la ficha de álbum (2026-11-24, `mockups/album-2026-11/`) encontró que la lista de canciones solo dice título y
duración: los compositores existen en el catálogo (en *The Number of the Beast*, Steve Harris firma 7 de 8) pero hay que ir a Créditos →
Por canción para verlos, y quién toca en el disco queda dos clics más lejos. La propuesta elegida, **A · Portada**, pone los compositores
bajo cada canción y una columna al lado con la formación del disco, la producción y las ediciones por formato. La Fase 1 (portada) está
publicada en `main` 10090aba. Esta es la Fase 2 de tres: la pestaña Canciones.

## What Changes

- **Compositores bajo cada canción:** una línea en mono pequeño con los autores de la obra de cada pista (la autoría ya cargada para
  Créditos), enlazados a su página. Sin autores conocidos, la línea se omite.
- **Columna «En este disco»** junto a la lista (debajo en el teléfono): la formación del disco (los integrantes de los créditos con
  sus instrumentos), la producción (productores e ingeniería) y las ediciones contadas por formato (CD, vinilo, casete, digital) con
  «Ver las N ediciones →». Cada bloque se omite sin datos; sin ninguno, la lista ocupa todo el ancho como hoy.
- **Ficha técnica en la spec:** se actualiza el requisito de la ficha al formato de una línea que publicó la Fase 1 (géneros,
  lanzamiento, duración, sello, producción y edición con «N ediciones →»).

### Goals

- Que quien consulta un disco vea quién lo escribió y quién lo tocó sin salir de Canciones.

### Non-Goals

- Cambiar la pestaña Créditos, la de Ediciones o las acciones por pista.
- **Fase 3:** una sola invitación a opinar, la franja de discografía y los estados vacíos.
- Datos nuevos: compositores, formación y ediciones ya se leen hoy.

## Capabilities

### New Capabilities

_(ninguna)_

### Modified Capabilities

- `catalog-album`: cada pista muestra sus compositores; la ficha técnica se describe en una línea con producción.
- `album-page-layout`: la pestaña Canciones suma la columna «En este disco».

## Impact

`src/app/[locale]/(catalog)/album/[id]/(tabs)/page.tsx` (lee `loadAlbumPersonnel` y `loadAlbumEditions`, ya cacheados por el layout);
`src/components/catalog/TrackList.tsx` (línea de compositores); un componente nuevo `src/components/album/AlbumOnThisRecord.tsx`
(formación, producción, ediciones por formato) que reutiliza `useRoleFormatter` de Créditos y `formatFamily` de Ediciones; mensajes
`catalog.album` (es/en); `client-messages.json`; tests de la lista, de la columna y de la página; `docs/05-features/catalog-browsing.md`.
Sin API, esquema ni dependencias. Las páginas informativas no cambian.
