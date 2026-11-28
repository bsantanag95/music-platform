## Context

Después de la fase 2, la búsqueda rápida de Álbumes muestra la ficha del disco buscado y, debajo, «Otros álbumes» en filas
(`AlbumList`: carátula de 48 px, título, artista · categoría · año y el menú «…»). «Cargar más» (`LoadMoreResults`, cliente)
agrega más filas. En Canciones, las otras canciones son filas `SongRow` (icono, título, artista, duración). Sin resultados,
`SearchEmpty` pinta una caja con el título, la sugerencia, dos consejos, los otros tipos y la búsqueda avanzada.

Datos de la auditoría: «the wall» trae 25 discos y 24 se llaman igual; «creep» trae 25 canciones con el mismo título. Las
filas de Álbumes ya traen la carátula resuelta en el payload (`coverResolved`, fix/n-plus-one-queries); `ResultCover` la usa.

## Goals / Non-Goals

**Goals:** rejilla con títulos idénticos, artista como titular en canciones repetidas y un estado vacío con salidas, sin
solicitudes nuevas a MusicBrainz.

**Non-Goals:** contar en MusicBrainz, rejilla en Artistas, cambios en la búsqueda avanzada.

## Decisions

### D1. Cuándo hay rejilla

`albumView(query, others)` es pura: devuelve `"grid"` si `others.length ≥ 4` y al menos la mitad tiene título igual a la
consulta (`normalizeSearchText`, sin artículo inicial como en `coverageLevel`); si no, `"rows"`. Se decide con la primera
página y se mantiene al cargar más: la vista no cambia a mitad de la lista. Con rejilla, el encabezado es «Otros discos
llamados «x»»; con filas, «Otros álbumes».

*Alternativa descartada:* rejilla siempre. Con títulos distintos («ok computer» → «OK Computer Turns 10», tributos), el
título importa y la fila lo lee mejor.

### D2. Tarjeta de la rejilla

`AlbumGrid`: `grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5`. Cada tarjeta lleva la carátula cuadrada con
`ResultCover` y el menú «…» encima (`AlbumQuickActions variant="cover"`, el de las discografías), el artista como titular
(display, 15 px), una línea «Categoría · año» y, si el título no es igual a la consulta, el título en la meta. Todo enlaza al
disco. Carátula en miniatura de 250 px, como en el resto.

`LoadMoreResults` recibe `view: "rows" | "grid"` para Álbumes y agrega tarjetas en la misma rejilla.

### D3. Canciones con el mismo título

En `SongRow`, si `normalizeSearchText(title) === normalizeSearchText(query)` (sin artículo), el titular es el artista y la
meta es el título. La duración sigue a la derecha. `SongList` recibe la consulta. En la avanzada (con `highlight`) no cambia.

### D4. Estado sin resultados

`SearchNoResults` reemplaza a `SearchEmpty` en la búsqueda rápida sin filtro. `SearchEmpty` queda para la variante con
filtro activo y la portada de Usuarios no cambia. Orden:

1. `h3` grande: «Nada coincide con «x» en <tipo>» (el `h2` del resumen ya existe).
2. «¿Quisiste decir …?», si `suggestSpelling` dio algo (como hoy), destacado.
3. «En otros tipos»: `findInAllOtherTypes(type, query)` busca en paralelo, con `localOnly: true`, en cada otro tipo de catálogo
   (Artistas, Álbumes, Canciones menos el actual) y devuelve hasta 3 por tipo. Cada tipo con coincidencias es una
   tarjeta sin cifras: título «En canciones», filas mini y «Ver canciones →». Los tipos sin coincidencias locales, y Usuarios, quedan como accesos simples en una línea («También
   puedes buscar «x» en: Usuarios»). Va en su propio `Suspense`, con la línea de accesos simples como fallback.
4. Consejos: ortografía, menos palabras, «Artista - Título» (Álbumes y Canciones) y la búsqueda avanzada (enlace).
5. «O empieza por aquí»: tres tarjetas (icono, nombre, una línea) a Explorar, Lanzamientos (`/explore#lanzamientos`) y Listas.
6. Columna lateral: «Búsquedas recientes» con `RecentSearches` (cliente, `localStorage`), y nada si no hay.

Sin solicitudes a MusicBrainz más allá de la búsqueda del tipo, que ya se hizo. La cifra de la pestaña sigue mostrando
«0 resultados».

*Alternativa descartada:* las cifras de MusicBrainz por tipo del mockup («0 álbumes · 0 artistas · 0 canciones»). Con el
límite de ≥1,1 s por solicitud, la página costaría hasta 3 s más.

### D5. Reutilización del panel de otros tipos

Las filas mini de `OtherTypePanel` (fase 2) pasan a un componente compartido (`OtherTypeRows`) que usan el panel lateral y
las tarjetas del estado vacío. Para artistas, la fila mini lleva el retrato (o la inicial) y «N discos» si los hay.

## Risks / Trade-offs

- [Rejilla con discos sin carátula: muchos discos de un solo artista desconocido no la tienen] → `ResultCover` pinta el disco
  genérico, y el artista como titular sigue distinguiendo. La regla exige al menos la mitad de títulos idénticos, no carátulas.
- [Tres consultas locales en el estado vacío] → En paralelo, sin MusicBrainz, en `Suspense` propio. El estado vacío se ve de
  inmediato con los accesos simples.
- [`AlbumQuickActions` en tarjeta pequeña de 2 columnas a 390 px] → `variant="cover"` ya se usa en discografías a ese ancho.

## Migration Plan

Solo interfaz y lecturas locales; se revierte con el commit.

## Open Questions

Ninguna.
