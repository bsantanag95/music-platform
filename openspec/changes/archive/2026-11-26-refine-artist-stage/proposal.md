## Why

Al revisar la portada nueva de la ficha de artista con sesión (Peter Gabriel, 2026-11-26) aparecieron seis problemas: el panel «Tu
relación» (~590 px) estira la portada y deja el nombre pegado a las pestañas con ~350 px vacíos arriba; sin foto, la carátula del
retrato se repite en el abanico; cuatro líneas de ficha en la misma letra y peso hacen ruido; al ocultar los rótulos, datos como
«Cobham 1977» se volvieron ambiguos; el panel tapa el abanico; y un artista con mucha obra muestra un solo disco porque sus
carátulas todavía no se resolvieron. El usuario pidió corregir los seis.

## What Changes

1. **Panel «Tu relación» bajo la portada:** con sesión, el panel deja la columna derecha de la portada y pasa a una franja a todo el
   ancho justo debajo, antes de las pestañas: los tres conmutadores a la izquierda y las demás filas en columnas. La portada vuelve a
   su alto propio y el nombre sube. Sin sesión, «Seguir a {artista}» sigue en la portada.
2. **Sin imagen repetida:** si el retrato es una carátula, esa carátula no se repite en el abanico; si no queda otra, el fondo toma
   su color y se dibuja el disco.
3. **Ficha con jerarquía:** tres líneas como mucho —datos; alineación, premios y comunidad; enlaces—; la alineación muestra hasta 3
   nombres y cuántos más; los enlaces van en texto atenuado sin subrayado punteado.
4. **Datos con su palabra:** «Primer disco 1977» y «Falleció …» llevan su rótulo visible.
5. **Abanico libre:** al no haber panel en la portada, el abanico ya no queda tapado.
6. **Carátulas resueltas al cargar:** si a la discografía principal le faltan carátulas por resolver para llenar la portada, el
   servidor resuelve hasta 12 (de la más reciente a la más antigua) con un presupuesto de tiempo; lo que no llega a tiempo termina
   después de responder, para la próxima visita.

### Non-Goals

- Cambiar las filas del panel o sus acciones; las pestañas; la discografía.

## Capabilities

### Modified Capabilities

- `artist-header`: portada sin carátula repetida y con carátulas resueltas al cargar; ficha en tres líneas con rótulos donde hacen
  falta.
- `artist-page-layout`: el panel «Tu relación» va en una franja bajo la portada.
- `artist-personal-panel`: el panel se presenta como franja horizontal bajo la portada.

## Impact

`layout.tsx`; `ArtistStage.tsx`, `artist-stage.ts`, `ArtistHeader.tsx`, `ArtistRelationPanel.tsx`; un servicio nuevo
`src/services/catalog/stage-covers.ts` (resolución con presupuesto, reutiliza `findOrResolveCover`, 0 llamadas a MusicBrainz);
mensajes; tests; `docs/05-features/catalog-browsing.md`. Sin API ni esquema. Las páginas informativas no cambian (mismas miniaturas
de 250 px).
