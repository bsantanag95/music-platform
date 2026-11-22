## Context

Fase 3 del plan de `redesign-lists-phase1`.

**Cómo está hoy.**

- **Destacadas:** se pinta con `CommunityListCard`. Si hay una sola, en variante `large`/`row` (mosaico de 2×2, título, meta, una línea
  `previewNames` y Guardar); si hay varias, en estantería.
- **Datos:** `listFeaturedLists` trae `previewNames` (hasta cinco títulos sueltos, sin artista).
- **Banda:** `ListsSignUpBand` es una caja de borde punteado con título, frase y dos acciones.
- **Vacío global:** `EmptyState`.
- **Sin resultados:** `EmptyState` dentro de `ExploreResults`.

## Goals / Non-Goals

**Goals:**

- Exhibidor de Destacadas con contenido real.
- Banda y estados con la forma de la página.
- Cierre del plan de tres fases en la documentación.

**Non-Goals:**

- El lector.
- Los criterios de Destacadas.
- Las páginas de lista.

## Decisions

### `FeaturedExhibit`
Es un componente de servidor. Recibe la `DiscoverListSummary` de la destacada y sus primeros cuatro elementos (`UserListItem[]`, o `null`
si no se pudieron obtener).

**Composición.**

- **Rejilla:** desde `lg`, `grid-cols-[minmax(0,5fr)_minmax(0,6fr)]`, con las fundas a la izquierda y el texto a la derecha. Por debajo,
  una columna con las fundas arriba.
- **Caja:** `rounded-2xl border bg-ink-surface` con un degradado ámbar muy tenue desde la esquina inferior izquierda, igual que en el
  mockup A.

**Fundas.**

- Hasta 4 carátulas (`CoverThumb`), en posición absoluta y rotadas -9°, -3°, 3° y 9°, desplazadas en horizontal y con sombra con
  desplazamiento y desenfoque.
- En las listas de artistas, en círculo.
- Medidas: 200 px desde `lg`, 160 px en `md` y 128 px en el teléfono.
- Sin carátulas, una sola silueta de disco.
- El abanico es `aria-hidden`.

**Texto.**

- Insignia «Oficial» (si la tiene) y tipo, en una línea propia.
- `<h2>` de 30–46 px.
- Descripción en dos líneas como mucho.
- Un `<ol>` con los primeros 4 elementos (3 en el teléfono), con número, título y artista.
- Acciones: «Abrir la lista» (ámbar), Guardar (con sesión, si no es propia) y «N elementos · N guardados» en mono.

**Datos.**

- `page.tsx` pide `getUserListDetail("exploracion", id, viewerId)` para la primera destacada, en paralelo con el resto, con `catch` a
  `null`.
- Se reutiliza el servicio de la vista previa para no duplicar la consulta de elementos con artista.
- `previewNames` deja de usarse en la página. Se mantiene en el servicio porque otros usos podrían leerlo; se comprueba al implementar y,
  si queda sin uso, se retira.

**Compactos.** De la segunda destacada en adelante, `FeaturedExhibit compact`: abanico de 3 fundas a 72 px, título, tipo y conteo, en
`md:grid-cols-2 lg:grid-cols-3`. Todo el exhibidor compacto es un enlace.

*Alternativa descartada:* mostrar las destacadas como filas del lector. Les quita el lugar editorial que justifica tener la sección.

### Banda final
`ListsSignUpBand` suma a la izquierda una pila de tres fundas pequeñas (`aria-hidden`), con las carátulas de las primeras listas de la
página que tengan alguna (la página se las pasa). La banda deja el borde punteado y pasa a `bg-ink-surface` con borde `ink-border`.

- Título de 24 px, frase y acciones: «Crear cuenta» (ámbar) e «Iniciar sesión».
- Sin carátulas, va sin pila.

### Estados
- **Vacío global (vitrina sin contenido):**
  - Reemplaza `EmptyState` por la misma composición de la banda: título y frase actuales.
  - Acción: «Crear la primera lista» con sesión, o «Iniciar sesión para crearla» sin ella. Sin pila de fundas, porque no hay listas.
- **Sin resultados (modo explorar):**
  - `ExploreResults` muestra, dentro de la columna del lector, el título y la frase actuales («Sin resultados»).
  - Acciones: «Limpiar filtros» y, si hay un tipo elegido, «Buscar en todos los tipos» (quita solo `type`).
  - Sin vista previa.

## Risks / Trade-offs

- **Una consulta más en la vitrina.**
  - *Riesgo:* pedir los elementos de la primera destacada suma una consulta.
  - *Mitigación:* va en paralelo con las demás, sobre una sola lista; un fallo no rompe la página.
- **Fundas rotadas en el teléfono.**
  - *Riesgo:* que se salgan de la pantalla.
  - *Mitigación:* contenedor con ancho fijo y `overflow-hidden` en la caja; se verifica a 390 px.

## Migration Plan

No hay datos ni API que migrar. Revertir el commit restaura la tarjeta de Destacadas y la banda anterior.

## Open Questions

Ninguna.
