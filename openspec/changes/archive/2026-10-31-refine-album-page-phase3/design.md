## Context

`ReviewIndex` dibuja una tabla y `ReviewComposer` el formulario completo siempre que no hay reseña propia. El panel
"Tu relación" abre el formulario con `revealReviewComposer()` (evento) o navegando con `#your-review`.
`EditionsTable` muestra los formatos crudos con `describeFormats` (que también usa `EditionExtraTracks`).

## Decisions

### D1. Lista en lugar de tabla

Cada reseña es un `<li>` con cuadrícula `avatar | contenido | nota`. El titular sigue siendo el enlace al modal
(`reviewHeadline`: título o, sin título, extracto). Solo cuando hay título se agrega el extracto del cuerpo en dos
líneas (`line-clamp-2`), para no repetir el mismo texto. El monograma usa `UserAvatar` con `avatarUrl: null`; una
cuenta desactivada no lleva monograma (no hay usuario).

### D2. Formulario plegado

Sin reseña propia, `ReviewComposer` empieza cerrado (`open = false`) y muestra una invitación con un botón. El botón,
el evento de `revealReviewComposer()` y la llegada con `#your-review` lo abren y enfocan el cuerpo. Con reseña propia
no cambia (resumen con Editar / Borrar). Al borrar la reseña vuelve a la invitación cerrada.

### D3. Nombres de formato

`formatName(format, t)` traduce los formatos conocidos de MusicBrainz y deja el resto tal cual (son nombres propios
del dato: "SACD", "Blu-ray", "DVD-Video"). Las medidas de vinilo se conservan con `^(\d+)" Vinyl$` → "Vinilo 12″".
`describeFormats` acepta el traductor como segundo argumento opcional; sin él, compacta como antes.

### D4. Filtros con cifras y orden fijo

`FAMILY_ORDER = cd, vinyl, cassette, digital, other`, solo las familias con alguna edición visible según "Incluir no
oficiales" (un filtro con 0 llevaría a una tabla vacía; al ocultar las no oficiales se vuelve a "Todas"). La cifra
cuenta las ediciones que se verían con ese filtro, y "Todas" lleva el total visible.

### D5. Cabecera fija

Un `position: sticky` no funciona dentro de un contenedor con `overflow-x: auto`. El contenedor desplaza solo por
debajo de `sm` (`overflow-x-auto sm:overflow-visible`); desde `sm` la tabla cabe y su `<thead>` se pega a
`top: calc(var(--site-header-h) + var(--album-tabs-h))`, las variables que ya define el layout.

### D6. URL canónica del enlace del panel

El enlace "Escribir reseña" del panel apuntaba a la pestaña por id; la ruta redirige a la URL con slug y la
navegación de Next pierde `#your-review`. Con el formulario siempre abierto no se notaba; plegado, llegaba cerrado. El
layout pasa al panel la URL canónica (`loadAlbumSegment`, la misma que usa la pestaña), así no hay redirección.

## Risks / Trade-offs

- **Sin cabecera fija en móvil**: la tabla desplaza en horizontal ahí; es el precio de no romper el desplazamiento.
