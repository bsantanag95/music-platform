## Why

`artist-journey` (superficie `/artist-journeys`, nombre de producto "Recorrido") resolvió un solo
caso: seguir el propio progreso de escucha sobre la discografía de un artista. El nombre y la
ruta ya están anclados a ese caso específico — "Recorrido" no admite, sin ambigüedad, un conjunto
de álbumes armado a mano sin relación con un artista único, ni el progreso de un usuario sobre
una lista curada por otra persona. Ambos casos son pedidos reales de producto (armar un
recorrido temático propio; seguir el progreso sobre la lista de otro usuario, con una vitrina de
las más seguidas) y el modelo de datos de Listas (`user_list`/`user_list_item`/`list_save`) ya
tiene la forma para soportarlos sin duplicar mecanismo — falta la capa de progreso derivado que
hoy es exclusiva de `artist_journey`, generalizada para no depender de un artista ni de que el
dueño de la lista sea quien trackea.

## What Changes

- Nueva entidad **Camino**: un tercer subtipo de `user_list` (`kind = 'custom_journey'`), álbumes
  únicamente (`entityType = 'release-group'`), sin universo candidato de fondo — a diferencia de
  `artist_journey`, el Camino ES el conjunto de ítems que su dueño fue agregando, no una selección
  parcial sobre una discografía completa conocida de antemano.
- El progreso de un Camino propio (proporción de sus ítems con una escucha propia registrada en
  el diario) se deriva en lectura contra `listen_entry`, nunca se persiste — mismo mecanismo que
  ya usa `artist-journey` (`countsByListId`/`deriveJourneyState`), generalizado para no depender
  de `journeyArtistId`.
- **Trackear el progreso sobre una lista ajena**: cualquier usuario que guardó una lista de
  álbumes (`entityType = 'release-group'`, propia audiencia visible, `kind` `standard` o
  `custom_journey`) puede activar su propio seguimiento de progreso sobre ella, sin que el dueño
  de la lista opine ni se entere. Extiende `list_save` con un eje de tracking análogo al
  `following` ya existente; el progreso se calcula igual que en un Camino propio, pero
  parametrizado por `(quien trackea, listId)` en vez de `(dueño, listId)`.
- Nueva superficie `/me/caminos` (análoga a `/me/artist-journeys`): Caminos propios dinámicos +
  listas ajenas que el usuario está trackeando.
- Nueva superficie de descubrimiento público de Caminos, ordenada por conteo de trackeos activos
  (no por guardados simples), filtrable por género y por artista.
- **BREAKING**: ninguno — no se modifica ningún endpoint ni contrato existente de `lists` ni de
  `artist-journeys`; solo se agrega un valor de `kind` y un campo a `list_save`.

## Capabilities

### New Capabilities
- `camino`: el objeto Camino dinámico — creación, gestión de ítems, progreso derivado propio,
  archivado y borrado, listado propio en `/me/caminos`. Mismo patrón que `artist-journey` pero sin
  discografía de fondo ni artista asociado.
- `camino-discovery`: superficie pública de descubrimiento de Caminos populares (por conteo de
  trackeo activo), filtrable por género y artista.

### Modified Capabilities
- `list-saves`: agrega la posibilidad de activar/desactivar el trackeo de progreso propio sobre
  una lista guardada (de audiencia visible, `entityType = 'release-group'`), como un eje adicional
  del guardado — mismo nivel que `following` hoy.

## Impact

- **Esquema**: nueva migración — valor `custom_journey` en el CHECK de `user_list.kind`; columna
  de tracking (booleana) en `list_save`. Sin tablas nuevas.
- **Servicios**: nuevo `src/services/caminos/` (o análogo) que reutiliza y generaliza el patrón de
  `src/services/artist-journeys/artist-journeys.ts` (`buildDetail`, `countsByListId`,
  `deriveJourneyState`) para que el progreso ya no dependa de `journeyArtistId` ni asuma
  `ownerId === trackerId`. Modifica `src/services/lists/saved-lists.ts` (o equivalente) para el eje
  de tracking sobre `list_save`.
- **API**: nuevos endpoints bajo `/api/me/caminos` (crear, gestionar ítems, listar, archivar,
  borrar) y `/api/caminos/discover` (o similar); extiende el contrato de guardado de listas
  (`POST/PATCH` sobre `list_save`) con el campo de tracking.
- **Frontend**: nueva sección `/me/caminos`, acceso desde el menú de usuario y el panel de gestión
  del perfil (junto al acceso ya existente a `/me/artist-journeys`); acción de tracking en el
  detalle de una lista ajena (`/users/[username]/lists/[listId]`); nueva página de descubrimiento
  público.
- **Sin impacto** en `/artist-journeys` ni en la capability `artist-journey`: el subtipo
  `artist_journey` y su exclusión de toda lectura genérica de `user_list` (Requirement "Exclusión
  de toda superficie que lea listas genéricamente") permanecen intactos. `custom_journey` hereda el
  mismo criterio de exclusión respecto de `/me/lists`, Guardadas, Descubrir y los conteos
  genéricos de listas — se especifica en la capability `camino`, no se reabre `artist-journey`.
