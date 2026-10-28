## Context

`listAllFollowedArtists` devuelve `followedAt`, `news` (calendario: la próxima por salir o la más reciente de los últimos
30 días) y `latestRelease` (último Álbum/EP publicado de la discografía guardada). Las filas solo muestran foto y nombre.

## Decisions

### D1. Línea de detalle

Índice: bajo el nombre, en una línea que se parte entre unidades: país (`Intl.DisplayNames`), tipo (solo persona,
grupo, orquesta y coro; el resto no se nombra), "Último: <disco> (año)" con enlace al álbum, y "Lo sigues desde <mes
año>". Cada dato se omite si falta. El país llega en el servicio (`artist.country`).

### D2. Novedad

Una segunda línea en ámbar: "Sale el 14 nov: «X»" (futura) o "Salió hace 5 días: «X»" (pasada, fecha relativa),
enlazada al álbum si la entrada del calendario está vinculada. Cuando hay novedad, "Último" no se repite si es el mismo
disco.

### D3. Sección "Con novedades"

Solo con el segmento Todos y al menos una novedad: dos secciones, "Con novedades" y "El resto", con su cantidad; el
orden elegido se aplica dentro de cada una. En los demás segmentos, lista sin secciones.

### D4. Gráfico

Insignia ámbar abajo a la izquierda de la foto: la fecha corta si sale, "Nuevo" si ya salió. Nombre debajo, sin línea
de detalle (no cabe en 106 px).

### D5. Riel

Desde `lg`, grilla `minmax(0,1fr) 260px` como `/me/feed`: hasta seis novedades, primero las que salen (más cercana
primero) y luego las recientes (más nueva primero), con artista, título y fecha. Sin novedades, no hay riel y la página
queda en `max-w-4xl`. Por debajo de `lg` no se muestra: la sección "Con novedades" ya las lista.
