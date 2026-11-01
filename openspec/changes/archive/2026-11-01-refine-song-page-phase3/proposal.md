## Why

Tercera y última fase del refinamiento de la página de canción (auditoría del 2026-10-31, maqueta en
https://claude.ai/artifact/QKZiK8m9SEb4oWfoSCc1NU; la persona eligió las opciones recomendadas). En My Man on
Willpower el bloque "Créditos de esta grabación" mide 1.153 px en 375 px: 8 intérpretes, 3 de producción y 10 de
sonido, una persona por fila, antes de llegar a las apariciones y las versiones. La pestaña Créditos del álbum ya
pliega sus niveles con un resumen. El desplegable "+N asistentes" es el único del bloque sin chevron.

## What Changes

- Los grupos Producción, Sonido y Otros con más de 6 personas se pliegan con el resumen del álbum ("Sonido · 10 ·
  Serban Ghenea, David Hart, Jack Antonoff y 7 más") y un chevron; Intérpretes queda siempre abierto. Los grupos de 6
  o menos no cambian.
- "+N asistentes" lleva el chevron común.

### Non-Goals

- Cambiar los niveles de créditos del álbum o la regla de "+N" roles.

## Capabilities

### Modified Capabilities

- `song-page-layout`: grupos largos de créditos plegados con resumen.

## Impact

`SongCredits`, mensajes (reusa `catalog.album.credits.levelSummaryMore`), tests. Sin cambios de esquema ni de API.
