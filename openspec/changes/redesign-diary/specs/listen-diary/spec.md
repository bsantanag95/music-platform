## MODIFIED Requirements

### Requirement: Diario propio
El sistema SHALL permitir al usuario autenticado listar sus propias escuchas en orden cronológico
descendente con paginación. El listado SHALL contener únicamente entradas del usuario que lo
consulta y SHALL incluir el objetivo, el contexto, la impresión, la reacción y la audiencia de cada
entrada. El listado SHALL presentarse como una lista vertical de filas (no como tarjetas ancladas
independientes) y NUNCA SHALL agrupar ni colapsar dos o más entradas en una sola fila: cada
escucha SHALL permanecer accesible de forma individual para su ampliación o borrado,
independientemente de cuántas entradas consecutivas compartan contexto, ausencia de reacción o
ausencia de impresión.

#### Scenario: Listar el diario
- **WHEN** un usuario autenticado abre su diario
- **THEN** ve sus escuchas ordenadas de la más reciente a la más antigua, paginadas

#### Scenario: Diario vacío
- **WHEN** un usuario sin escuchas abre su diario
- **THEN** ve un estado vacío localizado y no un error técnico

#### Scenario: Varias escuchas sin nota consecutivas no se colapsan
- **WHEN** un usuario tiene 3 o más escuchas consecutivas sin impresión escrita ni reacción
- **THEN** cada una se muestra como su propia fila, con sus propias acciones de ampliar y borrar,
  y ninguna se pliega en una fila resumen

## ADDED Requirements

### Requirement: Presentación del diario propio

La presentación del listado del diario propio SHALL usar la misma anatomía de fila por peso de
contenido que las demás listas cronológicas del producto (feed de seguidos, rastro reciente de
Inicio): una entrada con impresión escrita no vacía SHALL mostrar el texto completo sobre una
superficie visualmente diferenciada del fondo (un escalón de temperatura más claro, sin sombra); una
entrada sin impresión SHALL ocupar una sola fila de baseline. El título del objetivo SHALL ser el
elemento visual dominante de cada fila, con una afordancia de enlace que no dependa del estado
`:hover`. El contexto de escucha y la reacción (cuando existe) SHALL mostrarse en una línea de
metadato secundaria junto con la fecha, expresada en forma relativa con la fecha absoluta disponible
como valor accesible.

Las acciones de ampliar (editar) y borrar una entrada SHALL presentarse como afordancias de texto
dentro de la línea de metadato de la fila, sin fondo ni borde propio, y NUNCA SHALL usar el
componente de botón sólido reservado a acciones de una sola vez por pantalla. El listado del diario
propio NO SHALL mostrar una celda de carátula o disco por fila, ni repetir el nombre del propio
usuario: es una gestión del propio historial, no un feed con autores múltiples.

#### Scenario: Escucha con impresión se muestra como bloque con texto

- **WHEN** el diario propio incluye una escucha con una impresión escrita no vacía
- **THEN** la impresión se muestra completa sobre una superficie más clara que el fondo, sin sombra,
  junto con el objetivo, el contexto y la fecha relativa

#### Scenario: Escucha sin impresión ocupa una sola fila

- **WHEN** el diario propio incluye una escucha sin impresión escrita
- **THEN** la entrada ocupa una sola fila de baseline con el título del objetivo como elemento
  dominante y el contexto, la reacción (si existe) y la fecha en la línea de metadato

#### Scenario: Editar y borrar son afordancias de texto

- **WHEN** el usuario ve una entrada de su propio diario
- **THEN** las acciones de ampliar y borrar se muestran como enlaces de texto dentro de la línea de
  metadato de la fila, sin botón sólido con fondo o borde

#### Scenario: Sin celda de carátula ni repetición del propio nombre

- **WHEN** el usuario abre su propio diario
- **THEN** ninguna fila muestra una celda de carátula o disco, ni repite su propio `@username`

#### Scenario: Fecha relativa con fecha absoluta accesible

- **WHEN** el diario propio muestra la fecha de una entrada
- **THEN** el texto visible es relativo ("hace 2 días") y el elemento de tiempo conserva la fecha
  absoluta como su valor `datetime`
