## Why

El listado propio de recorridos (`/me/artist-journeys`) ya permite buscar por artista y ordenar,
pero no acotar por estado. Con varios recorridos en curso, completos y archivados mezclados, no
hay forma de ver solo, por ejemplo, los archivados o solo los que ya están completos, más allá de
usar "Ordenar por estado" y desplazarse hasta el grupo que interesa.

## What Changes

- El listado gana un control de filtro por estado, con cuatro opciones excluyentes: Todo (por
  defecto), En curso, Completo, Archivado.
- El filtro se combina con el buscador y con el orden ya existentes, sin alterar ninguno de los
  dos ni la acción que ofrece cada entrada.
- Como el resto de los filtros de esta página, no persiste entre visitas — vuelve a "Todo" cada
  vez que se abre el listado.
- Incidental: en la página de gestión de un recorrido, el desplegable de orden de la vista de
  selección ("Fecha de lanzamiento" / "Alfabético") se ensancha lo suficiente para no truncar el
  texto de la primera opción.

## Capabilities

### Modified Capabilities
- `artist-journey`: el Requirement "Listado propio de recorridos" gana el control de filtro por
  estado, junto al buscador, el orden y el conmutador de modo ya existentes.

## Impact

- `src/components/artist-journey/ArtistJourneyList.tsx`: nuevo estado local `stateFilter`
  (`"all" | ArtistJourneySummary["state"]`, default `"all"`), aplicado en el mismo `useMemo` que
  ya filtra por búsqueda y ordena.
- `messages/es/artistJourney.json` / `messages/en/artistJourney.json`: claves nuevas para la
  etiqueta del control y la opción "Todo" (los estados ya tienen etiqueta propia —
  `stateInProgress`/`stateComplete`/`stateArchived` — reutilizada).
- `src/components/artist-journey/ArtistJourneySelectionView.tsx`: ajuste de ancho del
  `FilterSelect` de orden (sin cambio de comportamiento).
- Sin cambios de servicio, esquema ni endpoints — filtrado puramente del lado del cliente sobre
  datos ya cargados, igual que el buscador y el orden.
