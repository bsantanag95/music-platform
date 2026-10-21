## Context

`/{locale}/lists` (`src/app/[locale]/lists/page.tsx`) es un server component con dos estados derivados de la URL:

- **Vitrina** (sin `q`, `type` ni `sort`): Destacadas, De la gente que sigues, Populares, Recientes y Para completar, en
  ese orden (el spec todavía pone «Para completar» antes de Recientes; el código la movió al final).
- **Explorar** (con alguno de los tres): una grilla filtrada y paginada (`CommunityExploreGrid`).

Las tarjetas son `CommunityListCard`, que envuelve a `ListCard` (compartida con `/me/lists`, perfiles y otras
superficies) con el mosaico `ListCoverMosaic`. El toolbar (`CommunityListsToolbar`) escribe `?q&type&sort` con
`router.replace`. El servicio `listDiscoverLists` excluye las colecciones generadas solo cuando no hay ningún filtro.

Restricción principal: `ListCard`, `ListCoverMosaic` y `SaveListButton` se usan fuera de `/lists`. Todo rediseño entra por
props opt-in; solo las correcciones de errores (mosaico de tres, área táctil) son globales.

## Goals / Non-Goals

**Goals:**

- Carátulas reconocibles en cualquier tarjeta de `/lists`, y ningún mosaico que parezca roto en ninguna superficie.
- Un modo explorar que se explique solo, donde cambiar el orden o el tipo no cambie qué clase de contenido aparece.
- Colecciones generadas siempre enlazadas a Explorar y con el título del idioma.

**Non-Goals:**

- Cambiar las reglas de las secciones o de una lista por sección.
- Personalización: el riel solo muestra lo propio del lector y «Para completar», que ya es público.
- Migraciones.

## Decisions

### D1. Marca «Oficial» sobre el título

En `ListCard`, `badge` deja de compartir la fila del título y se renderiza como una línea propia encima. El título vuelve
a tener todo el ancho, con `line-clamp-2` en lugar de `truncate`. Como el cambio toca `ListCard`, alcanza a todas las
superficies que muestran la marca, y en todas es una corrección.

### D2. `generated` en los resúmenes de descubrimiento

`DiscoverListSummary` suma `generated: { templateKey, periodKey } | null` (opcional y aditivo), resuelto con
`generatedRefsFor` sobre los ids de la página. Es el mismo campo y el mismo criterio que `SavedListSummary` y
`TrackedListSummary`. `CommunityListCard` lo usa como ya lo hace `SavedListsTab`: enlaza con `collectionHref` y muestra
el título localizado.

*Alternativa descartada:* resolver la ruta en el cliente con una petición extra, o depender de la redirección. Cuesta un
salto por clic y deja el título en el idioma guardado.

### D3. Colecciones generadas solo con texto

En `listDiscoverLists`, la exclusión `notGeneratedCollectionCondition()` pasa a aplicarse siempre que no haya `q`, aunque
haya `sort` o `entityType`. La regla «una búsqueda las encuentra» se conserva: buscar «Grammy» sigue devolviendo
«Ganadores del Grammy 2025». La que cambia es «un filtro las encuentra». El contrato de `GET /api/lists/discover`
documenta la diferencia.

*Por qué:* el orden y el tipo son maneras de recorrer las listas de la comunidad; que traigan contenido de la plataforma
convierte un cambio de orden en un cambio de catálogo.

### D4. «Más guardadas» y un rótulo de explorar

- El valor `popular` de `?sort=` no cambia (no se rompen enlaces); cambia la etiqueta: «Más guardadas» / «Most saved». La
  sección «Populares» conserva nombre y umbral (`MIN_POPULAR_SAVES = 2`).
- En la vitrina el control de orden no muestra un valor elegido: se presenta como «Ordenar».
- En explorar, `CommunityExploreGrid` encabeza la grilla con un rótulo («12 listas · Más guardadas») y la acción
  «Limpiar filtros», que hoy vive en el toolbar.

### D5. Mosaico de tres imágenes (corrección global)

`ListCoverMosaic` con tres imágenes pasa de «una grande y dos chicas» (la grande recortada a 1:2) a una grilla de 2×2 con
tres imágenes cuadradas y una cuarta celda neutra con «+N» (ítems restantes) o, si la lista tiene exactamente tres, el
ícono del tipo de entidad. Ninguna carátula se recorta fuera del cuadrado. Las demás reglas (1, 2 y 4 imágenes; silueta
de disco sin ninguna) no cambian.

### D6. Estantería (fase 2)

`CommunityListCard` gana `layout="shelf"`: mosaico cuadrado arriba, a todo el ancho de la tarjeta, y debajo título (2
líneas), meta (tipo · conteo) y dueño. Guardar va sobre el mosaico como un botón flotante (44px en móvil), siempre
visible: en táctil no hay hover que lo revele y, guardada, la marca dice algo de la lista. La grilla: 2 columnas en móvil, 3 en `sm` y 4 desde `lg`. Se descartaron 5 columnas en `xl`: con el riel al lado dejaban mosaicos de ~150 px. Lo usan De la
gente que sigues, Populares, Recientes y explorar. Las imágenes de una lista de artistas van recortadas en círculo dentro
de su celda (`rounded-full`), como las fotos de artistas del resto de la app.

`ListCard` sin `layout` sigue igual para `/me/lists` y perfiles.

### D7. Destacada única como portada (fase 2)

Con una sola destacada, la tarjeta `large` es una portada: mosaico de 160px, título, meta, una línea con los primeros 5
nombres de la lista (`previewNames`, opcional en el resumen, solo en destacadas) y la descripción (2 líneas). Se descartó
una tira de imágenes: el resumen trae 4 carátulas y repetiría las del mosaico de al lado. Con dos o más destacadas, se
usa la estantería.

### D8. Chips de tipo (fase 2)

El select de tipo se reemplaza por chips (`role="group"`, `aria-pressed`), con el mismo estilo que los chips de `/activity`.
El orden queda como un select compacto en el rótulo de explorar (D4) y, en la vitrina, como «Ordenar» junto a los chips.
`?type=` y `?sort=` no cambian.

### D9. Riel «Tus listas» y «Para completar» (fase 3)

- **Layout:** `main` mantiene `max-w-6xl`; desde `lg`, grilla `[minmax(0,1fr)_280px]`, con el riel `sticky`. Por debajo de
  `lg`, el riel va después de las secciones.
- **«Tus listas»** (solo con sesión): `getMostRecentEditedList` (el mismo criterio que «Retoma una lista» de Inicio), con
  su mosaico y un enlace a la lista. Debajo, enlaces a `/me/lists` y a las guardadas. Si el lector no tiene listas, el
  módulo invita a crear una (`/me/lists?new=1`). Se lee en el servidor junto con las secciones.
- **«Para completar»:** el mismo `discoverCaminos` que hoy, con un tope de 4 y una fila compacta. Se mantiene «Ver todas»
  hacia `/caminos`. Deja de ser una sección de la vitrina.
- **Sin sesión:** el riel muestra «Para completar» y una tarjeta para crear una cuenta, que reemplaza la línea «Inicia
  sesión para…» bajo el toolbar.
- **Solo en la vitrina:** en explorar no hay riel; la grilla ocupa el ancho.

### D10. Estado vacío global con acción (fase 3)

`EmptyState` con una acción: «Crear la primera lista» (`/me/lists?new=1`) con sesión, «Inicia sesión para crear la
primera» sin ella.

## Risks / Trade-offs

- [D1 y D5 cambian `ListCard` y `ListCoverMosaic`, que se usan en otras superficies] → Son correcciones; hay que
  revisar en el navegador `/me/lists`, un perfil con listas, «Retoma una lista» de Inicio y el detalle de una colección.
- [D3 cambia el resultado de `?sort=popular` y `?type=` sin texto] → Es justamente el objetivo. El contrato lo
  documenta; ningún consumidor interno depende de encontrar colecciones por tipo.
- [La estantería muestra menos tarjetas por pantalla que las filas densas] → Las secciones ya paginan con «Cargar más».
  Lo que se pierde en densidad se gana en reconocimiento, que es lo que se busca.
- [`previewNames` agrega una lectura para las destacadas] → Solo para las destacadas (pocas, sin paginar), en la misma
  consulta de ítems que ya resuelve las carátulas.

## Migration Plan

Sin migraciones. Los enlaces con `?sort=popular` siguen funcionando. Se revierte con el código.

## Open Questions

Ninguna bloqueante.
