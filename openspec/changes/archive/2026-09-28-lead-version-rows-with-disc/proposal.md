## Why

En "Stairway to Heaven", "Otras grabaciones" repite "Stairway to Heaven" en cada fila: las
grabaciones del propio artista usan el título como línea principal, cuando lo que las distingue
es el disco que las contiene ("Stairway Sessions", "Acoustically").

## What Changes

- En las grabaciones del mismo artista, la línea principal pasa a ser el disco principal
  (enlazado a la grabación); abajo, el título solo si difiere del de la canción ("(take 1)") y el
  año enlazado al disco. Sin disco, se mantiene el título.

## Capabilities

### New Capabilities

(ninguna)

### Modified Capabilities

- `song-versions`: línea principal de las filas de otras versiones.

## Impact

- `src/components/song/SongVersions.tsx`, test de la página de canción,
  `docs/05-features/catalog-browsing.md` (sección 3b). Sin cambios de datos ni contratos.
