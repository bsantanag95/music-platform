## Why

Última fase del rediseño de `/lists` (B · Lector, con el exhibidor y la banda de A). Las fases 1 y 2 dejaron el marco, los filtros, el
lector y la vista previa. Queda lo que la auditoría del 2026-11-21 señalaba en la cabecera de la vitrina y en los bordes de la página:

- **Destacadas** sigue siendo la tarjeta de estantería de antes. La destacada única es una caja con un mosaico y una línea de nombres
  sueltos, con una celda «+1» vacía, y no cuenta qué tiene ni por qué está ahí.
- **La banda «Arma tus propias listas»** y los estados vacío y sin resultados conservan formas genéricas: una caja de borde punteado y el
  `EmptyState` de siempre.

## What Changes

- **Exhibidor de Destacadas:**
  - La primera destacada se ve a todo el ancho, con sus carátulas como fundas en abanico, la insignia «Oficial» y el título en grande.
  - Muestra su descripción, sus **primeros cuatro elementos** numerados con artista y las acciones «Abrir la lista» y Guardar.
  - Los elementos se resuelven en el servidor.
  - Las demás destacadas pasan a exhibidores compactos en una fila de hasta tres.
- **Banda «Arma tus propias listas»:** toma su forma final. Lleva a la izquierda una pila de tres fundas de las listas de la página, para
  que la invitación muestre lo que se puede armar, y conserva las dos acciones.
- **Estados:**
  - **Vacío global:** la misma composición que la banda, con «Crear la primera lista» o «Iniciar sesión».
  - **Sin resultados del modo explorar:** un aviso dentro del lector con «Limpiar filtros» y, si hay un tipo elegido, «Buscar en todos los
    tipos».
- **Documentación:** se cierra el plan de tres fases en `lists-and-favorites.md`.

### Goals

- Que la destacada se lea como una recomendación con contenido, no como una tarjeta más.
- Que la banda y los estados vacíos hablen el mismo idioma visual que el resto de la página.

### Non-Goals

- Cambios en el lector, las filas o la vista previa (Fase 2).
- Cambios en el criterio de qué listas son destacadas.
- Cambios en `/me/lists` y en las páginas de una lista.

## Capabilities

### New Capabilities

_(ninguna)_

### Modified Capabilities

- `community-lists`:
  - «Destacada única como portada» pasa a «Destacadas como exhibidor», con su variante compacta para la segunda destacada en adelante;
  - la regla de imágenes remite al abanico del exhibidor.

## Impact

- **Página:** `src/app/[locale]/lists/page.tsx` (elementos de la primera destacada y estados).
- **Componentes:**
  - nuevo `FeaturedExhibit`, con su variante compacta;
  - `ListsSignUpBand`, que gana la pila de fundas;
  - `ListsReader`, con el estado sin resultados.
- **Servicios:** se reutiliza `getUserListDetail` para los elementos de la destacada.
- **Mensajes y textos de cliente:** `messages/{es,en}/lists.json` y `client-messages.json`.
- **Tests:** de las piezas nuevas y de la página.
- **Documentación:** `docs/05-features/lists-and-favorites.md`.
- **Sin cambios:** API, esquema y dependencias. Las páginas informativas no cambian.
