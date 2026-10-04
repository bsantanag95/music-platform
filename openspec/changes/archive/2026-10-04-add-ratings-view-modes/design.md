## Context

`/me/ratings` es hoy una página de servidor que siembra `MyRatingsList` (cliente) con la primera
página de `listMyRatings`. La lista pagina con `useInfiniteQuery`, mantiene `items`/`total` en
estado local para editar en el lugar y refleja los filtros en la URL con `history.replaceState`.
Cada fila (`MyRatingRow`) monta su propio `RatingDetailDialog`.

Favoritos (`FavoritesWall`) y Want to Listen ya resolvieron el mismo problema: un hook de modo en
`localStorage`, un conmutador `radiogroup`, renderers por modo y secciones por tipo que parten una
lista plana ya ordenada por rango de tipo. Este cambio replica ese patrón.

Restricciones relevantes: los artistas no se valoran (la biblioteca filtra `artist_id IS NULL`); el
puntaje es solo del dueño; el repo no usa `drizzle-kit generate` ni se agregan dependencias; la
spec vigente exige que "Mejor nota" + año dé un ranking mezclado de álbumes y canciones.

## Goals / Non-Goals

**Goals:**
- Tres modos (Detallada, Índice, Gráfico) y agrupación por tipo, calcados de Favoritos.
- Pared de carátulas con overlay de nota (estrellas y `/100`) al hover/foco.
- Buscador `q`, `counts` por tipo y `group` en `GET /api/me/ratings`.

**Non-Goals:**
- Sin cambios de esquema, migraciones ni índices nuevos.
- Sin sección de "artistas valorados" ni conteo de artistas: los artistas no se valoran. (La
  agrupación **por artista** de las valoraciones de álbumes y canciones sí existe, ver D2.)
- Sin refactor a un hook/switcher de modo genérico compartido entre secciones.
- Sin edición de estrellas en la pared; sin vistas públicas de la biblioteca.

## Decisions

### D1. Agrupar partiendo una lista plana ya ordenada, no con consultas por sección
El servicio ordena por `[rango de tipo, ...orden elegido]` y el cliente parte la lista en secciones,
igual que `groupFavoritesByType`. Una sola consulta paginada, y "Cargar más" agrega al final de la
sección correspondiente porque el rango de tipo es el primer criterio.
`rango = CASE WHEN release_group_id IS NOT NULL THEN 0 ELSE 1 END`.

*Alternativa descartada:* una consulta paginada por sección. Duplica el estado de paginación y los
estados de carga/error sin beneficio, dado que el volumen por usuario es chico.

### D2. `group` con tres valores: `type` (por defecto), `artist` y `none`
`type` aplica el rango de tipo como primer criterio; `none` lo omite y reproduce el orden actual. Se
conserva `none` porque agrupar rompe el ranking mezclado "Top del año" que la spec ya promete; sin
esa salida habría que retirar un escenario existente.

`artist` agrupa por el artista principal acreditado (el mismo de `PRIMARY_ARTIST_SQL`): ordena por
`lower(nombre) ASC NULLS LAST`, luego por id del artista (los nombres pueden repetirse y cada
artista debe quedar contiguo), luego por el rango de tipo (álbumes antes que canciones dentro del
artista) y por último por el orden elegido. Las valoraciones sin artista acreditado van al final.
Como las demás agrupaciones, parte una lista plana ya ordenada: una sola consulta paginada.

El cliente arma las secciones de artista con un `Map` por id de artista que conserva el orden de
aparición (no supone contigüidad, aunque el servidor la garantiza). Cada sección de artista se
subdivide en "Álbumes" y "Canciones" con un subencabezado discreto: esa es la forma de diferenciar
canción de álbum en esta agrupación. El encabezado del artista no lleva contador: una sección puede
quedar cortada entre páginas y el total por artista no viene del servidor (un `counts` por artista
añadiría una consulta por una cifra que no hace falta). El encabezado enlaza a la página del
artista; la sección "Sin artista" no enlaza.

*Alternativa descartada:* un campo `artistCounts` en la respuesta. Costo de consulta y de contrato
sin beneficio visible.

### D3. `counts` calculados con el mismo `WHERE` que la lista
Una consulta de agregación `count(*) FILTER (WHERE release_group_id IS NOT NULL)` y
`FILTER (WHERE recording_id IS NOT NULL)` sobre el alcance filtrado. `total` se mantiene
(= suma de ambos) para no romper el contrato ni los consumidores actuales. Siguen la misma
semántica de `favoriteCounts`: respetan filtros y búsqueda.

### D4. Buscador `q` con `ilike` sobre título y artista principal
Mismo criterio que `favoriteTextMatch`: `coalesce(título del álbum, título de la canción) ILIKE
%q% OR artista principal ILIKE %q%`, reutilizando `PRIMARY_ARTIST_SQL`. Se escapan `%` y `_` del
texto del usuario. Sin índice nuevo: la consulta ya está acotada por `user_id` y el volumen por
persona es bajo. `q` se recorta y vacío equivale a ausente; se valida un máximo de longitud en el
esquema Zod.

### D5. La preferencia de modo vive en `localStorage`, no en la URL
Calcado de `useFavoriteViewMode`: primer render y SSR con el modo por defecto, reconciliación tras
el montaje, todo en `try/catch`. Es preferencia del dispositivo, no del resultado: filtros, `q`,
orden y `group` sí van a la URL (ya lo hacía `syncQueryString`) y el modo no.

El modo por defecto es **Gráfico** (Favoritos y Want to Listen abren en Detallada): es lo que
distingue a la biblioteca de valoraciones de esas secciones. Como el primer render y el SSR usan el
defecto, quien tenga guardado otro modo ve un instante la pared antes de que el efecto lo
reconcilie; es el mismo compromiso que ya tienen las otras secciones, y evita un desajuste de
hidratación.

### D6. Un solo `RatingDetailDialog`, elevado al orquestador
Montar un diálogo por carátula (30+ por página) es un costo innecesario en la pared. El orquestador
guarda `editing: MyRatingEntry | null`; los renderers reciben `onEdit(entry)`. El helper
`applyRatingsResponse(entry, ratings)` (devuelve la entrada actualizada o `null` si se borró)
reemplaza a `handleDialogChange` de la fila y lo comparten las tres vistas. `MyRatingRow` conserva
la edición inline de estrellas, pero pierde su diálogo propio. `ui/Dialog` ya devuelve el foco al
elemento que lo abrió.

### D7. Overlay del modo Gráfico con CSS puro
`RatingTile` es un `<li class="group relative">` con un `<Link>` que cubre la carátula y un
overlay hermano `absolute inset-0` con `pointer-events-none`, visible con `group-hover` y
`group-focus-within`. Solo el botón "Editar nota" tiene `pointer-events-auto`, así un clic en
cualquier otro punto navega. Sin estado de React para el hover: no hay re-render por movimiento del
cursor. Para táctil se usa la media query `(hover: none)` (variante de Tailwind) que deja el chip
de nota y el botón siempre visibles; sin ella la nota sería inaccesible en móviles. En táctil el
overlay se reduce a esos dos controles (sin degradé ni título centrado, que siguen en la etiqueta
accesible): con tres columnas de ~110 px el overlay completo tapaba la carátula y partía el botón.
El chip apila estrellas y puntaje para que "Sin afinar" quepa en una línea en carátulas angostas. La etiqueta
accesible del enlace incluye título, artista, estrellas y puntaje.

Contenido del overlay: chip superior con `StarRatingDisplay` y `86/100` (o la marca "Sin afinar",
que es el botón que abre el diálogo), título y artista centrados sobre un degradé oscuro, y abajo
el botón "Editar nota". Carátula: `CoverThumb` (cae al disco genérico si falta o falla);
las canciones usan `RECORDING_COVER_SQL` como hoy.

*Alternativa descartada:* mostrar siempre las acciones bajo la carátula (como Favoritos). Ensucia la
pared y no se parece a la referencia; el overlay concentra todo en un solo gesto y los otros dos
modos ya muestran los controles siempre.

### D8. Estado: filtros en el orquestador, `counts` y `items` locales
`MyRatingsList` suma `q` (con debounce de 300 ms sobre un `searchInput`, como `FavoritesWall`) y
`group` a `FiltersState`, lo incluye en `queryKeys.myRatings(apiFilters)` y mantiene `counts` en
estado junto a `items`/`total`. Borrar una valoración decrementa `total` y el contador de su tipo.
Editar no reordena (se conserva el comportamiento de la spec).

### D9. Tamaño de página 30 y ancho por modo
`PAGE_SIZE` pasa de 20 a 30 (el máximo del servicio es 50) para que la última fila de la pared
quede completa con 3, 5 o 6 columnas. La grilla es `grid-cols-3 sm:grid-cols-4 md:grid-cols-5
lg:grid-cols-6`. El contenedor pasa de `max-w-3xl` a `max-w-5xl` solo en modo Gráfico.

### D11. Marca de tipo fija en la pared y en el overlay
Con "Sin agrupar" (y en general sin encabezados de tipo) una pared de carátulas mezcla álbumes y
canciones indistinguibles. Cada `RatingTile` lleva una marca fija en la esquina — icono de disco
para álbum y de nota musical para canción, `aria-hidden`, sobre el overlay y con
`pointer-events-none` — que se ve también sin hover y en táctil. El overlay suma "Álbum · 1987" /
"Canción · 1976" bajo el artista, y la etiqueta accesible del enlace incluye el tipo. En los modos
Detallada e Índice el tipo ya figura como texto en la fila.

### D12. Etiqueta visible en cada selector
`FilterSelect` acepta un `label` opcional que se dibuja sobre el control (texto pequeño atenuado,
`aria-hidden` porque el `aria-label` ya nombra el select). Es aditivo: las demás pantallas que usan
`FilterSelect` no cambian. La barra de valoraciones lo pasa en los seis selectores, de modo que un
"Todos" ya no es ambiguo. Se descartó reescribir las opciones neutras ("Todos los tipos", "Todas las
estrellas"…): con un valor elegido (p. ej. "1987") el selector seguiría sin nombre.

### D13. Sin datos repetidos y fila Detallada compacta
Los renderers reciben `display: { showArtist, showType }`, derivado de `group` por
`displayForGroup`: bajo `artist` se omiten artista y tipo (ya los dicen el encabezado y el
subencabezado), bajo `type` solo el tipo, bajo `none` ninguno. El año nunca se omite. La etiqueta
accesible de la carátula no cambia: sigue completa. Con `placeholderData` mientras se cambia de
agrupación, durante un instante la lista previa se dibuja con el `display` nuevo; es inocuo
(solo oculta texto).

`MyRatingRow` pasa a una fila compacta: en `sm+` título y nota comparten línea (el alto lo fija la
carátula de 48 px, ≈ 60 px por fila contra ≈ 120 px antes); en angosto la nota baja bajo el título.
`StarRatingInput` gana una prop opcional `size="sm"` (estrellas de 20 px, área de 24×28) que usa
solo esta fila; el tamaño por defecto no cambia, así que el panel "Tu relación" queda igual. El
puntaje tiene ancho fijo para que las columnas de nota se alineen entre filas.

*Alternativa descartada:* ocultar siempre el artista en Detallada. Con "Sin agrupar" o "Por tipo"
es información útil, y la regla por agrupación es simple y no agrega ajustes.

### D10. Toolbar con `FilterSelect`
Se reemplazan los cinco `<select>` etiquetados por `RatingsToolbar` (buscador + `FilterSelect`),
con el mismo aspecto que `FavoritesToolbar`. El selector de década sigue deshabilitado cuando hay
año. La lógica de validación del servidor no cambia salvo `q` y `group`.

## Risks / Trade-offs

- **Abrir en Gráfico muestra un parpadeo a quien guardó otro modo** (el primer render usa el
  defecto y se reconcilia tras el montaje) → mismo patrón que Favoritos y Want to Listen; leer
  `localStorage` en el render provocaría un desajuste de hidratación, peor que el parpadeo.
- **El orden por defecto cambia para quien ya usa la página** (de mezclado a secciones) →
  `group=none` lo restaura y es un solo selector; el ranking "Top del año" sigue disponible.
- **El `ILIKE` con `%q%` no usa índice** → acotado por `user_id` y por el `LIMIT/OFFSET`; si el
  volumen creciera, un índice trigram sería un cambio aparte, no de este.
- **Sin hover en táctil** → `(hover: none)` deja la nota y la acción siempre visibles; verificado
  en emulación móvil.
- **Overlay encima del enlace puede robar clics** → `pointer-events-none` en todo el overlay salvo
  el botón; cubierto por una prueba de que el clic fuera del botón no abre el diálogo.
- **Diálogo elevado: el foco de retorno** → depende de `ui/Dialog` (ya devuelve el foco al
  disparador); se prueba abriendo desde el teclado.
- **Cambiar `PAGE_SIZE`** rompe pruebas que asumen 20 → se ajustan en la misma tarea.
- **Cuarta copia del patrón hook/switcher de modo** → se acepta por consistencia con las demás
  secciones; unificar es un refactor aparte.

## Open Questions

Ninguna.
