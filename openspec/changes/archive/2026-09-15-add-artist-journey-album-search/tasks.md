## 1. Buscador

- [x] 1.1 `ArtistJourneyAlbumGroups`: agregar estado local `query`; filtrar cada grupo por título
      con `normalizeForSearch` (de `./artist-journey-list-shared`), sin distinguir mayúsculas ni
      diacríticos.
- [x] 1.2 Mientras hay búsqueda activa: ignorar `collapsed` y mostrar expandido cualquier grupo
      con coincidencias; no renderizar grupos sin coincidencias; deshabilitar el botón de
      colapsar/expandir de cada grupo (nada que alternar mientras se busca).
- [x] 1.3 Estado vacío localizado cuando ningún álbum de toda la discografía coincide.
- [x] 1.4 El conteo `(seleccionados/total)` de cada grupo y el alcance de
      "Seleccionar todo"/"Deseleccionar todo" siguen sobre el grupo completo, no el subconjunto
      filtrado (D2 de design.md).

## 2. i18n

- [x] 2.1 Agregar claves nuevas a `messages/es/artistJourney.json` y
      `messages/en/artistJourney.json` (placeholder del buscador, estado "sin resultados").

## 3. Pruebas y verificación

- [x] 3.1 Tests de `ArtistJourneyAlbumGroups` (nuevo archivo o extendiendo los de sus
      consumidores): filtra por título, diacrítico-insensible, expande grupos con coincidencias
      sin tocar el colapso guardado, oculta grupos sin coincidencias, restaura el colapso al
      vaciar la búsqueda, estado vacío sin coincidencias, "Seleccionar todo" sigue aplicando al
      grupo completo durante una búsqueda activa.
- [x] 3.2 Confirmar que los tests existentes de `ArtistJourneyManager` y `ArtistJourneyStartModal`
      (consumidores de este componente) siguen pasando sin cambios de comportamiento fuera de la
      búsqueda.
- [x] 3.3 `npm run typecheck`, `npm run lint`, `npm test` (suite completa).
- [x] 3.4 `npm run build` (con `.next` limpio si hace falta).
- [x] 3.5 Verificación manual en navegador: buscar en el editor de la página de gestión y en el
      modal de inicio, con y sin diacríticos, un grupo colapsado que se expande solo por la
      búsqueda, vaciar la búsqueda y confirmar que el colapso previo vuelve, y un texto sin
      coincidencias.

## 4. OpenSpec

- [x] 4.1 `openspec validate add-artist-journey-album-search --strict`.
