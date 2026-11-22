## Context

`ListsReader` tenía una pestaña `to-complete` con filas de camino (`entryFromCamino`, `trackingCount` en `ListRow` y `ListPreview`). El
modo explorar usa el lector sin pestañas, así que perdía esa pestaña. `discoverCaminos` solo devuelve listas `release-group` y no
filtra por texto.

## Decisions

### `ListsToComplete`, una sección de servidor
Es un componente de servidor. Recibe hasta 4 `CaminoDiscoverySummary`.

- **Encabezado:** `SectionHeader size="page"` con «Para completar», una frase («Listas que alguien está escuchando de principio a fin.
  Elige una, escúchala y lleva la cuenta de lo que te falta.») y «Ver todas» hacia `/caminos`.
- **Tarjeta:** `<article>` con borde y superficie. Arriba, una tira de 4 carátulas (`CoverThumb` cuadradas, con silueta si faltan);
  luego título (2 líneas), «por <dueño>» y «N personas la están completando» en `petrol-hover`; al pie, el botón ámbar «Completarla»
  (enlace a `caminoHref`). El título también enlaza.
- **Rejilla:** `lg:grid-cols-4` y `sm:grid-cols-2`. En el teléfono, una fila con `snap-x` y tarjetas al 78 %.

*Alternativa descartada:* las mismas filas del lector en su propia sección. Sería más sobrio, pero no se distingue como acción.

### Con filtros
`page.tsx` pide `discoverCaminos({}, 1, 8)` también en el modo explorar, cuando `type` es nulo o `release-group`.

- **Búsqueda:** con `q`, filtra en memoria los títulos que contienen el texto (sin distinguir mayúsculas ni acentos, con `localeCompare`
  y `sensitivity: "base"` por subcadena normalizada). Muestra hasta 4.
- **Posición:** la sección va encima del lector, igual que en la vitrina.

*Por qué en memoria:* son como mucho 8 listas y `discoverCaminos` no filtra por texto. Un filtro SQL sería un cambio de servicio para un
caso marginal.

### Lector sin camino
Se quitan la pestaña `to-complete`, `CaminoPanel`, `entryFromCamino` y los campos `trackingCount` y la variante de camino de
`ListRow` y `ListPreview`.

## Risks / Trade-offs

- **Dos secciones antes del lector.**
  - *Riesgo:* en el teléfono el lector baja.
  - *Mitigación:* la fila táctil de tarjetas ocupa poco alto (~260 px).
