## Context

`ListCard` ya tiene la variante `shelf` (redesign-lists-page) con la acción flotando sobre el mosaico. `RowMenu` es el
menú ⋯ compartido de la app. La API ya permite agregar un ítem y reordenar en una operación.

## Decisions

**D1. Estantería con la variante existente.** `layout="shelf"` y `ListsGrid cols="shelf"`, como `/lists`. La descripción
no se muestra en la estantería (se lee en el detalle).

**D2. Fijadas como sección, no como marca.** La API ya devuelve las fijadas primero; el cliente parte la página en
«Fijadas» y «Todas» solo si hay alguna fijada.

**D3. Menú ⋯ de la lista propia** (`MyListCardMenu`, sobre `RowMenu`): Fijar arriba / Desfijar, Editar datos…, Ver como la
ven otros (enlace público, solo si la audiencia no es privada) y Eliminar lista… (el diálogo de la Fase 1). Desaparecen
los enlaces de texto.

**D4. Editar datos en un diálogo.** El formulario de `ListDetailHeader` pasa a `ListMetaForm` y lo usan el detalle (en
línea, como hoy) y la tarjeta (en `Dialog`). Guardar invalida `["lists", "mine"]`.

**D5. Lista vacía.** `ListCard` acepta `emptyHint`: con `itemCount === 0` la estantería muestra un recuadro punteado con
ese texto en lugar del mosaico.

**D6. Fila del detalle.** Subir y bajar quedan a la vista; Al principio, Al final, Mover a la posición… y Quitar van al ⋯
(un menú por fila, en Detallada e Índice). «Mover a la posición…» abre un diálogo con un número entre 1 y N y usa
`moveToEdge`/`moveByOffset` como los demás: una sola operación con el orden completo.

**D7. Quitar con deshacer.** Quitar es inmediato y `UndoToast` (6 s) ofrece Deshacer: vuelve a agregar el objetivo
(`addItemToList`, que lo pone al final) y reordena con el orden anterior. Si el deshacer falla, el aviso lo dice sin
ofrecer otro intento. El modo Gráfico conserva su barra, que llama al mismo quitar.

**D8. `RowMenu` más robusto**: si el menú se saldría por la izquierda (primera columna de la estantería en un teléfono),
se abre hacia la derecha; las opciones miden 44 px con puntero grueso y Escape devuelve el foco al disparador.

## Risks / Trade-offs

- [Deshacer recrea el ítem con otro id] → Nadie guarda ese id fuera del detalle; el orden vuelve a ser el de antes.
- [El menú añade un toque para Fijar o Eliminar] → Son acciones poco frecuentes; a cambio la tarjeta deja de llevar tres
  enlaces.
