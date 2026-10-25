## Context

`/me/collection` es un server component que elige la pestaña y siembra `CollectionShelf` (Tengo) o `WantedShelf`
(Busco). Las pestañas son enlaces del server component; el conteo por formato vive en el estante (`counts`, que ignora
el filtro de formato y respeta `q` y atributo). `CollectionShelf` también sirve `/users/[username]/collection` en modo
lectura. El diálogo de acciones rápidas emite `OWN_DATA_CHANGED_EVENT` al guardar y `providers.tsx` invalida las
series `["collection"]`, así que un estante montado se refresca solo.

## Goals / Non-Goals

**Goals:** resumen legible arriba; segmentos que filtran; pestañas con totales vivos; "sin agrupar"; barra compacta;
alta desde la página.

**Non-Goals:** rediseño de las vistas y acciones por ficha (Fase 3).

## Decisions

**D1. `total` aditivo en los dos listados propios.** Una consulta `count(*)` por usuario, sin filtros, en
`listOwnCollection` y `listOwnWanted` (en paralelo con la lectura). En la colección el campo es opcional en el esquema
porque la lectura de perfil no lo trae. Alternativa descartada: sumar `counts` (cambia con `q` y atributo, y la cifra de
la pestaña no debe moverse al buscar).

**D2. Pestañas como componente cliente con contexto.** `CollectionTabs` (cliente) recibe los totales iniciales del
server component y envuelve al estante; expone `useReportCollectionTotal(tab, total)`. Cada estante informa el `total`
de su primera página (el refetch tras quitar, deshacer o el diálogo lo actualiza). La pestaña inactiva conserva la cifra
del servidor. Fuera del proveedor (perfil) el hook no hace nada. Las pestañas siguen siendo enlaces (`?tab=wanted`),
ahora subrayadas y con la cifra.

**D3. Segmentos por formato.** `CollectionFormatSegments` es un `radiogroup` con `Todo` (suma de `counts`) y los cuatro
formatos; un formato con 0 queda deshabilitado salvo que sea el elegido. Reemplaza la línea de texto y el selector de
formato; el filtro sigue siendo `format` en la API y en la URL. Se muestra también en el perfil (misma estantería).

**D4. `group=none` y nuevo defecto.** `COLLECTION_GROUPINGS` gana `none`; `normalizeSortGroup` y el cliente usan
`none` por defecto, sin prefijo de orden. Elegir "por artista" escribe `group=artist`; un enlace viejo sin `group` se ve
sin agrupar. `groupEntries` con `none` devuelve un solo grupo sin encabezado. La previsualización del perfil arma sus
propios grupos por artista y no cambia.

**D5. Barra.** Una fila `flex-wrap`: buscador (`flex-1`, mínimo 12rem) y Edición, Agrupar y Orden (`ToolbarSelect`, con
la etiqueta dentro y `field-sizing: content` para medir lo que muestran y no la opción más larga). El conmutador de modo
(solo íconos) y "Seleccionar" van a la derecha de los segmentos por formato: los cinco controles no entran junto al
buscador en el ancho de la página. Bajo `sm`, Edición / Agrupar / Orden se esconden detrás de un botón
"Filtros" (`aria-expanded`, `aria-controls`) que muestra el número de filtros activos (atributo, agrupación distinta del
defecto, orden distinto del defecto). "Limpiar filtros" queda al final de la fila cuando hay alguno.

**D6. "Añadir copia".** Botón secundario que abre `QuickActionsDialog` con `initialAction="collection"` (patrón de
`AddPendingButton`). El refresco llega por el evento existente. Solo en Tengo.

## Risks / Trade-offs

- [Cambiar el defecto de agrupación cambia lo que ve quien ya usaba la página] → Es lo que la especificación ya decía;
  "por artista" queda a un toque y en la URL.
- [La cifra de la pestaña inactiva puede quedar vieja si se cambia algo desde otra pestaña del navegador] → Se corrige
  al recargar o al volver a la pestaña.

## Migration Plan

Sin migraciones. La API solo agrega campos. Revertir es revertir el commit.
