## Context

`/me/artists` llama a `listFollowedArtists(user, 1, 50)` y `FollowedArtistList` filtra y ordena en memoria. Cada
`FollowedArtistRow` lleva un toggle "Siguiendo" optimista y un `RowMenu` con "Agregar elemento" y "Marcar como
favorito". `/me/progress` ya resolvió el parpadeo del modo (`ready`), el Deshacer (`UndoToast`) y los filtros en la URL.

## Decisions

### D1. Todos los artistas

`listAllFollowedArtists(userId)` sin límite, en el orden de siempre (más reciente primero), con `favorite` calculado
con un `EXISTS` sobre `favorite` del mismo usuario. La búsqueda y el orden siguen en memoria: seguir a miles de
artistas no es el caso de uso, y una lista completa evita que la búsqueda pierda resultados.

### D2. Dejar de seguir con Deshacer

Desde el menú ⋯. Al confirmar la llamada, la fila se quita y aparece `UndoToast`; Deshacer vuelve a seguir y repone la
fila en su índice. Si falla, el aviso lo dice y no ofrece Deshacer. Sin diálogo de confirmación: Deshacer cubre el error
sin pedir un paso más.

### D3. Menú

`RowMenu` con `label` "Acciones para «X»", trigger `size-8` y 44 px con puntero grueso. "Añadir a una lista" abre el
`AddToListPanel` de siempre. El favorito conoce su estado inicial (`favorite` del servidor) y lo invierte con el
resultado de `toggleFavorite`.

### D4. Base

`useFollowedArtistViewMode` devuelve `ready`; hasta entonces el listado muestra filas neutras. `q` y `sort` se escriben
con `replaceState` (solo lo que difiere del defecto); la página los valida y los pasa como iniciales. Metadata con el
título. Cabecera a la izquierda (`max-w-4xl`), migas Inicio / Artistas que sigo, y la cuenta en el subtítulo.
