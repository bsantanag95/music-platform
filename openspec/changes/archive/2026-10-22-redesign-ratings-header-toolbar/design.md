## Context

Fase 2 de la auditoría de `/me/ratings` (la Fase 1 quedó archivada y en `main`). La cabecera es un
`<p>` con el total y el desglose; los seis filtros son `FilterSelect` en una fila que se parte. La pantalla
no muestra la distribución de notas, que es el dato más personal de la página, y filtrar por estrellas o tipo
exige abrir un selector. El servicio `listMyRatings` ya hace tres consultas (conteo, lista, años) y los
conteos respetan todos los filtros, así que no sirven para dibujar facetas que sigan siendo clicables.

Restricciones: el filtro por estrellas ya existe y es exacto (`stars=4.5`); no hay parámetros nuevos; los
tests del servicio simulan la cadena de Drizzle consulta por consulta; la lista no se reordena tras editar
(spec `my-ratings-library`).

## Goals / Non-Goals

**Goals:**
- Un resumen con promedio e histograma que filtre por estrellas, y segmentos de tipo con contador.
- Facetas correctas (cada una sin su propio filtro) con el menor costo posible en el servidor.
- Facetas que no queden desactualizadas tras editar o borrar una nota.

**Non-Goals:**
- Chips, barra fija, promedio del puntaje `/100`, tocar las vistas Gráfico/Detallada/Índice.

## Decisions

**D1. Diez barras de media estrella, no cinco.** El filtro del servidor es exacto (`stars=4.5`), así que cada
barra se mapea 1:1 a un valor sin parámetro nuevo. Cinco cubos enteros (4★ = 4 y 4,5) habrían exigido un filtro
por rango. Las diez barras muestran además matices (hay muchos 4,5). Las etiquetas del eje van solo en las
estrellas enteras (1…5) para que no se amontonen.

**D2. Una sola consulta agrupada para ambas facetas.** Se agrega una consulta
`GROUP BY stars, tipo` con los filtros comunes (búsqueda, año/década) y se derivan en memoria:
`facets.stars` aplica el filtro de tipo (no el de estrellas) y `facets.types` aplica el de estrellas (no el de
tipo). Son como mucho 20 filas. Alternativas descartadas: dos consultas separadas (una más de ida y vuelta por
nada); calcular las facetas en el cliente con la página cargada (solo tendría la primera página). La consulta
va **después** de las tres existentes, así las pruebas del servicio solo suman un doble más en la cadena.

**D3. El promedio no viaja en la API.** El conjunto visible es "facetas de estrellas restringidas al filtro de
estrellas": con filtro `stars` el promedio es ese valor; sin él, la media ponderada de los diez cubos. Se
calcula en el cliente con `ratings-shared.averageStars`, sin campo nuevo ni segunda fuente de verdad que pueda
discrepar del histograma.

**D4. Facetas ajustadas en el lugar al editar.** `MyRatingsList` ya mantiene `items`, `total` y `counts` como
estado local que corrige al editar o borrar (la lista no se recarga ni se reordena). Las facetas siguen el
mismo patrón con una función pura `adjustFacets(facets, starsFilter, antes, después | null)`: mueve la
cantidad de un cubo de estrellas a otro y, si hay filtro de estrellas, actualiza el contador del tipo según
si la valoración entra o sale del filtro. Alternativa descartada: invalidar la consulta tras cada edición
(recargaría y reordenaría la lista, contra la spec).

**D5. Segmentos y barras son botones con `aria-pressed`, no `radiogroup`.** Ambos son filtros activables y
desactivables (una barra se quita tocándola de nuevo), y cada botón participa del orden de tabulación; no se
necesitan flechas. Cada barra lleva `aria-label` con valor y cantidad ("4,5 estrellas: 3 valoraciones"). Con
puntero grueso cada botón llega a 44 px de alto.

**D6. Se retiran los selectores de tipo y estrellas, sin chips de filtros.** Los chips son útiles cuando un
filtro queda escondido en un menú; aquí cada filtro sigue visible en su control (barra resaltada, segmento
seleccionado, selector con su valor). Los selectores restantes (Año, Década, Ordenar, Agrupar) conservan
`FilterSelect` con su nombre visible. Se borran las claves `starsAll` y `typeAll` ya sin uso; `starsFilterLabel`
y `typeFilterLabel` pasan a nombrar los grupos accesibles.

**D7. Histograma visible solo si dice algo.** Se oculta con la biblioteca vacía (todas las barras en 0 y sin
filtro de estrellas activo); con un filtro de estrellas activo se muestra siempre para poder quitarlo, aunque
el resto de barras esté en 0.

## Risks / Trade-offs

- [Más trabajo por petición en el servidor] → Una consulta agrupada sobre las valoraciones de una persona
  (cientos de filas como mucho) con los mismos joins; sin subconsultas de año salvo que haya filtro de año o
  década. Se mide en el navegador y con el smoke de la API.
- [Las facetas locales pueden divergir del servidor tras muchas ediciones] → Un recargado de la página o un
  cambio de filtro vuelve a pedir los valores reales; el ajuste local cubre exactamente los dos movimientos
  posibles (cambiar estrellas, borrar) y se prueba con una función pura.
- [Sin selector de estrellas, quien no vea las barras pierde el filtro] → Las barras son botones nativos con
  etiqueta y `aria-pressed`, navegables con teclado y lector de pantalla; en puntero grueso miden 44 px.
- [Quitar `starsAll`/`typeAll` rompe otros usos] → Ningún otro archivo los usa (verificado con búsqueda);
  `ExploreFilterBar` y `GenreFilterBar` tienen sus propios `typeAll` en otros espacios de nombres.

## Migration Plan

Solo código y un campo aditivo en la API; sin migraciones. Revertir es revertir el commit.

## Open Questions

- Ninguna bloqueante. Una barra fija y los chips quedan para decidir tras ver la Fase 2 en uso.
