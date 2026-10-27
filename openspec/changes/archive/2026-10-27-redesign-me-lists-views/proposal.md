## Why

Las Fases 1 y 2 de `/me/lists` corrigieron los errores y rehicieron la cabecera y la barra. Queda la parte de la
auditoría que toca las vistas:

- **Las tarjetas son filas de 112–136 px con un mosaico de 80 px**: 14 listas ocupan 3600 px en móvil y las carátulas no
  se reconocen. `/lists` ya usa una estantería (mosaico a todo el ancho, título debajo) para lo mismo.
- **Tres acciones de texto por tarjeta**, una repetida («Editar» lleva al mismo sitio que el título), y «Fijada» mezclada
  con los metadatos.
- **Editar el título, la descripción o la audiencia** obliga a abrir la lista.
- **Una lista vacía** se ve igual que una llena, con un disco genérico.
- **En el detalle**, cada fila lleva cuatro flechas y «Quitar»; mover un ítem lejos exige muchos toques, y quitar no se
  puede deshacer.

## What Changes

- **Estantería** en Mis listas y Guardadas: mosaico a todo el ancho de su columna, título y metadatos debajo; dos columnas
  en móvil, cuatro desde `md`.
- **Sección «Fijadas»** arriba de Mis listas cuando hay alguna, y «Todas» debajo; la marca sale de los metadatos.
- **Menú ⋯** sobre la carátula de cada lista propia: Fijar arriba / Desfijar, Editar datos…, Ver como la ven otros (si no
  es privada) y Eliminar lista…. «Editar datos…» abre un diálogo con título, descripción y audiencia (el mismo formulario
  que el detalle).
- **Lista vacía**: en lugar del mosaico, un recuadro que dice qué agregar («Añade el primer álbum»).
- **Detalle**: cada fila lleva subir, bajar y un ⋯ con Al principio, Al final, Mover a la posición… y Quitar. Quitar es
  inmediato y un aviso ofrece Deshacer durante 6 s, que devuelve el ítem a su posición.
- **`RowMenu`** se abre hacia el otro lado si no cabe y sus opciones miden 44 px con puntero grueso.

### Goals

- Que las listas se reconozcan por sus carátulas y la página se recorra sin desplazarse tanto.
- Gestionar una lista sin abrirla y mover un ítem lejos sin tocar veinte veces.

### Non-Goals

- Arrastrar para reordenar, portada elegible, nota por ítem (backlog de `lists-and-favorites.md`).
- Cambios en `/lists` o en el listado de un perfil ajeno.

## Capabilities

### Modified Capabilities

- `lists`: quitar con deshacer, mover a una posición, estantería con menú y lista vacía en `/me/lists`.

## Impact

- `src/components/lists/`: `MyListsTab`, `SavedListsTab`, `ListCard` (recuadro de lista vacía), `ListItemControls`,
  `ItemsDetailed`, `ItemsIndex`, `ListDetail`, `ListDetailHeader` (formulario extraído), nuevos `MyListCardMenu`,
  `ListMetaForm`, `MoveToPositionDialog`.
- `src/components/ui/RowMenu.tsx`.
- `messages/{es,en}/lists.json`, `docs/05-features/lists-and-favorites.md`.
- Sin cambios de API ni de esquema.
