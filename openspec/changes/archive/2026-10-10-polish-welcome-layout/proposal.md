## Why

La primera revisión visual de `/welcome` con capturas reales (375 px, 2026-10-10) encontró dos problemas de composición:

- **Huecos verticales en cada paso.** Entre el campo de búsqueda y la nota de visibilidad (o la nota final del paso) había 50–70 px de vacío: la región de estado de la búsqueda reservaba una altura mínima aunque no dijera nada, y la lista de resultados se renderizaba vacía, cada una con su separación. Además, el enlace «Cambiar» de la nota de audiencia caía solo en su línea con 44 px de alto.
- **El resumen no tenía jerarquía.** «Ir a Inicio» y cuatro salidas más eran botones del mismo peso que ocupaban tres filas en móvil; las sugerencias (géneros, valorar) se leían igual que la navegación (Explorar, Buscar gente).

## What Changes

- **Sin vacíos**: la región de estado de la búsqueda (`status`, aria-live) sigue montada pero sin altura mínima; la lista de resultados solo se renderiza si hay resultados; «Cambiar» conserva su zona táctil de 44 px con márgenes negativos para no engordar la línea. Los huecos pasan de ~50–70 px a 24–32 px.
- **Resumen con una sola acción principal**: «Ir a Inicio» es el único botón (ancho completo en móvil). Las demás salidas pasan a una lista «También puedes» de filas con flecha: lo que aún no hizo (elegir géneros, valorar un disco) primero, después Explorar (si está activo) y Buscar gente.

## Capabilities

### Modified Capabilities

- `onboarding`: el resumen presenta una sola acción principal y el resto como salidas secundarias.

## Impact

- `SearchStatus`, `AudienceNote`, los cuatro pickers (`AlbumIdentityPicker`, `ArtistFollowPicker`, `NowPlayingPicker`, `WantToListenPicker`), `WelcomeFlow` (resumen y `SummaryLink`); `messages/{es,en}/onboarding.json` (`summary.also`); pruebas; `docs/05-features/onboarding.md`.

## Non-Goals

- Rediseñar el pie (largo en móvil) o el contacto de retiro de carátulas.
- La vista de escritorio, que no se pudo revisar con capturas.
