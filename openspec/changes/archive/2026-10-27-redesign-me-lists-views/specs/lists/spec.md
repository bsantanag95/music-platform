## MODIFIED Requirements

### Requirement: Agregar y quitar ítems
El sistema SHALL permitir al propietario agregar ítems al final de la lista y quitarlos. Un
mismo objetivo SHALL aparecer a lo sumo una vez por lista; agregarlo de nuevo SHALL NOT
duplicarlo. Quitar un ítem SHALL conservar el orden de los restantes. En el detalle propio, quitar SHALL ser inmediato y un aviso
(`role="status"`) SHALL ofrecer Deshacer durante 6 s, que devuelve el ítem a la posición que tenía.

#### Scenario: Agregar un ítem
- **WHEN** el propietario agrega un objetivo existente del tipo de la lista
- **THEN** el ítem queda al final de la lista y se refleja en el detalle

#### Scenario: Agregar un objetivo ya presente
- **WHEN** el propietario agrega un objetivo que ya está en la lista
- **THEN** no se duplica el ítem y la operación responde de forma idempotente

#### Scenario: Quitar un ítem
- **WHEN** el propietario quita un ítem de la lista
- **THEN** el ítem se elimina y el resto conserva su orden

#### Scenario: Ítem de una lista ajena
- **WHEN** un usuario intenta agregar o quitar ítems de una lista que no le pertenece
- **THEN** la API responde `404` con `LIST_NOT_FOUND` y no modifica la lista

#### Scenario: Deshacer quitar
- **WHEN** el propietario quita el tercer ítem de su lista y pulsa Deshacer en el aviso
- **THEN** el ítem vuelve a la lista en la tercera posición

### Requirement: Orden manual de la lista
El sistema SHALL permitir al propietario reordenar los ítems de una lista de forma manual,
persistiendo el nuevo orden en una única operación de reordenamiento. Las afordancias de
reordenamiento SHALL estar disponibles en cada modo de presentación del detalle: en los modos
Detallada e Índice mediante controles de mover una posición arriba o abajo, y en el modo
Gráfico mediante la selección de un ítem y una barra de acciones sobre la selección. El
sistema SHALL ofrecer además mover un ítem **al principio**, **al final** o **a una posición** elegida (1 a N) de la
lista, desde el menú ⋯ de la fila en Detallada e Índice.
Cualquiera de estas afordancias SHALL producir el mismo efecto: una única operación de
reordenamiento con el orden completo resultante. Cada control de reordenar y Quitar SHALL medir al menos 32 px
(44 px con puntero grueso), y un control que no aplica (mover al principio en el primer ítem, al final en el último)
SHALL NOT mostrarse, conservando su lugar para no desalinear las filas.

#### Scenario: Reordenar los ítems
- **WHEN** el propietario envía el orden deseado de los ítems de su lista
- **THEN** el sistema persiste el nuevo orden y el detalle lo refleja

#### Scenario: Reordenar una lista ajena
- **WHEN** un usuario intenta reordenar una lista que no le pertenece
- **THEN** la API responde `404` con `LIST_NOT_FOUND` y no modifica la lista

#### Scenario: Mover un ítem una posición
- **WHEN** el propietario mueve un ítem una posición arriba o abajo desde el modo Detallada o
  Índice
- **THEN** el orden se persiste en una sola operación y el nuevo orden se refleja en todos los
  modos

#### Scenario: Reordenar desde el modo Gráfico
- **WHEN** el propietario selecciona un ítem en el modo Gráfico y usa la barra de acciones
  para moverlo
- **THEN** el orden se persiste en una sola operación y la selección se anuncia de forma
  accesible

#### Scenario: Mover al principio o al final
- **WHEN** el propietario elige mover un ítem al principio o al final de la lista
- **THEN** el ítem queda en esa posición extrema y el resto conserva su orden relativo

#### Scenario: Extremos que no aplican
- **WHEN** el propietario ve el primer ítem de su lista
- **THEN** no aparecen "al principio" ni "subir" para ese ítem, y los demás controles quedan alineados con los de las
  otras filas

#### Scenario: Mover a una posición
- **WHEN** el propietario elige "Mover a la posición…" en el ítem 12 de una lista de 20 y escribe 2
- **THEN** el ítem queda segundo, el resto conserva su orden relativo y el cambio se persiste en una sola operación

## ADDED Requirements

### Requirement: Estantería de Mis listas y Guardadas
`/me/lists` SHALL mostrar las listas de Mis listas y de Guardadas como una estantería: el mosaico de carátulas a todo el
ancho de su columna, con el título y los metadatos debajo, en dos columnas en pantallas angostas y cuatro desde `md`. En
Mis listas, las listas fijadas SHALL agruparse bajo "Fijadas", arriba de "Todas", cuando haya alguna. Cada lista propia
SHALL tener un menú ⋯ sobre su carátula con "Fijar arriba" o "Desfijar", "Editar datos…" (título, descripción y
audiencia en un diálogo), "Ver como la ven otros" (solo si no es privada) y "Eliminar lista…". Una lista sin ítems SHALL
mostrar, en lugar del mosaico, un recuadro que dice qué se puede agregar según su tipo.

#### Scenario: Fijadas arriba
- **WHEN** el usuario tiene dos listas fijadas entre catorce
- **THEN** ve "Fijadas" con esas dos y, debajo, "Todas" con las doce restantes

#### Scenario: Editar sin abrir la lista
- **WHEN** el usuario elige "Editar datos…" en el menú de "80s Rock" y cambia la audiencia a Pública
- **THEN** el diálogo guarda el cambio y la tarjeta muestra "Pública" sin salir de la página

#### Scenario: Lista vacía
- **WHEN** una lista de álbumes no tiene ítems
- **THEN** su tarjeta muestra "Añade el primer álbum" en lugar del mosaico
