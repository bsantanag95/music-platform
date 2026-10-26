## Context

`/me/lists` tiene hoy tres pestañas (Mis listas, Guardadas, Descubrir), "Nueva lista" dentro de Mis listas con un
formulario en línea y, desde la Fase 1, filtros de Mis listas en la URL. Pendientes, Favoritos y Colección ya resolvieron
la misma barra en su Fase 2.

## Decisions

**D1. `counts` sin filtros.** Cada respuesta de Mis listas y de Guardadas trae cuántas listas hay de cada tipo, contadas
sin `q` ni `entityType`: las cifras de los segmentos no bailan mientras se escribe, y su suma es el total de la pestaña.
Es una consulta agrupada más por página (índice por `owner_id`; las guardadas, por `saver_id`).

**D2. Guardadas filtra en el servidor.** `listSavedLists` reusa las condiciones de `listMyLists` sobre `user_list`
(`q` sobre el título, `entityType`). `sort=recent` es la fecha de guardado (el orden de hoy); `alpha`, el título.

**D3. "Nueva lista" en un diálogo de la cabecera.** `NewListButton` abre `Dialog` con `ListForm`; al crear invalida
`["lists", "mine"]` y, si se estaba en Guardadas, navega a Mis listas. `?new=1` (el enlace "Crear lista" de `/lists`)
lo abre al montar. Se quitan el botón en la pestaña y el formulario en línea; el estado vacío de Mis listas abre el mismo
diálogo.

**D4. Totales vivos.** `ListsSection` recibe los totales iniciales del servidor y expone un contexto: cada pestaña informa
su total (suma de `counts`) al recibir una respuesta, así borrar, crear o dejar de guardar actualiza la pestaña sin
recargar.

**D5. Descubrir sale de `/me/lists`.** La pestaña mostraba lo mismo que "Recientes" de `/lists` con tarjetas viejas. Queda
un enlace "Descubrir en Comunidad" al final de la fila de pestañas y `?tab=discover` redirige (307) a `/lists`. Se borra
`DiscoverListsTab`; el endpoint `/api/lists/discover` sigue igual.

**D6. Barra.** `ListTypeSegments` (calcado de `WantToListenTypeSegments`, con Canciones) y `ListSortSelect` (calcado de
`WantToListenSortSelect`). `ListsToolbar` usa los segmentos cuando recibe `counts` y el selector de tipo si no (el perfil
ajeno no tiene `counts`); el orden pasa al selector nuevo en ambos casos.

## Risks / Trade-offs

- [Un enlace a `?tab=discover` guardado por alguien] → La redirección lo lleva a `/lists`.
- [Una consulta de conteo más por página] → Agrupada sobre las listas de una persona: decenas de filas.
