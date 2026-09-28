## Why

En "Stairway to Heaven", con los tres grupos de versiones desplegados, no se distingue dónde
termina uno y empieza el otro, las dos columnas se leen en zigzag y pierden el orden
cronológico, la línea principal es a veces un artista y a veces un disco, y el mismo disco se
repite en varias filas ("Stairway to Heaven Sessions 1970–1971" cinco veces).

## What Changes

1. **Pestañas** en lugar de acordeones: un grupo a la vista, con su cantidad; arranca en el
   primero con contenido. Un grupo único sigue como subtítulo.
2. **Tabla de una columna** con posiciones fijas: Año | Disco | Grabaciones, y Año | Artista |
   Disco | Grabaciones en las versiones de otros artistas.
3. **Una fila por disco**: las grabaciones del mismo disco (y artista) se juntan como variantes
   enlazadas a su página, con su duración y sus atributos.
4. **Variante como texto corto**: lo que el título agrega al de la canción ("version 1",
   "Earl’s Court, May 25, 1975"); sin agregado, "Ver versión" o "Grabación N" si hay varias en
   el disco.
5. "+N más" pasados 10 discos en cualquier grupo.

## Capabilities

### New Capabilities

(ninguna)

### Modified Capabilities

- `song-versions`: presentación de las otras versiones de la canción.

## Impact

- `src/components/song/SongVersions.tsx` y el nuevo `song-versions.ts`, mensajes `catalog`
  `es`/`en`, tests, `docs/05-features/catalog-browsing.md` (sección 3b). Sin cambios de datos
  ni contratos.
