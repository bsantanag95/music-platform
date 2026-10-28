## Context

`/me/artists` (Fase 1) carga todos los seguidos con `listAllFollowedArtists`, filtra y ordena en memoria y escribe `q` y
`sort` en la URL. El diálogo de "+ Añadir" del Header tiene acciones con buscador de objetivos (`TargetPicker`) y avisa
de los cambios con `OWN_DATA_CHANGED_EVENT`. El calendario de lanzamientos (`release_calendar_entry`) guarda
`artist_mbids` con índice GIN.

## Decisions

### D1. Seguir desde el diálogo de acciones rápidas

Acción nueva `follow` ("Seguir artista"), solo artistas. `FollowPanel` llama a `followArtist` (idempotente) y confirma
"Sigues a X" con un enlace a `/me/artists`. La cabecera de `/me/artists` abre el diálogo en esa acción. La lista escucha
`OWN_DATA_CHANGED_EVENT` y hace `router.refresh()`; sincroniza sus filas con lo que trae el servidor.

### D2. Novedad solo del calendario

Por artista seguido, entradas de `release_calendar_entry` con su MBID en `artist_mbids`, `exclusion IS NULL`, fecha
(`COALESCE(first_release_date, release_date)`) entre hoy − 30 días y el fin de la ventana del feed. Se elige la próxima
por salir y, si no hay, la más reciente. Se devuelve título, fecha y `release_group_id` si está vinculado.

### D3. Último disco de la discografía

Por artista, el release-group con crédito `primary`, Álbum o EP sin tipos secundarios, sin marca de fuera de la
discografía y ya publicado, el más reciente por año y fecha. Solo cuenta lo que ya está en el catálogo: un artista sin
explorar puede no tener dato.

### D4. Segmentos

Todos · Con novedades · Grupos (`group`, `orchestra`, `choir`) · Solistas (`person`), con su cuenta sobre la lista
completa (la búsqueda no cambia las cuentas). Otros tipos solo en Todos. `segment` en la URL, "all" por defecto. Mismo
componente de segmentos que `/me/progress` en forma, pero propio (sin compartir con su contexto).

### D5. Orden por último lanzamiento

Clave: fecha de la novedad o, si no hay, la del último disco (año → 1 de enero si no hay fecha). Más reciente primero;
sin dato, al final, en el orden de "Recientes".
