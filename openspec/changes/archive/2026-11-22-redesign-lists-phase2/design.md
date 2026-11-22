## Context

Fase 2 del plan de `redesign-lists-phase1` (`openspec/changes/archive/2026-11-21-redesign-lists-phase1/design.md`).

**Cómo está hoy `/lists`:**

- **Vitrina.** Destacadas arriba. Luego, una por una, De la gente que sigues, Populares y Recientes. Cada una es un `CommunityListSection`
  de cliente con su `useInfiniteQuery` contra `/api/lists/{from-following,popular,discover}` y tarjetas `CommunityListCard` en
  estantería. A la derecha, `ListsContextRail`, con «Tus listas» o la invitación sin sesión, más «Para completar».
- **Modo explorar.** Un `CommunityExploreGrid` de tarjetas.

**Datos:**

- `DiscoverListSummary` trae `owner`, `updatedAt`, `itemCount`, `entityType`, `coverThumbs`, `saved`, `isOwn` y `generated`.
  `saveCount` solo se puebla en Populares, con `saveCountsFor`.
- `CaminoDiscoverySummary` trae `trackingCount`.
- `GET /api/users/{username}/lists/{listId}` devuelve la lista con
  `items: [{ position, target: { title, artistName, coverThumbUrl } }]`.

## Goals / Non-Goals

**Goals:**

- Lector con pestañas, filas informativas y vista previa en escritorio.
- Sin riel lateral.
- Mismo lector en el modo explorar.

**Non-Goals:**

- El exhibidor de Destacadas y los estados finales (Fase 3).
- Las páginas de lista.

## Decisions

### Un lector de cliente con datos iniciales del servidor
`ListsReader` (cliente) recibe del servidor las pestañas con contenido:

```ts
{ key, label, initial: DiscoverPage | CaminoPage, source, seeAll? }
```

También recibe la vista previa inicial, `{ list, items }`, de la primera fila de la primera pestaña.

- **Pestañas:** `tablist` con flechas, con el mismo patrón que `PopularTabs`. Cada panel conserva su propia `useInfiniteQuery`, igual
  que `CommunityListSection`, para «Ver más».
- **Sin JavaScript:** se ve la primera pestaña completa, renderizada en el servidor, y las filas son enlaces.
- **Repeticiones:** se mantiene la regla de no repetir lo que ya está en Destacadas (`excludeIds`). Ya no se deduplica entre pestañas.

*Alternativa descartada:* pestañas como enlaces con `?tab=`. Recargarían la página y la vista previa.

### Filas: `ListRow`
`ListRow` es un `<li>` con un enlace que envuelve todo.

- **Composición:** mosaico de 64 px (56 en el teléfono) con `ListCoverMosaic` y sus reglas actuales. Al lado, el título en una línea
  (`font-display` 16 px), «dueño · hace N» en 14 px y la línea de datos en `font-data` 12 px: «4 álbumes · 12 guardadas».
- **Guardar:** con sesión, un botón de 44×44 a la derecha (`SaveListButton` compacto).
- **Desde `lg`:** el clic primario (sin teclas modificadoras) y Enter en la fila hacen `preventDefault` y seleccionan la lista. Ctrl o
  Cmd+clic y el clic central abren la lista en otra pestaña, como un enlace normal.
- **Por debajo de `lg`:** la fila es un enlace normal. La detección es `matchMedia("(min-width: 1024px)")`.
- **Fila elegida:** `aria-current="true"`, fondo `ink-surface` y un anillo `ink-border`.
- **«Para completar»:** usa la misma fila. La línea de datos dice cuántas personas la están completando y el enlace va a su ruta de
  `/caminos` (`caminoHref`).

### Vista previa: `ListPreview`
- **Posición:** `sticky top-24` en la columna derecha (`lg:grid-cols-[minmax(0,5fr)_minmax(0,7fr)]`).
- **Cabecera:** mosaico de 160–200 px, tipo y número de elementos, título de 28–38 px, «por <dueño> · actualizada hace N», descripción y
  guardadas. Acciones: «Abrir la lista» (ámbar) y Guardar (con sesión, si la lista no es propia).
- **Elementos:** `ol` con los primeros 8 (número, carátula de 44 px, título y artista), más «Ver la lista completa».
- **Carga:** al elegir una fila, la cabecera se pinta con los datos de la fila y la lista muestra un esqueleto de 4 filas mientras llega
  `GET /api/users/{username}/lists/{listId}`. Se usa `useQuery`, con caché por id, así que volver a una ya vista es instantáneo.
- **Error:** si la petición da 404 o falla, aparece el texto «No se pudo cargar esta lista» y el enlace para abrirla.
- **Destino del enlace:** la colección generada va a su ruta de Explorar (`listHref`, que ya existe); «Para completar» va a `/caminos`.

*Por qué el endpoint de detalle y no uno nuevo:* ya devuelve los ítems ordenados con título, artista y carátula, y aplica la visibilidad
de la lista. Pedir solo 8 no justifica otro endpoint; la lista entera ya está acotada en tamaño.

### Guardadas en todas las pestañas
`listPopularLists` ya llama a `saveCountsFor`. `listDiscoverLists`, `listsFromFollowing` y el modo explorar pasan a llamarlo también,
con una consulta agregada por página. El contrato de los tres endpoints documenta `saveCount` siempre presente; vale 0 si no tiene.

El conteo de guardados de una lista `public` ya es dato público (lo dice `lists-and-favorites.md`). En «De la gente que sigues» puede
haber listas `followers`: el conteo se muestra igual, porque quien la ve ya puede verla.

### Sin riel
- **«Tus listas» (con sesión):** `ListsYourLine`, una línea bajo la frase de entrada: «Retoma: <lista> · Mis listas · Guardadas». Sin
  listas propias: «Aún no tienes listas · Crear la primera».
- **Sin sesión:** `ListsSignUpBand`, una banda después del lector, con borde punteado, título, frase y «Crear cuenta» e «Iniciar
  sesión». La Fase 3 le da su forma final.
- **Retirada:** `ListsContextRail` se borra junto con sus tests.

### Modo explorar
El mismo `ListsReader` con una sola fuente (`discover` con los filtros), sin `tablist`. Se mantiene el rótulo de resultados con
«Limpiar filtros» y el estado «sin resultados». La vista previa también aparece, porque elegir sigue siendo útil.
`CommunityExploreGrid` se retira.

## Risks / Trade-offs

- **Una petición por lista elegida.**
  - *Riesgo:* cada lista nueva que se elige dispara una petición.
  - *Mitigación:* caché por id, sin prefetch al pasar el ratón; es la decisión tomada.
- **Ctrl+clic y lectores de pantalla en filas que seleccionan.**
  - *Riesgo:* la fila hace dos cosas según la tecla.
  - *Mitigación:* solo el clic primario sin modificadores selecciona. La fila elegida se anuncia con `aria-current` y la vista previa es
    una región con nombre («Vista previa: <título>»).
- **Las pruebas de `/lists` dependen de la estructura actual de secciones.**
  - *Riesgo:* esos tests dejan de valer.
  - *Mitigación:* se reescriben con la composición nueva; la lógica de datos (deduplicación con Destacadas, omisiones) se conserva y
    se prueba igual.

## Migration Plan

No hay datos que migrar. El contrato solo suma `saveCount` en dos endpoints más. Revertir el commit restaura las secciones y el riel.

## Open Questions

Ninguna bloqueante.
