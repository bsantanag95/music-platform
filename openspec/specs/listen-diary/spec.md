# listen-diary

## Purpose

Diario de escucha: registro manual e **intencional** de "qué se escuchó y cómo se sintió" sobre
artista, álbum o canción — no un historial automático ni una lista de completitud. Entradas
append-only con reacción emocional (gramática de sensación, sin estrellas), contexto, impresión
breve y audiencia. Un registro rápido nace `private` y sube a `followers` al ganar intención
(impresión o reacción), salvo elección explícita. El diario propio se ve como lista o como
cronología por mes; la audiencia gobierna qué ve cada lector en el feed y el perfil.
## Requirements
### Requirement: Registro manual de una escucha
El sistema SHALL permitir a un usuario autenticado registrar una escucha sobre un artista, un álbum
o una canción mediante una acción de baja fricción. Una escucha SHALL ser un registro append-only:
registrar de nuevo el mismo objetivo crea una entrada nueva y nunca reemplaza una anterior.

#### Scenario: Registrar una escucha
- **WHEN** un usuario autenticado marca como escuchado un artista, álbum o canción válido
- **THEN** el sistema crea una entrada de diario sin exigir más datos

#### Scenario: Objetivo inexistente o inválido
- **WHEN** el sistema recibe una escucha cuyo objetivo no existe o no es uno de los tres tipos
  permitidos
- **THEN** la API responde un error de validación y no crea ninguna entrada

#### Scenario: Múltiples escuchas del mismo objetivo
- **WHEN** un usuario registra más de una escucha sobre el mismo álbum
- **THEN** cada registro crea una entrada distinta y ninguna reemplaza a la anterior

#### Scenario: Sesión requerida
- **WHEN** una request sin sesión intenta registrar una escucha
- **THEN** la API responde `401` con código `AUTH_REQUIRED` y no crea ninguna entrada

### Requirement: Reacción emocional de la escucha
El sistema SHALL permitir asociar a cada escucha una reacción emocional opcional con los valores
estables `liked`, `loved`, `obsessed`, `neutral` o `disliked`. La ausencia de reacción SHALL
representarse como dato nulo y SHALL ser distinta de la reacción `neutral` elegida explícitamente.
La reacción SHALL ser independiente de la valoración numérica vigente del objetivo.

#### Scenario: Elegir una reacción
- **WHEN** el usuario asigna la reacción `loved` a una entrada
- **THEN** la entrada queda con `loved` y el valor persistido no depende del idioma de la UI

#### Scenario: Sin reacción
- **WHEN** el usuario crea una entrada sin indicar reacción
- **THEN** la entrada queda sin reacción, distinta de una reacción neutra elegida

#### Scenario: Reacción neutra explícita
- **WHEN** el usuario elige la reacción `neutral`
- **THEN** la entrada queda con reacción `neutral`, distinta de la ausencia de dato

#### Scenario: Reacción inválida
- **WHEN** el sistema recibe una reacción fuera de la taxonomía permitida
- **THEN** la API responde un error de validación y no modifica la entrada

#### Scenario: La reacción no afecta el rating
- **WHEN** el usuario cambia la reacción de una escucha de un objetivo con valoración vigente
- **THEN** la valoración vigente del objetivo no se crea, modifica ni elimina

### Requirement: Contexto de escucha
El sistema SHALL registrar en cada escucha un contexto entre `first_listen`, `relisten` y
`rediscovery`. La primera escucha de un usuario sobre un objetivo SHALL proponerse como
`first_listen` y las posteriores como `relisten`. El usuario SHALL poder corregir el contexto de una
entrada.

#### Scenario: Primera escucha
- **WHEN** un usuario registra su primera escucha sobre un objetivo
- **THEN** el contexto queda como `first_listen` por defecto

#### Scenario: Escuchas posteriores
- **WHEN** un usuario registra una nueva escucha sobre un objetivo que ya escuchó
- **THEN** el contexto queda como `relisten` por defecto

#### Scenario: Corregir el contexto
- **WHEN** el usuario edita el contexto de una entrada propia a `rediscovery`
- **THEN** la entrada queda con ese contexto

### Requirement: Impresión breve
El sistema SHALL permitir asociar a una escucha un texto libre opcional de hasta 500 caracteres.

#### Scenario: Guardar impresión
- **WHEN** el usuario guarda un texto de hasta 500 caracteres en una entrada propia
- **THEN** el texto queda asociado a la entrada

#### Scenario: Exceder el límite
- **WHEN** el usuario envía un texto mayor a 500 caracteres
- **THEN** la API responde un error de validación y no modifica la entrada

### Requirement: Audiencia de la escucha

El sistema SHALL permitir configurar la audiencia de cada escucha entre `private`,
`followers` y `public`. Una escucha registrada **sin impresión ni reacción** SHALL nacer
con audiencia **`private`** por defecto. Cuando una escucha propia gana una impresión o una
reacción y el usuario **no ha elegido una audiencia de forma explícita**, su audiencia por
defecto SHALL pasar a `followers`; una vez que el usuario fija una audiencia a mano, esa
elección NUNCA SHALL revertirse automáticamente. El usuario SHALL poder cambiar la
audiencia de cualquier entrada propia en cualquier momento. Este comportamiento por defecto
SHALL aplicarse solo a entradas nuevas; las entradas existentes SHALL conservar su
audiencia. Las escuchas de un perfil privado SHALL ser privadas por defecto y podrán
hacerse públicas explícitamente.

#### Scenario: Audiencia por defecto

- **WHEN** un usuario registra una escucha sin impresión ni reacción y sin especificar
  audiencia
- **THEN** la entrada queda con audiencia `private`

#### Scenario: La audiencia sigue a la intención

- **WHEN** el usuario agrega una impresión o una reacción a una entrada `private` sin haber
  elegido una audiencia de forma explícita
- **THEN** la audiencia por defecto de esa entrada pasa a `followers`, y si luego quita la
  impresión y la reacción vuelve a `private`

#### Scenario: La elección explícita no se revierte

- **WHEN** el usuario fija la audiencia de una entrada a un valor concreto y después cambia
  su impresión o su reacción
- **THEN** la audiencia permanece en el valor que el usuario eligió

#### Scenario: Entrada existente conserva su audiencia

- **WHEN** el usuario edita una entrada creada antes de este comportamiento, cuya audiencia
  es `followers`
- **THEN** la audiencia se mantiene en `followers` salvo que el usuario la cambie a mano

#### Scenario: Cambiar audiencia

- **WHEN** el usuario cambia la audiencia de una entrada propia a `private`
- **THEN** la entrada queda privada y no será visible en superficies para otras personas

### Requirement: Diario propio
El sistema SHALL permitir al usuario autenticado listar sus propias escuchas en orden cronológico
descendente con paginación. El listado SHALL contener únicamente entradas del usuario que lo
consulta y SHALL incluir el objetivo, el contexto, la impresión, la reacción y la audiencia de cada
entrada. El listado SHALL presentarse como una lista vertical de filas (no como tarjetas ancladas
independientes) y NUNCA SHALL agrupar ni colapsar dos o más entradas en una sola fila: cada
escucha SHALL permanecer accesible de forma individual para su ampliación o borrado,
independientemente de cuántas entradas consecutivas compartan contexto, ausencia de reacción o
ausencia de impresión. El sistema SHALL permitir acotar el listado combinando, de forma independiente
y simultánea: texto libre, contexto, reacción (incluida la ausencia explícita de reacción) y
audiencia. La búsqueda por texto SHALL coincidir tanto con el título del objetivo (artista, álbum
o canción) como con el artista acreditado como principal de un álbum o canción, para que una
búsqueda por nombre de artista encuentre también sus álbumes y canciones, no únicamente las
entradas cuyo objetivo es la artista misma. Cada álbum o canción listado SHALL mostrar el nombre
de su artista acreditado como principal junto al título. Cada filtro SHALL aplicarse sobre la
totalidad de las entradas del usuario, no únicamente sobre las ya cargadas en el cliente. Un valor
de contexto, reacción o audiencia fuera de su vocabulario cerrado SHALL producir un error de
validación y no SHALL alterar el listado.

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

#### Scenario: Buscar por título del objetivo
- **WHEN** el usuario busca un texto que coincide parcialmente con el título de un artista, álbum
  o canción de alguna de sus escuchas
- **THEN** el listado muestra únicamente las entradas cuyo objetivo coincide, sin importar en qué
  página habrían aparecido sin el filtro

#### Scenario: Buscar por el artista de un álbum o canción
- **WHEN** el usuario busca el nombre de una artista y alguna de sus escuchas es un álbum o
  canción acreditado a esa artista (no una escucha de la artista misma)
- **THEN** esa entrada aparece en el listado igual que si el texto buscado fuera el título del
  álbum o la canción

#### Scenario: Filtrar por contexto
- **WHEN** el usuario filtra su diario por el contexto `rediscovery`
- **THEN** el listado muestra únicamente las entradas registradas con ese contexto

#### Scenario: Filtrar por ausencia de reacción
- **WHEN** el usuario filtra su diario para ver solo las entradas sin reacción
- **THEN** el listado muestra únicamente las entradas cuya reacción es nula, sin incluir las que
  tienen la reacción `neutral` elegida explícitamente

#### Scenario: Filtrar por audiencia
- **WHEN** el usuario filtra su diario por audiencia `private`
- **THEN** el listado muestra únicamente sus entradas privadas

#### Scenario: Combinar filtros
- **WHEN** el usuario aplica a la vez una búsqueda de texto, un contexto y una reacción
- **THEN** el listado muestra solo las entradas que cumplen las tres condiciones simultáneamente

#### Scenario: Valor de filtro inválido
- **WHEN** el sistema recibe un valor de contexto, reacción o audiencia que no pertenece a su
  vocabulario cerrado
- **THEN** la API responde un error de validación y el listado no se modifica

#### Scenario: Filtro sobre entradas fuera de la página actual
- **WHEN** el usuario aplica un filtro que solo coincide con entradas más antiguas que las ya
  cargadas en pantalla
- **THEN** esas entradas aparecen igual, sin necesidad de haberlas cargado antes con "cargar más"

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

### Requirement: Ampliar y modificar una escucha

El sistema SHALL permitir al propietario modificar una entrada propia para completar o
cambiar la impresión, el contexto, la reacción o la audiencia. Cada campo SHALL ser
opcional y al menos uno deberá enviarse en cada modificación. El sistema NO SHALL ofrecer,
en el flujo de ampliar una escucha, ningún campo de valoración numérica ni de reseña: esos
actos pertenecen al modo Obra y son independientes de la escucha.

#### Scenario: Ampliar una entrada mínima

- **WHEN** el usuario completa impresión, contexto, reacción y audiencia de una entrada
  creada al instante
- **THEN** la entrada queda actualizada con todos los campos

#### Scenario: El formulario de ampliar no incluye opinión

- **WHEN** el usuario abre el panel para ampliar una escucha
- **THEN** el panel ofrece impresión, contexto, reacción y audiencia, y ningún control de
  estrellas, puntuación o reseña

#### Scenario: Modificar una entrada ajena

- **WHEN** el sistema recibe una modificación sobre una entrada que no pertenece al usuario
- **THEN** la API responde `404` con `LISTEN_ENTRY_NOT_FOUND` y no modifica la entrada

#### Scenario: Modificación vacía

- **WHEN** el usuario envía una modificación sin ningún campo
- **THEN** la API responde un error de validación

### Requirement: Borrado de una escucha
El sistema SHALL permitir al propietario borrar una entrada propia de forma física e irreversible.
El borrado no SHALL afectar al rating ni a otras entradas del mismo objetivo.

#### Scenario: Borrar una entrada propia
- **WHEN** el usuario borra una entrada propia
- **THEN** la entrada se elimina de forma permanente y no aparece más en el diario

#### Scenario: Borrar una entrada ajena
- **WHEN** el sistema recibe un borrado de una entrada que no pertenece al usuario
- **THEN** la API responde `404` con `LISTEN_ENTRY_NOT_FOUND` y no borra la entrada

### Requirement: Acción "Marcar como escuchado"

El sistema SHALL ofrecer en las páginas de artista, álbum y canción una acción autenticada
que cree la escucha al instante y permita ampliarla después. El sistema SHALL ofrecer
además un **punto de entrada global** —fuera de toda página de entidad, disponible solo con
sesión— que primero resuelva el objetivo mediante el buscador del catálogo (artista, álbum
o canción) y luego corra ese mismo flujo de creación inmediata y ampliación. La acción SHALL
rotularse como **"Registrar escucha"** (o "Anotar en el diario" en superficies narrativas),
NUNCA con un lenguaje que sugiera marcar algo como completado. La acción SHALL tener estados
de carga, éxito, error y sesión requerida, y no SHALL bloquear la carga del contenido
musical. La escucha así creada SHALL nacer con audiencia `private` (ver "Audiencia de la
escucha"), sin importar si se inició desde una página de entidad o desde el punto de entrada
global.

#### Scenario: Acción sin sesión

- **WHEN** un visitante no autenticado pulsa la acción de registrar escucha
- **THEN** se le solicita iniciar sesión y no se crea ninguna escucha

#### Scenario: Registro y ampliación posterior

- **WHEN** un usuario autenticado pulsa la acción de registrar escucha
- **THEN** se crea la escucha con audiencia `private` y se ofrece un panel para ampliarla
  con impresión, contexto, reacción y audiencia

#### Scenario: Punto de entrada global — elegir objetivo y registrar

- **WHEN** un usuario autenticado abre el punto de entrada global, busca un artista, álbum o
  canción y elige un resultado
- **THEN** se crea la escucha sobre ese objetivo con audiencia `private` y se ofrece el
  mismo panel de ampliación que la acción de las páginas de entidad

#### Scenario: Punto de entrada global sin sesión

- **WHEN** no hay sesión
- **THEN** el punto de entrada global no se ofrece, y una petición de creación sin sesión
  responde `401` con código `AUTH_REQUIRED` sin crear ninguna escucha

#### Scenario: Cerrar el registro global no deshace la escucha creada

- **WHEN** el usuario ya eligió un objetivo (la escucha quedó creada) y cierra el registro
  global sin completar la ampliación
- **THEN** la entrada persiste tal como nació (append-only), visible en su diario

### Requirement: Representación de las reacciones
El sistema SHALL mostrar las reacciones con texto localizado siempre visible y un icono opcional de
refuerzo, sin depender únicamente del color ni del emoji. El sistema SHALL diferenciar visualmente
la ausencia de reacción de la reacción neutra, y SHALL traducir las etiquetas en español e inglés.

#### Scenario: Etiquetas localizadas
- **WHEN** la interfaz muestra la reacción `liked`
- **THEN** el texto visible es `Me gustó` en español e `Like it` en inglés, con icono de refuerzo

#### Scenario: Ausencia frente a neutra
- **WHEN** la interfaz muestra una entrada sin reacción y otra con reacción `neutral`
- **THEN** la primera no muestra reacción y la segunda muestra la etiqueta localizada `Neutro`/
  `Neutral` con su icono

### Requirement: Encuadre del diario como registro intencional

El sistema SHALL presentar el diario de escucha como un **registro personal e intencional
de experiencias musicales**, no como un historial automático de reproducción ni como una
lista de completitud. En consecuencia:

- El texto de la interfaz NO SHALL usar lenguaje de casilla o de completado ("marcá lo que
  escuchaste", "escuchado" como estado) para la acción de registro.
- El sistema NO SHALL mostrar rachas, medallas, contadores de "escuchas totales" ni metas
  de volumen sobre el diario.
- La **intensidad** de una escucha (registro breve frente a experiencia) SHALL inferirse de
  la combinación de tipo de objetivo, presencia de impresión o reacción y contexto; el
  sistema NO SHALL pedir al usuario que la clasifique.

#### Scenario: La acción de registro no usa lenguaje de completitud

- **WHEN** el usuario ve la acción de registrar una escucha en una página de catálogo
- **THEN** el rótulo y los textos asociados hablan de registrar o anotar, no de marcar algo
  como escuchado o completado

#### Scenario: El diario no muestra métricas de volumen

- **WHEN** el usuario abre su diario
- **THEN** no ve rachas, medallas, un contador de escuchas totales ni una meta de volumen

#### Scenario: No hay selector de intensidad

- **WHEN** el usuario registra o amplía una escucha
- **THEN** no se le pide clasificar la intensidad de la escucha; el sistema la infiere

### Requirement: Vista de cronología del diario propio

El diario propio SHALL ofrecer, además de la vista de lista, una **vista de cronología**
que agrupa las entradas por **mes calendario** de su fecha de registro, con un encabezado
por mes. Dentro de cada mes las entradas SHALL conservar el orden cronológico descendente y
las mismas afordancias de edición y borrado que la vista de lista. La vista de cronología
NO SHALL mostrar conteos por mes, totales ni rachas: es la misma información reordenada, no
un resumen estadístico. El agrupado SHALL operar sobre las entradas ya cargadas, de modo
que también agrupe las que llegan al pedir más.

#### Scenario: Agrupar por mes

- **WHEN** el usuario cambia a la vista de cronología y tiene entradas de varios meses
- **THEN** ve un encabezado por mes y, bajo cada uno, sus entradas en orden cronológico
  descendente

#### Scenario: La cronología no es un resumen

- **WHEN** el usuario ve su diario en modo cronología
- **THEN** no aparece ningún conteo por mes, total ni racha; solo los encabezados de mes y
  las filas

#### Scenario: La cronología agrupa lo que se va cargando

- **WHEN** el usuario, en modo cronología, pide más entradas
- **THEN** las nuevas entradas se ubican bajo el encabezado del mes que les corresponde,
  sin romper la agrupación

