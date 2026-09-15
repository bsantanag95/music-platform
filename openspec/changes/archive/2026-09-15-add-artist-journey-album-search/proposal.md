## Why

Elegir qué álbumes forman parte de un recorrido implica revisar la discografía completa del
artista, agrupada por categoría — con artistas de catálogo extenso (varias décadas, decenas de
álbumes) encontrar un título puntual significa expandir grupos y desplazarse por la lista. Un
buscador que filtre por título resuelve ese caso sin tocar el resto del flujo de selección.

## What Changes

- La selección de álbumes agrupada por categoría (`ArtistJourneyAlbumGroups`, compartida por el
  editor de la página de gestión y el modal de inicio) gana un buscador por título de álbum,
  sin distinguir mayúsculas ni diacríticos (mismo criterio que el buscador de
  `/me/artist-journeys`).
- Mientras hay texto de búsqueda, los grupos con algún álbum coincidente se muestran expandidos
  sin importar su estado de colapso guardado; los grupos sin coincidencias no se muestran. Al
  vaciar la búsqueda, el estado de colapso previo vuelve a regir.
- Si ningún álbum de toda la discografía coincide, se muestra un estado vacío localizado.
- La búsqueda es solo de filtrado visual: no cambia qué álbumes toca "Seleccionar todo" de un
  grupo (sigue operando sobre el grupo completo) ni la selección ya hecha.

## Capabilities

### Modified Capabilities
- `artist-journey`: la vista agrupada de selección de álbumes (editor de la página de gestión y
  modal de inicio) gana un buscador por título. No modifica ninguna requirement existente — se
  agrega como capacidad nueva por la misma razón que `add-artist-journey-mark-listened`: dos
  cambios previos de `artist-journey` (`redesign-artist-journey-management-view`,
  `add-artist-journey-mark-listened`) siguen sin archivar.

## Impact

- `src/components/artist-journey/ArtistJourneyAlbumGroups.tsx`: agrega el campo de búsqueda y el
  filtrado; sin cambios de props (el estado de búsqueda es interno al componente).
- `src/components/artist-journey/artist-journey-list-shared.tsx`: reutiliza `normalizeForSearch`
  ya existente, sin cambios.
- `messages/es/artistJourney.json` / `messages/en/artistJourney.json`: nuevas claves para el
  placeholder del buscador y el estado vacío.
- Sin cambios de servicio, esquema ni endpoints — filtrado puramente del lado del cliente sobre
  datos ya cargados.
