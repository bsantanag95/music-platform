## Why

En la página de gestión, ver la propia selección ya elegida (carátulas, orden, vista de lista o
gráfico — `redesign-artist-journey-management-view`) hace evidente que falta el paso siguiente:
marcar qué de esa selección ya se escuchó. Hoy, para registrar una escucha hay que salir de la
página de gestión (ir a la página del álbum o al acceso global "+ Registrar"). Poder registrarla
directamente desde cada álbum de la selección cierra el ciclo completar → escuchar → ver progreso
sin salir de la página.

## What Changes

- Cada álbum de la vista de selección (lista y gráfico) ofrece una acción "Registrar escucha" que
  crea una entrada de diario privada para ese álbum sin salir de la página de gestión (mismo
  registro rápido que `MarkAsListened`/`RegisterListenDialog` ya usan en el resto del catálogo —
  reutiliza el mismo endpoint, no crea uno nuevo).
- Tras registrar, se abre automáticamente el mismo panel de ampliación que ya usa `MarkAsListened`
  (Impresión/Contexto/Reacción/Audiencia) sobre la entrada recién creada, sin salir de la página;
  un enlace "Ampliar"/"Cerrar" permite volver a mostrarlo u ocultarlo después.
- Cada álbum de la selección expone si el propietario ya tiene alguna escucha registrada; ese
  estado se refleja en su fila o tile (p. ej. una marca de "Escuchado").
- El progreso del recorrido (barra discreta, texto "N de M escuchados", y el estado derivado —
  en curso/completo) se actualiza de inmediato tras registrar una escucha, sin recargar la página.
- Un álbum ya escuchado sigue permitiendo registrar otra escucha (el diario no es un checklist:
  admite más de un registro por álbum).
- Fuera de alcance: el editor de selección (grilla de casilleros) no gana esta acción — es para
  elegir qué forma parte del recorrido, no para registrar escuchas.

## Capabilities

### Modified Capabilities
- `artist-journey`: gana una nueva acción (registrar escucha desde la vista de selección) y cada
  álbum de un recorrido expone si ya tiene alguna escucha registrada. No modifica ninguna de las
  requirements existentes — se agrega como capacidad nueva para no depender de otro cambio de
  `artist-journey` (`redesign-artist-journey-management-view`) todavía sin archivar.

## Impact

- `src/services/artist-journeys/artist-journeys.ts`: `ArtistJourneyAlbum` gana el campo
  `listened: boolean`; `buildDetail` lo calcula junto con `progress.listenedCount` (reemplaza el
  `countListened` actual, acotado a la selección, por una consulta sobre toda la discografía para
  poder marcar cada álbum).
- `src/lib/api/schemas.ts`: `ArtistJourneyAlbumSchema` gana `listened: z.boolean()`.
- `src/components/artist-journey/ArtistJourneySelectionView.tsx`: acción "Registrar escucha" por
  álbum en ambos modos (lista y gráfico), y panel "Ampliar" que reutiliza
  `src/components/diary/ListenEntryForm.tsx` sin modificarlo.
- `src/components/artist-journey/ArtistJourneyManager.tsx`: maneja el registro (reutiliza
  `createListenEntry` de `@/lib/api/diary`), refresca el recorrido (`getArtistJourney`, ya
  existente en `@/lib/api/artist-journeys`) sin tocar el borrador de selección en curso, y guarda
  en memoria la última entrada creada por álbum para alimentar el panel de ampliación.
- Sin endpoints nuevos: reutiliza `POST /api/me/diary` (`createListenEntry`),
  `PATCH /api/me/diary/[id]` (`updateListenEntry`, ya usado por `ListenEntryForm`) y
  `GET /api/me/artist-journeys/[artistId]` (`getArtistJourney`), todos ya existentes.
