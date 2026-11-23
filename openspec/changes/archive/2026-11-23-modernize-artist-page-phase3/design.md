## Context

`ArtistDiscography` (`src/components/artist/ArtistDiscography.tsx`) monta una barra fija bajo las pestañas
(`top-[var(--artist-sticky-top)]`): un `nav` con las secciones (en el teléfono, una línea con desplazamiento propio) y, en el mismo
contenedor `flex-wrap`, un grupo con el buscador (botón que se despliega en el teléfono), el filtro personal (con sesión y marcas),
«Agrupar» (solo grilla y fuera de la búsqueda) y «Vista». Los grupos segmentados llevan `aria-label` pero ningún rótulo visible. En la
Fase 1 ese grupo pasó a `flex-wrap` para no desbordar 3 px a 390 px.

En la grilla, cada tarjeta es una `Cover` (carátula resuelta con `CoverThumb`, o sin resolver con `LazyCoverImage`, ambas con
`TitleTile` como relleno cuando no hay imagen) con las etiquetas «★ Mejor valorado» y «EP» en `absolute left-1.5 top-1.5` y las acciones
«…» en `right-1.5 top-1.5`. `TitleTile` pone el título arriba a la izquierda (`justify-between`): queda debajo de las etiquetas.
`CoverThumb` cae al disco con `onError`, pero si la imagen falla antes de que React se hidrate el evento ya pasó y el navegador deja
su icono de imagen rota.

## Goals / Non-Goals

**Goals:** barra legible, ningún título tapado, ninguna imagen rota, títulos de bloque con jerarquía.

**Non-Goals:** orden, agrupación, vista por defecto, tabla, acciones rápidas, carátulas de otras páginas (más allá del arreglo
compartido de `CoverThumb`, que solo puede mejorarlas).

## Decisions

### Barra en dos filas
El contenedor fijo pasa a `flex-col`: fila 1, el `nav` de secciones tal cual (una línea desplazable en el teléfono, con `flex-wrap`
desde `sm`); fila 2, una fila `flex-wrap` con el buscador a la izquierda y los grupos a la derecha. Desde `sm` cada grupo lleva su
rótulo visible en mono pequeño, corto y contenido en el `aria-label` del grupo («Filtrar» en «Filtrar por tus discos», «Agrupar» en
«Agrupar discos», «Vista»), como en el mockup D; en el
teléfono los rótulos quedan solo para lectores de pantalla para que la fila no se parta en tres. El buscador del teléfono conserva su
botón que se despliega a toda la fila. La barra sigue fija y opaca; `--artist-sticky-top` no cambia porque la barra no fija nada
debajo suyo, pero los `scroll-mt` de los títulos de bloque y de la sección suman el alto de la segunda fila (variable
`--discography-bar-h`, medida en CSS: 2 filas de 2.25rem + separación).
*Alternativa descartada:* fijar solo la fila de secciones: cambiar de agrupación o de vista a mitad de una discografía larga
obligaría a volver arriba.

### Título sin choque con las etiquetas
`TitleTile` gana `insetTop` (booleano): con etiquetas en la tarjeta, el título baja (`pt-8`) y el año queda abajo. `Cover` lo recibe
desde la tarjeta (`best || (showEpBadge && item.isEp)`). Sin etiquetas, el relleno queda igual.

### Sin icono de imagen rota
`CoverThumb` acepta `fallback?: ReactNode` (lo que se muestra si no hay imagen o falla; por defecto el disco dibujado, como hoy) y,
al montarse, revisa su `<img>`: si ya terminó de cargar sin píxeles (`complete && naturalWidth === 0`), marca la URL como fallida.
Eso atrapa los errores ocurridos antes de la hidratación. `Cover` le pasa el `TitleTile` como `fallback` en la grilla, así una
carátula resuelta que falla se ve igual que un disco sin carátula. `LazyCoverImage` no la necesita: pinta su imagen recién en el
cliente (antes muestra un esqueleto), así que su `onError` siempre está escuchando, y ya cae a su `fallback` al agotar reintentos.

### Escala de títulos
Los `h3` de bloque de la grilla y los títulos de grupo de la tabla (que eran mono en mayúsculas) pasan de `text-base` a `text-lg sm:text-xl` con la cantidad en mono, la misma escala que
el `h2` de «Comentarios» (20 px). El `h2` «Discografía» sigue oculto a la vista: la pestaña ya lo nombra.

## Risks / Trade-offs

- [La segunda fila suma ~40 px a la barra fija en el teléfono] → Los rótulos van ocultos allí y la fila tiene una sola línea en 390
  px con el buscador plegado; se mide en la verificación.
- [La comprobación al montar marca como fallida una imagen que todavía carga] → Solo con `complete === true`, que en una imagen en
  curso es `false`.
- [`CoverThumb` se usa en otras páginas] → El cambio solo agrega la caída ante errores previos a la hidratación y un `fallback`
  opcional; el resto de usos queda igual.

## Migration Plan

Sin datos ni API; revertir el commit restaura la barra de una fila.

## Open Questions

Ninguna bloqueante.
