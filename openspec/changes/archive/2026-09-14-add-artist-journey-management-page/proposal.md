## Why

Editar la selección de un recorrido hoy ocurre en un modal embebido en la página del artista
(`ArtistJourneyModal`). El modal ya resolvió el problema de rendimiento (borrador local + un solo
guardado), pero fue explícitamente pensado como solución transitoria: al cerrar ese spec, el
usuario pidió una **página dedicada de gestión** con más detalle que el modal, dejando la página
del artista únicamente para mostrar el estado actual del recorrido y redirigiendo a esa página
dedicada cualquier acción de edición (`Pagina dedicada la dejamos al siguiente spec`). Este cambio
implementa esa página dedicada, en dos vistas: un listado de todos los recorridos propios (ya
existe, en modo solo-lectura) y una vista de detalle por artista donde ocurre toda la gestión
(selección, archivar/desarchivar, borrar).

## What Changes

- Nueva ruta `/me/artist-journeys/[artistId]` (vista de detalle): reemplaza al modal como lugar
  donde ocurre la selección de álbumes agrupada por categoría (borrador local + guardar en una
  sola operación), y concentra ahí también archivar/desarchivar y borrar — hoy dispersas en la
  tarjeta de la página del artista.
- `/me/artist-journeys` (vista de listado, ya existente) pasa de enlazar a la página del artista a
  enlazar a la nueva página de detalle de gestión de cada recorrido, y agrega un buscador por
  nombre de artista, un orden (por agregado, alfabético o por estado) y los mismos tres modos de
  visualización que el resto de la aplicación (Detallada/Índice/Gráfico), todo resuelto en el
  cliente sobre el listado ya cargado.
- `ArtistJourneySection` (tarjeta en la página del artista) se simplifica a un resumen de solo
  lectura: estado, progreso, y un único enlace "Gestionar recorrido" hacia la página de detalle
  cuando ya hay un recorrido. Deja de ofrecer archivar/desarchivar/borrar directamente ahí.
- `ArtistJourneyModal` (edición general de la selección) se elimina; su UI de selección agrupada
  y colapsable se traslada, sin cambios de comportamiento, a la nueva página de detalle.
- Revisión tras verificación con el usuario: "Armar recorrido" en la página del artista **no**
  activa de inmediato. Abre un nuevo modal de inicio (`ArtistJourneyStartModal`, propósito
  distinto al modal eliminado: solo crear, nunca editar un recorrido ya activo) con la
  discografía agrupada y los álbumes de estudio preseleccionados como borrador editable.
  "Cancelar" cierra sin tocar el servidor — un clic accidental en "Armar recorrido" no deja nada
  creado. "Guardar" activa el recorrido y guarda la selección elegida en una sola acción, y recién
  ahí navega a la página de gestión — que llega mostrando "Guardar" deshabilitado con una señal de
  "sin cambios pendientes" porque el usuario ya guardó explícitamente lo que ve, no porque algo se
  haya persistido en su nombre sin pedírselo.
- El listado propio (`/me/artist-journeys`) agrega la posibilidad de eliminar un recorrido
  directamente desde ahí (confirmación de dos pasos), sin tener que entrar a su página de
  gestión.
- Sin cambios de modelo de datos ni de endpoints nuevos: tanto la página de detalle como el modal
  de inicio y la eliminación desde el listado reutilizan la API existente
  (`GET/POST/DELETE /api/me/artist-journeys/[artistId]`, `PUT .../items`, `POST/DELETE
  .../archive`).

## Capabilities

### New Capabilities
(ninguna)

### Modified Capabilities
- `artist-journey`: la vista de gestión agrupada por tipo deja de vivir en un modal de edición
  general y pasa a una página dedicada `/me/artist-journeys/[artistId]`; archivar/desarchivar y
  borrar se agrupan ahí en lugar de en la página del artista; el listado propio
  (`/me/artist-journeys`) enlaza a esta nueva página en lugar de a la página del artista, agrega
  buscador/orden/modos de visualización, y permite eliminar un recorrido sin salir del listado;
  la tarjeta de la página del artista pasa a ser de solo lectura; crear un recorrido pasa a
  ocurrir a través de un modal de inicio propio (selección + activación en una sola acción de
  usuario), en vez de activarse de inmediato al hacer clic.

## Impact

- `src/components/artist-journey/ArtistJourneyModal.tsx`: eliminado (modal de edición general).
- `src/components/artist-journey/ArtistJourneyAlbumGroups.tsx`: nuevo — grilla de selección
  agrupada/colapsable extraída como componente compartido, ya usado por dos consumidores
  (`ArtistJourneyManager` y `ArtistJourneyStartModal`).
- `src/components/artist-journey/ArtistJourneyStartModal.tsx`: nuevo — modal de inicio, única vía
  para crear un recorrido.
- `src/components/artist-journey/ArtistJourneySection.tsx`: reescrito a resumen de solo lectura;
  ahora recibe `albums`/`categoryLabels`/`artistName` para poder abrir el modal de inicio.
- `src/components/artist-journey/ArtistJourneyManager.tsx`: usa `ArtistJourneyAlbumGroups` en vez
  de la grilla inline (sin cambios de comportamiento).
- `src/components/artist-journey/ArtistJourneyList.tsx`: pasa a ser un orquestador de cliente con
  buscador, orden, conmutador de modo, un renderer por modo (`ArtistJourneysDetailed/Index/
  Graphic.tsx`, `ArtistJourneyModeSwitcher.tsx`, `artist-journey-view-mode.ts`,
  `use-artist-journey-view-mode.ts`, calcados de `want-to-listen`) y estado local de la lista
  para poder eliminar una entrada sin recargar (`ArtistJourneyDeleteButton.tsx`, calcado de
  `RemoveEntryButton` de Want to Listen).
- `src/app/[locale]/me/artist-journeys/[artistId]/page.tsx` y su componente cliente de gestión
  (selección agrupada, archivar/desarchivar, borrar).
- `src/app/[locale]/(catalog)/artist/[id]/page.tsx`: sin queries nuevas — pasa a
  `ArtistJourneySection` datos (`albums`, `categoryLabels`) que ya cargaba para `AlbumGrid`.
- `messages/{es,en}/artistJourney.json`: nuevas claves para la página de detalle, el modal de
  inicio y la eliminación desde el listado; algunas claves quedan sin uso y se retiran.
- Sin cambios en `src/services/artist-journeys/`, `src/lib/api/artist-journeys.ts` ni en el schema
  de base de datos — el modal de inicio y la eliminación desde el listado reutilizan los wrappers
  de API ya existentes.
