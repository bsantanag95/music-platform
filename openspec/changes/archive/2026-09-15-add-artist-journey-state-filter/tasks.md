## 1. Filtro de estado

- [x] 1.1 `ArtistJourneyList`: agregar estado local `stateFilter: "all" | ArtistJourneySummary["state"]`
      (default `"all"`), aplicado en el `useMemo` de `visible` junto a la búsqueda, antes de
      ordenar.
- [x] 1.2 `FilterSelect` de estado junto al de orden, con opciones Todo/En curso/Completo/
      Archivado (reutilizando `stateInProgress`/`stateComplete`/`stateArchived` ya existentes).
- [x] 1.3 Estado vacío ("Listado vacío") sigue sin mostrar buscador/orden/filtro/modo cuando no
      hay ningún recorrido — sin cambios ahí, solo confirmar que el filtro nuevo respeta esa
      condición.

## 2. i18n

- [x] 2.1 Agregar `stateFilterLabel` y `stateFilterAll` a `messages/es/artistJourney.json` y
      `messages/en/artistJourney.json`.

## 3. Ajuste incidental de ancho (página de gestión)

- [x] 3.1 `ArtistJourneySelectionView`: ensanchar el `widthClassName` del `FilterSelect` de orden
      para que "Fecha de lanzamiento" no se trunque.

## 4. Pruebas y verificación

- [x] 4.1 Tests de `ArtistJourneyList`: filtrar por cada estado, "Todo" muestra los tres, se
      combina con búsqueda y orden, no persiste entre montajes.
- [x] 4.2 `npm run typecheck`, `npm run lint`, `npm test` (suite completa).
- [x] 4.3 `npm run build` (con `.next` limpio si hace falta).
- [x] 4.4 Verificación manual en navegador: filtrar por cada estado en `/me/artist-journeys`,
      combinarlo con búsqueda y orden, y confirmar en la página de gestión que "Fecha de
      lanzamiento" ya no se trunca en el desplegable de orden.

## 5. OpenSpec

- [x] 5.1 `openspec validate add-artist-journey-state-filter --strict`.
