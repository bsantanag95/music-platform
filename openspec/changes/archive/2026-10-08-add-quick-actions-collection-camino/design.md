## Context

El diálogo (`QuickActionsDialog`) ya separa acciones con objetivo (buscador compartido + panel) y acciones sin objetivo (Nueva lista). Los contratos necesarios existen: `addCollectionEntry` (audiencia por defecto en servidor), `removeCollectionEntry` (para deshacer), `activateArtistJourney` (idempotente; ingiere la discografía), `getArtistJourneyStatuses` (lectura por lote, sin ingesta) y `createCamino` (audiencia por defecto en servidor).

## Decisions

### D1 — Colección: formato como único paso extra, aplicar al tocar
Tras elegir el álbum se muestran los cuatro formatos; tocar uno llama a `addCollectionEntry({ releaseGroupId, format })` y confirma con "Deshacer" (`removeCollectionEntry(entry.id)`). No se lee estado previo: tener varias copias de un álbum es válido (cada una es una entrada), así que no hay riesgo de quitar nada al elegir. Solo álbumes: la colección es de álbumes.

### D2 — Recorrido: leer antes de activar
Tras elegir el artista se consulta `getArtistJourneyStatuses([id])` (una consulta a `user_list`, sin ingesta). Si ya existe: "Ya está en tu Recorrido" + enlace a `/me/artist-journeys/{id}`. Si no: `activateArtistJourney`, que puede tardar porque ingiere la discografía de un artista sin explorar (es la acción explícita de la persona, no una lectura); se muestra el estado "Activando…". Solo artistas.

### D3 — Nuevo Camino: título y listo, y enlazar con "A lista"
Formulario mínimo, sin descripción ni audiencia (`createCamino({ title })`, audiencia por defecto del servidor). Al crearlo: "Ver Camino" (`/me/caminos/{id}`) y "Agregar a este Camino", que cambia al chip "A lista" con la búsqueda fijada a álbumes, igual que "Nueva lista". `AddToListPanel` ya ofrece los Caminos propios para objetivos de álbum, así que no hay lógica nueva.

### D4 — Orden de chips
Las acciones sobre un objetivo primero y las de creación después: Escucha, Valorar, Favorito, Pendiente, Colección, Recorrido, A lista, Nueva lista, Nuevo Camino. Escucha sigue siendo la preseleccionada.

## Risks / Trade-offs

- **[Nueve chips ocupan más filas]** → Se envuelven en el mismo `flex-wrap`; el camino principal (Escucha) no cambia.
- **[Activar un recorrido de un artista sin explorar espera a MusicBrainz]** → Es una acción explícita y muestra progreso; el caso ya-existente no ingiere.

## Open Questions

- Ninguna.
