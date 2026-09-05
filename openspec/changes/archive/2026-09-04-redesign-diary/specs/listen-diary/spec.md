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

Cada fila del listado del diario propio SHALL abrir con una celda cuadrada fija que muestra la
carátula del objetivo cuando existe y el disco de vinilo (círculos concéntricos) cuando no —la misma
anatomía que usa `/me/feed`, no la variante compacta sin celda reservada a los widgets de Inicio,
porque el diario propio es la página dedicada, no un aside. El título del objetivo SHALL ser el
elemento visual dominante de cada fila, con una afordancia de enlace que no dependa del estado
`:hover`. El contexto de escucha y la reacción (cuando existe) SHALL mostrarse en una línea de
metadato secundaria junto con la audiencia, la fecha (en forma relativa, con la fecha absoluta
disponible como valor accesible) y las acciones de la fila. Ninguna fila SHALL repetir el nombre del
propio usuario: es una gestión del propio historial, no un feed con autores múltiples.

Una entrada con impresión escrita no vacía SHALL mostrarla completa como una cita —tipografía de
lectura en cursiva, comillas tipográficas y una regla vertical neutra a la izquierda que la separa
del resto de la fila— y NUNCA SHALL usar una superficie con fondo o borde propio (esa presentación en
panel queda reservada a `/me/feed`, donde una nota compite por peso con ratings y favoritos vecinos).
Una entrada sin impresión SHALL ocupar una sola fila de baseline.

Las acciones de ampliar (editar) y borrar una entrada SHALL presentarse como afordancias de texto
dentro de la línea de metadato de la fila, sin fondo ni borde propio, y NUNCA SHALL usar el
componente de botón sólido reservado a acciones de una sola vez por pantalla. Al confirmar el borrado,
el mensaje de advertencia SHALL ocupar su propia línea, capaz de ajustar su ancho al contenedor de la
fila, en vez de competir por espacio con la fecha y las acciones. Guardar una edición SHALL cerrar el
formulario automáticamente y SHALL confirmar el éxito con una señal visual momentánea sobre la fila
afectada, sin requerir un mensaje de texto visible; el mismo evento SHALL anunciarse a través de
tecnología de asistencia aunque no haya texto visible en pantalla.

#### Scenario: Fila con carátula o disco

- **WHEN** el usuario abre su propio diario
- **THEN** cada fila muestra la carátula del objetivo cuando existe, o el disco de vinilo cuando no,
  sin repetir su propio `@username`

#### Scenario: Escucha con impresión se muestra como cita

- **WHEN** el diario propio incluye una escucha con una impresión escrita no vacía
- **THEN** la impresión se muestra completa como una cita en cursiva con comillas tipográficas y una
  regla vertical a la izquierda, sin fondo ni borde de panel

#### Scenario: Escucha sin impresión ocupa una sola fila

- **WHEN** el diario propio incluye una escucha sin impresión escrita
- **THEN** la entrada ocupa una sola fila de baseline con el título del objetivo como elemento
  dominante y el contexto, la reacción (si existe), la audiencia y la fecha en la línea de metadato

#### Scenario: Editar y borrar son afordancias de texto

- **WHEN** el usuario ve una entrada de su propio diario
- **THEN** las acciones de ampliar y borrar se muestran como enlaces de texto dentro de la línea de
  metadato de la fila, sin botón sólido con fondo o borde

#### Scenario: La confirmación de borrado no desborda la fila

- **WHEN** el usuario pulsa borrar y aparece el mensaje de confirmación
- **THEN** el mensaje se ajusta al ancho de la fila en su propia línea, sin extenderse fuera del
  contenedor ni superponerse con la fecha o las acciones

#### Scenario: Guardar cierra el formulario y confirma sin texto visible

- **WHEN** el usuario guarda una edición exitosamente
- **THEN** el formulario se cierra sin acción manual adicional y la fila muestra una confirmación
  visual momentánea, sin agregar un mensaje de éxito en texto

#### Scenario: La confirmación de guardado es perceptible por lectores de pantalla

- **WHEN** el usuario guarda una edición exitosamente usando un lector de pantalla
- **THEN** recibe un anuncio de que el cambio se guardó, aunque la confirmación visual no incluya
  texto visible en pantalla

#### Scenario: Fecha relativa con fecha absoluta accesible

- **WHEN** el diario propio muestra la fecha de una entrada
- **THEN** el texto visible es relativo ("hace 2 días") y el elemento de tiempo conserva la fecha
  absoluta como su valor `datetime`
