## Why

La página de gestión del recorrido (`/me/artist-journeys/[artistId]`) hoy muestra de entrada, ya
expandida, la grilla completa de casilleros de toda la discografía del artista para editar la
selección — el mismo control que solo hace falta cuando el usuario quiere *cambiar* algo. El
contenido principal debería ser la propia selección ya elegida (con carátula, agrupada, ordenable,
en modo lista o gráfico), no un formulario de edición desplegado por defecto. Además el layout
actual está pegado al borde izquierdo, sin foto del artista ni enlaces desde los álbumes/artista
hacia sus propias páginas.

## What Changes

- El editor de selección (grupos de casilleros por categoría) deja de mostrarse expandido al
  cargar la página: aparece detrás de una acción explícita ("Agregar o quitar álbumes"), que lo
  despliega sin perder nada de lo ya construido (borrador local, guardar en una sola operación).
- Nuevo contenido principal de la página: la selección actual del recorrido, agrupada por
  categoría, con carátula y datos de cada álbum, ordenable por fecha de lanzamiento o
  alfabéticamente, con dos modos de visualización (lista y gráfico).
- Cada álbum de esa vista ofrece una acción de quitar directa, que usa el mismo borrador local y
  el mismo "Guardar" ya existentes (no borra nada hasta confirmar).
- El título de cada álbum enlaza a su propia página (`/album/[id]`) y el nombre del artista, en el
  encabezado, enlaza a su página (`/artist/[id]`).
- La foto del artista se incorpora al encabezado de la página.
- El contenedor de la página pasa de alineado a la izquierda a centrado.

## Capabilities

### Modified Capabilities
- `artist-journey`: la página de gestión cambia de mostrar el editor de selección expandido por
  defecto a mostrarlo detrás de una acción explícita, y gana una vista principal de la selección
  actual (agrupada, ordenable, con dos modos de visualización, carátulas, foto del artista y
  enlaces a álbum/artista).

## Impact

- `src/components/artist-journey/ArtistJourneyManager.tsx`: reestructura el layout; el editor
  pasa a estar colapsado por defecto; se agrega la nueva vista de selección.
- Nuevo componente para la vista de selección (agrupada, ordenable, lista/gráfico, con quitar
  directo) — comparte primitivas ya existentes (`CoverThumb`, patrón de `ItemsDetailed`/
  `ItemsGraphic` de listas).
- `src/app/[locale]/me/artist-journeys/[artistId]/page.tsx`: pasa la foto del artista
  (`artist.photoUrl`) al componente de gestión.
- Sin cambios de modelo de datos ni de endpoints: reutiliza `ArtistJourneyAlbum.coverThumbUrl`
  (ya expuesto) y las acciones ya existentes (`toggleAlbum`, `save`).
