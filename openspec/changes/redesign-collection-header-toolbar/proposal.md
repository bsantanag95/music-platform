## Why

Tras la Fase 1 (`refine-collection-page-phase1`) la página `/me/collection` ya no tiene errores, pero su parte
superior sigue siendo la de una lista técnica:

- El "retrato" por formato es una línea de texto (`3 vinilos · 10 CD · sin cassettes · sin otros`) sin total, que
  repite lo que hace el selector "Todos los formatos".
- Las pestañas Tengo / Busco no dicen cuántas copias hay en cada una.
- No hay forma de ver la estantería **sin agrupar**: el defecto es "por artista", y con uno o dos discos por artista la
  Estantería se vuelve una pila de secciones de una ficha (13 copias ocupan 2.984 px). La especificación ya dice que
  "sin agrupar" es el defecto; el código no lo ofrece.
- La barra ocupa cuatro filas en móvil (buscador, formato, atributo, agrupar + ordenar), así que el primer disco
  aparece a 520 px, y "Seleccionar" compite en jerarquía con el conmutador de modo.
- No hay forma de agregar una copia desde la página: hay que ir al álbum.

## What Changes

- **Encabezado:** título y una línea de descripción a la izquierda; a la derecha **"Añadir copia"** (Tengo), que abre el
  diálogo de acciones rápidas ya en la acción Colección. Al guardar, el diálogo avisa y la estantería se recarga.
- **Pestañas con conteo:** `Tengo 13 · Busco 6`, subrayadas. La cifra es el total de la pestaña (sin filtros) y se
  actualiza al quitar, deshacer o agregar.
- **Segmentos por formato:** `Todo 13 · Vinilo 3 · CD 10 · Cassette 0 · Otro 0` reemplazan la línea de conteo y el
  selector de formato; filtran al tocarlos y los de 0 quedan deshabilitados. Usan el `counts` que la API ya devuelve.
- **"Sin agrupar" y nuevo defecto:** `group` admite `none`, que pasa a ser el defecto de la colección propia y de la del
  perfil. Por artista, por formato y por fecha siguen disponibles. Elegir "por artista" se escribe en la URL.
- **Barra en una línea:** buscador, Edición, Agrupar, Orden, conmutador de modo y "Seleccionar" en una sola fila que se
  parte en escritorio angosto. Bajo `sm`, buscador + botón **"Filtros"** que despliega Edición / Agrupar / Orden en
  línea; el botón muestra cuántos filtros hay activos.
- **API:** `GET /api/me/collection` y `GET /api/me/collection/wanted` agregan `total` (cantidad sin filtros), aditivo.
- **Busco:** mismo encabezado y pestañas; su barra queda en una línea (buscador + Orden).

### Goals

- Una parte superior que se lee como resumen de la colección y no como formulario.
- Primer disco visible en el primer pantallazo en móvil.

### Non-Goals

- Menú `⋯`, hoja lateral, Índice como tabla, quitar en lote, "Lo conseguí", "Ya tienes" y año del álbum (Fase 3).
- Alta en Busco desde la página (el diálogo de acciones rápidas no tiene "La busco").
- Cambios de esquema o dependencias.

## Capabilities

### New Capabilities

Ninguna.

### Modified Capabilities

- `physical-collection`: el listado propio admite `group=none` (defecto) y devuelve `total`; el encabezado presenta el
  conteo como segmentos que filtran; la página suma descripción, "Añadir copia", pestañas con conteo y barra en una
  línea con "Filtros" en móvil.
- `collection-wishlist`: el listado propio devuelve `total` y su pestaña lo muestra.

## Impact

- `src/services/collection/{types,collection,wanted,wanted-types}.ts`, `src/lib/api/schemas.ts`,
  `src/lib/api/collection-filters.ts` y sus pruebas.
- `src/app/[locale]/me/collection/page.tsx`; `src/components/collection/` (`CollectionShelf`, `CollectionToolbar`,
  `WantedShelf`, nuevos `CollectionTabs`, `CollectionFormatSegments`, `AddCopyButton`).
- `messages/{es,en}/collection.json`.
- `docs/05-features/physical-collection.md`, `docs/04-api/contracts.md`.
