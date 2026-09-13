## Why

`want-to-listen` (Want to Listen) solo se puede marcar desde las páginas de catálogo de
artista y álbum. Pero la intención más común de "quiero volver a escuchar esto" surge
justamente al ver una escucha ya registrada en el propio diario — ahí el usuario ya está
mirando el objetivo, sin tener que navegar a su página. Letterboxd resuelve el mismo caso
dejando agregar una película ya vista al watchlist desde su entrada de diario, para señalar
intención de reverla.

## What Changes

- Nueva acción rápida **"Quiero volver a escuchar"** en el menú "···" de una fila del diario
  propio (`/me/diary`), junto a "Registrar otra escucha", "Agregar a lista" y "Mostrar en
  listas" — para artista y álbum, nunca para canción (mismo alcance que `want-to-listen`).
- Reutiliza el toggle existente (`POST /api/me/want-to-listen`) sin nuevo endpoint ni cambio
  de contrato. Como el menú no refleja el estado actual del objetivo, la acción anuncia
  explícitamente el resultado ("Se agregó..." / "Se quitó...") para que un segundo clic sobre
  un objetivo ya marcado nunca sea una sorpresa silenciosa.

## Capabilities

### New Capabilities
_(ninguna)_

### Modified Capabilities
- `listen-diary`: el `Requirement: Acciones rápidas desde la fila del diario` gana una tercera
  acción rápida ("Quiero volver a escuchar"), con el mismo alcance de objetivo que
  `want-to-listen` (artista/álbum, no canción).

## Impact

- **UI**: `src/components/diary/DiaryActivityList.tsx` gana un ítem de menú condicional
  (oculto para canciones), un estado de resultado con destello ámbar en la fila y un anuncio
  accesible — mismo patrón ya usado por la confirmación de guardado de esa fila.
- **API/datos**: sin cambios — reutiliza `toggleWantToListen`
  (`src/lib/api/want-to-listen.ts`) y el endpoint `want-to-listen` ya existente.
- **Sin impacto** en el contrato de `listen-diary` (creación/edición/borrado de escuchas) ni
  en `want-to-listen` fuera de este nuevo punto de entrada.
