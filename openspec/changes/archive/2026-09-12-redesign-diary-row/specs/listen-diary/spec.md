## MODIFIED Requirements

### Requirement: Presentación del diario propio

Cada fila del listado del diario propio SHALL abrir con una celda cuadrada fija que muestra la
carátula del objetivo cuando existe y el disco de vinilo (círculos concéntricos) cuando no —la misma
anatomía que usa `/me/feed`, no la variante compacta sin celda reservada a los widgets de Inicio,
porque el diario propio es la página dedicada, no un aside. Cada fila SHALL además mostrar, en una
columna dedicada de fecha, el número de día calendario de la entrada, mostrado solo cuando difiere
del de la fila anterior dentro del mismo grupo de mes — el mes en sí nunca se repite por fila, lo
dice una sola vez el encabezado del grupo (ver "Vista de cronología del diario propio"); la fecha
relativa SHALL seguir disponible como valor accesible y como texto al pasar el mouse o el foco sobre
el bloque. El título del objetivo SHALL ser el elemento visual dominante de cada fila, con una
afordancia de enlace que no dependa del estado `:hover`. Cuando el objetivo es un álbum o una
canción con artista acreditado, el nombre de ese artista junto al título SHALL enlazar a su propia
página — igual que ya hace el resto del historial cronológico del producto (`/me/feed`); cuando el
objetivo ya es el artista, o no hay artista acreditado, el nombre SHALL mostrarse como texto plano.
El contexto de escucha SHALL mostrarse en
una línea de metadato secundaria junto con la audiencia; esa misma línea SHALL llevar, junto a la
audiencia y antes de las acciones, un espacio de ancho fijo para el ícono de la reacción de la
entrada (ver "Representación de las reacciones") que SHALL reservarse siempre, tenga o no reacción
la entrada — nunca SHALL omitirse cuando no hay reacción, para que la posición del control de editar
y del menú "···" no varíe de una fila a otra según haya o no reacción. Ninguna fila SHALL repetir el
nombre del propio usuario: es una gestión del propio historial, no un feed con autores múltiples.

Una entrada con impresión escrita no vacía SHALL mostrarla completa como una cita —tipografía de
lectura en cursiva, comillas tipográficas y una regla vertical neutra a la izquierda que la separa
del resto de la fila— y NUNCA SHALL usar una superficie con fondo o borde propio (esa presentación en
panel queda reservada a `/me/feed`, donde una nota compite por peso con ratings y favoritos vecinos).
Una entrada sin impresión SHALL ocupar una sola fila de baseline.

La acción de ampliar (editar) una entrada SHALL presentarse como un control de solo ícono siempre
visible en la fila, con nombre accesible, y NUNCA SHALL usar el componente de botón sólido reservado
a acciones de una sola vez por pantalla. Las acciones adicionales sobre una entrada —borrar,
registrar otra escucha del mismo objetivo, agregar el objetivo a una lista— SHALL agruparse detrás de
un control de menú de solo ícono ("···") en la fila, en vez de mostrarse como enlaces de texto
sueltos o botones adicionales permanentes; el texto de las opciones de ese menú SHALL compartir el
mismo tamaño tipográfico que el resto de los datos de la fila (contexto, audiencia), nunca uno mayor.
Al elegir borrar desde el menú, el mensaje de advertencia SHALL ocupar su propia línea, capaz de
ajustar su ancho al contenedor de la fila, en vez de competir por espacio con la fecha y las acciones.
Guardar una edición SHALL cerrar el formulario automáticamente y SHALL confirmar el éxito con una
señal visual momentánea sobre la fila afectada, sin requerir un mensaje de texto visible; el mismo
evento SHALL anunciarse a través de tecnología de asistencia aunque no haya texto visible en pantalla.

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
- **THEN** la entrada ocupa una sola fila de baseline, con el título del objetivo como elemento
  dominante, el número de día en su propia columna, y el contexto, la audiencia y el ícono de
  reacción (si existe) en la línea de metadato

#### Scenario: Editar y borrar son afordancias de texto

- **WHEN** el usuario ve una entrada de su propio diario
- **THEN** edita con un ícono siempre visible y accede a Eliminar (junto con Registrar otra escucha
  y Agregar a lista) desde un menú "···" — ninguna de estas acciones usa el componente de botón
  sólido, ni, ya no, enlaces de texto sueltos como en un pase anterior de este mismo diseño

#### Scenario: La confirmación de borrado no desborda la fila

- **WHEN** el usuario elige borrar desde el menú y aparece el mensaje de confirmación
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

#### Scenario: Bloque de fecha con día deduplicado

- **WHEN** el usuario ve dos filas consecutivas del mismo día calendario, dentro del mismo grupo de
  mes
- **THEN** la primera muestra el número de día y la siguiente lo deja en blanco, sin repetirlo

#### Scenario: Cambio de día entre filas consecutivas

- **WHEN** dos filas consecutivas del diario pertenecen a días calendario distintos
- **THEN** cada una muestra su propio número de día

#### Scenario: Fecha relativa con fecha absoluta accesible

- **WHEN** el usuario pasa el mouse o el foco sobre el bloque de fecha de una entrada
- **THEN** obtiene la fecha relativa ("hace 2 días") como información complementaria (tooltip o
  valor accesible) — el texto principal visible de la columna ya no es la fecha relativa sino el
  número de día, invirtiendo cuál de las dos es el dato visible y cuál el accesible respecto a un
  pase anterior de este mismo diseño

#### Scenario: La reacción no desalinea la fila

- **WHEN** el usuario ve filas consecutivas donde unas tienen reacción y otras no
- **THEN** el control de editar y el menú "···" quedan en la misma posición en todas esas filas — el
  espacio de la reacción se reserva igual, con o sin ícono

#### Scenario: El artista acreditado de un álbum o canción enlaza a su página

- **WHEN** el usuario ve en su diario una entrada cuyo objetivo es un álbum o una canción con
  artista acreditado
- **THEN** el nombre del artista, junto al título, es un enlace a la página de ese artista

#### Scenario: Sin enlace de artista para objetivos que ya son un artista, o sin acreditar

- **WHEN** el usuario ve en su diario una entrada cuyo objetivo es un artista, o un álbum/canción sin
  artista acreditado
- **THEN** el nombre del artista (si se muestra) aparece como texto plano, sin enlace

### Requirement: Vista de cronología del diario propio

El diario propio SHALL presentar siempre sus entradas agrupadas por **mes calendario** de su fecha
de registro, con un encabezado por mes — no SHALL ofrecer una vista de lista plana alternativa ni un
conmutador entre vistas: la agrupación por mes es la única presentación. Dentro de cada mes las
entradas SHALL conservar el orden cronológico descendente y las mismas afordancias de edición y menú
de acciones que el resto del diario. La vista de cronología NO SHALL mostrar conteos por mes, totales
ni rachas: es la misma información reordenada, no un resumen estadístico. El agrupado SHALL operar
sobre las entradas ya cargadas, de modo que también agrupe las que llegan al pedir más.

#### Scenario: Agrupar por mes

- **WHEN** el usuario abre su diario y tiene entradas de varios meses
- **THEN** ve un encabezado por mes y, bajo cada uno, sus entradas en orden cronológico descendente

#### Scenario: Sin conmutador de vista

- **WHEN** el usuario abre su diario
- **THEN** no ve ningún control para elegir entre una vista de lista y una de cronología — la
  agrupación por mes con encabezado es la única forma en que se presenta el diario

#### Scenario: La cronología no es un resumen

- **WHEN** el usuario ve su diario
- **THEN** no aparece ningún conteo por mes, total ni racha; solo los encabezados de mes y las filas

#### Scenario: La cronología agrupa lo que se va cargando

- **WHEN** el usuario pide más entradas
- **THEN** las nuevas entradas se ubican bajo el encabezado del mes que les corresponde, sin romper
  la agrupación

### Requirement: Representación de las reacciones

El sistema SHALL mostrar las reacciones con texto localizado y un ícono de refuerzo, sin depender
únicamente del color ni del emoji. El sistema SHALL diferenciar visualmente la ausencia de reacción
de la reacción neutra, y SHALL traducir las etiquetas en español e inglés. En la línea de metadato de
la fila del diario propio, el sistema SHALL exponer el nombre localizado de la reacción como nombre
accesible del ícono (y como texto visible al pasar el mouse o el foco), en vez de como texto siempre
renderizado en pantalla; esta excepción SHALL limitarse a esa fila. Cualquier otro lugar donde se
muestre una reacción —el feed, el panel de ampliación de una entrada— SHALL seguir mostrando el texto
localizado siempre visible junto al ícono.

#### Scenario: Etiquetas localizadas
- **WHEN** la interfaz muestra la reacción `liked`
- **THEN** el texto visible es `Me gustó` en español e `Like it` en inglés, con icono de refuerzo

#### Scenario: Ausencia frente a neutra
- **WHEN** la interfaz muestra una entrada sin reacción y otra con reacción `neutral`
- **THEN** la primera no muestra reacción y la segunda muestra la etiqueta localizada `Neutro`/
  `Neutral` con su icono

#### Scenario: Reacción del diario en la línea de metadato, solo ícono con nombre accesible

- **WHEN** el diario propio muestra una entrada con reacción
- **THEN** el ícono aparece en la línea de metadato, junto a la audiencia, con el nombre localizado
  de la reacción disponible como nombre accesible y como texto al pasar el mouse o el foco, sin texto
  siempre visible junto a él

#### Scenario: Sin reacción, el espacio queda reservado pero sin ícono

- **WHEN** una entrada del diario no tiene reacción
- **THEN** no se muestra ningún ícono en la línea de metadato, pero el espacio que ocuparía sigue
  reservado — nunca se omite ni corre el resto de la línea

#### Scenario: El panel de ampliación conserva el texto visible

- **WHEN** el usuario abre el panel para elegir o corregir la reacción de una entrada
- **THEN** cada opción se muestra con su texto localizado siempre visible, no solo con un ícono

#### Scenario: El feed no adopta la excepción

- **WHEN** una reacción se muestra fuera de la línea de metadato del diario propio (por ejemplo, en
  el feed)
- **THEN** el texto localizado permanece siempre visible junto al ícono, sin aplicar la excepción de
  la fila del diario

## ADDED Requirements

### Requirement: Acciones rápidas desde la fila del diario

El sistema SHALL permitir, desde el menú de una fila del diario propio, registrar una escucha
adicional sobre el mismo objetivo de esa fila y agregar ese objetivo a una lista propia compatible,
sin salir de `/me/diary`.

#### Scenario: Registrar otra escucha desde la fila

- **WHEN** el usuario elige "Registrar otra escucha" en el menú de una fila
- **THEN** el sistema crea una nueva entrada de diario sobre el mismo objetivo, con audiencia
  `private` por defecto, y la muestra al principio del listado con su panel de ampliación ya
  abierto

#### Scenario: Agregar a lista desde la fila

- **WHEN** el usuario elige "Agregar a lista" en el menú de una fila y selecciona una lista propia
  compatible con el tipo del objetivo
- **THEN** el objetivo de esa entrada se agrega a la lista elegida

#### Scenario: Sin listas compatibles

- **WHEN** el usuario abre "Agregar a lista" desde una fila y no tiene ninguna lista propia
  compatible con el tipo del objetivo
- **THEN** el sistema ofrece crear una lista nueva del tipo correspondiente sin salir del diario
