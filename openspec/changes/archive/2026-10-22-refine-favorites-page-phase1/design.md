## Context

`/me/favorites` (`FavoritesWall` y tres renderers) se construyó en `add-favorites-view-modes`, calcada de Want to
Listen, y es el mismo componente que pinta el muro del perfil público en modo `readOnly`. La auditoría del
2026-10-22 encontró los mismos defectos que `/me/ratings` tenía antes de su Fase 1, más algunos propios de
favoritos (audiencia por ficha, "Quitar favorito", modo selección). Esta fase aplica el mismo procedimiento sin
cambiar el diseño de las vistas, que se rehace después.

Restricciones: sin API ni esquema nuevos; el muro compartido conserva su modo lectura y el ancho propio del perfil
(`max-w-3xl`, definido por su página); `FavoriteTile` también lo usan otros consumidores; el modo de vista sigue
siendo preferencia de dispositivo en `localStorage`.

## Goals / Non-Goals

**Goals:** sin parpadeo; textos de estado verdaderos; barra legible; controles de al menos 11 px y a contraste normal;
áreas táctiles correctas; quitar y errores accesibles.

**Non-Goals:** rediseño de las fichas, insignias de audiencia, menú, deshacer, facetas, segmentos (fases 2 y 3).

## Decisions

**D1. Mismo patrón que ratings para el parpadeo.** `useFavoriteViewMode` devuelve `ready` como tercer elemento
(verdadero tras leer `localStorage`, también si lanza). Mientras no está listo, el muro pinta un marcador de
listado neutro (`aria-hidden`, pulso solo con `motion-safe`) en lugar de las secciones; el conmutador queda
`invisible` (sin perder su espacio) para no marcar el defecto un instante. Se mantiene la firma `[mode, setMode]`.

**D2. Contadores: resultados con un solo `counts`.** La respuesta trae `counts` por tipo y **ya se calcula sin el
filtro de tipo** (son una faceta), así que el total de resultados no es su suma cuando hay filtro de tipo. Se define
`favoriteScopeNarrowed` (búsqueda, tipo y audiencia; no el orden) y el total visible como el conteo del tipo filtrado
si hay uno, o la suma de los tres si no. Con alcance reducido la cabecera dice "N resultado(s)" o "Ningún resultado"
y omite el desglose "sin artistas · …" cuando N es 0; sin filtros y sin favoritos no hay cabecera, porque el estado
vacío ya dice "Todavía no marcaste favoritos" (un "Sin favoritos" aparte lo repetía). Alternativa
descartada: agregar `total` a la API (cambio de contrato innecesario con `counts` ya disponible).

**D3. Visibilidad del conmutador y de "Seleccionar".** La fila de acciones se muestra con favoritos o con alcance
reducido (para poder cambiar de vista en un resultado vacío); "Seleccionar" solo si hay favoritos y no es modo lectura.

**D4. Barra legible con `FilterSelect label`.** El problema de ancho es de los `widthClassName` (`17ch`/`16ch`) frente
a textos de 15 y 14 caracteres más el relleno de la flecha. Se sube a `20ch`/`19ch`/`15ch` y se usa la prop `label`
ya existente de `FilterSelect` (decorativa, `aria-hidden`; el `aria-label` actual se conserva, así las pruebas y los
lectores de pantalla no cambian). Alternativa descartada: tocar `FilterSelect` (compartido con otras secciones).

**D5. Ancho único: lo fija la página, no el muro.** `/me/favorites` pasa a `mx-auto w-full max-w-4xl` con el título a
la izquierda; `FavoritesWall` deja de fijar `max-w-3xl` y llena a su contenedor. El perfil público ya envuelve el muro
en su propio `max-w-3xl`, así que no cambia.

**D6. Tipo omitido bajo su encabezado.** Como el muro siempre agrupa por tipo, ningún modo debe repetirlo.
`FavoriteTile` recibe `showType` (por defecto `true`, para otros consumidores) y `FavoritesDetailed` lo pasa en
`false`; `FavoritesIndex` quita su columna de tipo. La fecha de creación se conserva.

**D7. Controles: 11 px y contraste, sin rediseñarlos.** Los controles del Gráfico pasan de `text-[0.65rem]` a
`text-[0.7rem]` (11,2 px) y el contenedor de acciones del Índice deja de atenuarse al 40 % (conserva el color
`paper-muted`, que ya cumple contraste). El rediseño de esos controles (insignia y menú) es de la Fase 3.

**D8. Áreas táctiles con `@media (pointer: coarse)`.** Igual que ratings: `min-h-11` para el conmutador de vista,
el selector de audiencia, "Quitar favorito", "Seleccionar", los botones de la barra de selección y "Listo"; las
casillas de selección pasan de `size-4` a `size-6` (24 px, mínimo WCAG 2.5.8). Con ratón nada cambia. Las fichas del
Gráfico crecen en táctil (el selector y "Quitar" apilados); es temporal hasta que la Fase 3 los mueva a un menú.

**D9. Anuncio y error por ficha.** Quitar con éxito llama a `setAnnounce(removedAnnouncement)` (la región `status` ya
existe). El fallo de audiencia o de quitar guarda `errorId` (la ficha afectada) y los renderers muestran
`saveError` con `role="alert"` bajo esa ficha; el fallo en lote conserva el aviso global. `FavoritesRowActions` gana
`errorId`.

**D10. Prioridad de carátula por ids.** `FavoritesWall` calcula los ids de los primeros seis favoritos y los pasa a
los renderers (`priorityIds`), que lo pasan a `CoverThumb` (ya admite `priority`). Un `priority` por sección habría
precargado una carátula por tipo.

## Risks / Trade-offs

- [El marcador aparece un instante en cada carga] → Es un frame neutro, sin saltos de ancho; mejor que el salto actual.
- [`counts` ignora el filtro de tipo y el total de resultados sale de elegir entre `counts[type]` y la suma] → Se
  prueba con y sin filtro de tipo.
- [Las fichas del Gráfico crecen en táctil] → Temporal y acotado; se verifica a 375 px y la Fase 3 lo resuelve.
- [El perfil público comparte el muro] → El ancho lo da cada página; el modo lectura sigue sin controles de edición,
  y se mantiene la prueba de modo lectura.

## Migration Plan

Solo front-end; sin migraciones. Revertir es revertir el commit.
