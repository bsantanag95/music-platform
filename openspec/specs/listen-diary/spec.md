# listen-diary

## Purpose

Diario de escucha: registro manual e **intencional** de "qué se escuchó y cómo se sintió" sobre
artista, álbum o canción — no un historial automático ni una lista de completitud. Entradas
append-only con reacción emocional (gramática de sensación, sin estrellas), contexto, impresión
breve y audiencia. Un registro rápido nace `private` y sube a `followers` al ganar intención
(impresión o reacción), salvo elección explícita. El diario propio se presenta siempre como una
cronología por mes, contada en la zona horaria del usuario, con filtros combinables (también en la
URL) y un riel de contexto sin métricas de volumen; la audiencia gobierna qué ve cada lector en el
feed y el perfil.
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
entrada, y, para artistas y álbumes, si el objetivo está en Want to Listen del usuario. El listado SHALL presentarse
como una lista vertical de filas (no como tarjetas ancladas
independientes) y NUNCA SHALL agrupar ni colapsar dos o más entradas en una sola fila: cada
escucha SHALL permanecer accesible de forma individual para su ampliación o borrado,
independientemente de cuántas entradas consecutivas compartan contexto, ausencia de reacción o
ausencia de impresión. El sistema SHALL permitir acotar el listado combinando, de forma independiente
y simultánea: texto libre, contexto, reacción (incluida la ausencia explícita de reacción), audiencia,
tipo de objetivo (artista, álbum o canción), año y mes calendario. Un filtro de mes SHALL requerir un año también
especificado — no existe un filtro de "este mes, en cualquier año". El año y el mes calendario SHALL interpretarse en
la zona horaria del usuario cuando la petición la indica, y en UTC cuando no. La búsqueda por texto SHALL coincidir tanto
con el título del
objetivo (artista, álbum o canción) como con el artista acreditado como principal de un álbum o
canción, para que una búsqueda por nombre de artista encuentre también sus álbumes y canciones, no
únicamente las entradas cuyo objetivo es la artista misma. Cada álbum o canción listado SHALL mostrar
el nombre de su artista acreditado como principal junto al título. Cada filtro SHALL aplicarse sobre
la totalidad de las entradas del usuario, no únicamente sobre las ya cargadas en el cliente. Un valor
de contexto, reacción, audiencia o tipo fuera de su vocabulario cerrado, una zona horaria desconocida, o un mes sin año,
SHALL producir un error de validación y no SHALL alterar el listado.

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

#### Scenario: Filtrar por año

- **WHEN** el usuario filtra su diario por un año concreto
- **THEN** el listado muestra únicamente las entradas registradas ese año calendario

#### Scenario: Filtrar por año y mes

- **WHEN** el usuario filtra su diario por un año y, dentro de ese año, un mes calendario concreto
- **THEN** el listado muestra únicamente las entradas registradas ese mes de ese año

#### Scenario: Un mes sin año es inválido

- **WHEN** el sistema recibe un filtro de mes sin un año que lo acompañe
- **THEN** la API responde un error de validación y el listado no se modifica

#### Scenario: Filtrar por tipo de objetivo

- **WHEN** el usuario filtra su diario por el tipo canción
- **THEN** el listado muestra únicamente las escuchas cuyo objetivo es una canción, sin artistas ni álbumes

#### Scenario: El mes se interpreta en la zona horaria del usuario

- **WHEN** un usuario en America/Santiago (UTC−3) anotó una escucha el 30 de septiembre a las 22:00 hora local y filtra
  por septiembre de ese año indicando su zona horaria
- **THEN** la escucha aparece en el resultado, y no aparece al filtrar por octubre

#### Scenario: Zona horaria desconocida

- **WHEN** el sistema recibe una zona horaria que no es un identificador IANA válido
- **THEN** la API responde un error de validación y el listado no se modifica

#### Scenario: Estado de Want to Listen en cada entrada

- **WHEN** el usuario lista su diario y el álbum de una de sus escuchas está en su Want to Listen
- **THEN** esa entrada indica que el objetivo está en Want to Listen; las entradas de canciones nunca lo indican

### Requirement: Ampliar y modificar una escucha

El sistema SHALL permitir al propietario modificar una entrada propia para completar o
cambiar la impresión, el contexto, la reacción o la audiencia. Cada campo SHALL ser
opcional y al menos uno deberá enviarse en cada modificación. El sistema NO SHALL ofrecer,
en el flujo de ampliar una escucha, ningún campo de valoración numérica ni de reseña: esos
actos pertenecen al modo Obra y son independientes de la escucha.

El formulario de ampliar SHALL presentar el contexto, la reacción y la audiencia con el mismo tipo de control (opciones
de selección única siempre visibles, no un desplegable para uno y chips para otros), SHALL mostrar en vivo cuántos
caracteres lleva la impresión sobre el máximo, SHALL rotular «Cancelar» la acción que descarta los cambios y SHALL
permitir guardar con Ctrl/⌘+Enter desde la impresión. Dentro del diario propio, donde la fila ya identifica el objetivo,
el formulario SHALL omitir el rótulo del objetivo; en las demás superficies que lo reutilizan SHALL conservarlo.

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

#### Scenario: Contador de la impresión

- **WHEN** el usuario escribe 120 caracteres en la impresión
- **THEN** el formulario muestra «120/500» junto al campo

#### Scenario: Guardar con el teclado

- **WHEN** el usuario pulsa Ctrl+Enter (o ⌘+Enter) mientras escribe la impresión
- **THEN** el formulario guarda igual que con el botón Guardar

#### Scenario: Sin rótulo redundante en el diario propio

- **WHEN** el usuario abre el formulario de ampliar desde una fila de su diario
- **THEN** el formulario no repite el nombre del objetivo, que ya muestra la fila

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
o canción) y luego corra ese mismo flujo de creación inmediata y ampliación. El punto de
entrada global SHALL ser la acción **Escucha** del diálogo de acciones rápidas del Header
(`header-quick-actions`), que SHALL abrirse siempre con esa acción seleccionada para que
registrar una escucha no sume pasos. La acción SHALL rotularse como **"Registrar escucha"**
(o "Anotar en el diario" en superficies narrativas), NUNCA con un lenguaje que sugiera
marcar algo como completado. La acción SHALL tener estados de carga, éxito, error y sesión
requerida, y no SHALL bloquear la carga del contenido musical. La escucha así creada SHALL
nacer con audiencia `private` (ver "Audiencia de la escucha"), sin importar si se inició
desde una página de entidad o desde el punto de entrada global.

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

#### Scenario: El punto de entrada global abre en Escucha

- **WHEN** un usuario autenticado abre el diálogo de acciones rápidas del Header
- **THEN** la acción "Escucha" está seleccionada y el foco está en el buscador, de modo que
  registrar una escucha cuesta abrir y escribir

#### Scenario: Punto de entrada global sin sesión

- **WHEN** no hay sesión
- **THEN** el punto de entrada global no se ofrece, y una petición de creación sin sesión
  responde `401` con código `AUTH_REQUIRED` sin crear ninguna escucha

#### Scenario: Cerrar el registro global no deshace la escucha creada

- **WHEN** el usuario ya eligió un objetivo (la escucha quedó creada) y cierra el registro
  global sin completar la ampliación
- **THEN** la entrada persiste tal como nació (append-only), visible en su diario

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

El diario propio SHALL presentar siempre sus entradas agrupadas por **mes calendario** de su fecha
de registro, con un encabezado por mes — no SHALL ofrecer una vista de lista plana alternativa ni un
conmutador entre vistas: la agrupación por mes es la única presentación. El mes calendario SHALL calcularse en la zona
horaria del usuario, la misma que usan el filtro de fecha y la lista de meses disponibles. Dentro de cada mes las
entradas SHALL conservar el orden cronológico descendente y las mismas afordancias de edición y menú
de acciones que el resto del diario. La vista de cronología NO SHALL mostrar conteos por mes, totales
ni rachas: es la misma información reordenada, no un resumen estadístico. El agrupado SHALL operar
sobre las entradas ya cargadas, de modo que también agrupe las que llegan al pedir más. Cada
encabezado de mes SHALL ofrecer un control para colapsar u ocultar las filas de ese mes puntual y
volver a expandirlas — todo mes SHALL arrancar expandido por defecto, y el sistema NO SHALL ofrecer
un control que colapse o expanda todos los meses a la vez. Colapsar un mes NUNCA SHALL mostrar cuántas
filas oculta, ni SHALL interpretarse como un conmutador de vista: la agrupación por mes con
encabezado sigue siendo la única presentación del diario. El encabezado del mes que se está recorriendo SHALL quedar
fijo en la parte superior mientras se desplazan sus filas, y su control de colapso SHALL tener un área táctil de al menos
44px en pantallas táctiles.

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

#### Scenario: Todo mes arranca expandido

- **WHEN** el usuario abre su diario
- **THEN** las filas de todos los meses son visibles, sin necesidad de expandir ninguno a mano

#### Scenario: Colapsar un mes puntual

- **WHEN** el usuario acciona el control de colapso del encabezado de un mes
- **THEN** las filas de ese mes dejan de mostrarse, y las de los demás meses no se ven afectadas

#### Scenario: Expandir un mes colapsado

- **WHEN** el usuario acciona el control de un mes que ya está colapsado
- **THEN** las filas de ese mes vuelven a mostrarse, en el mismo orden que antes de colapsarlo

#### Scenario: El encabezado no revela cuántas filas oculta

- **WHEN** el usuario colapsa un mes
- **THEN** el encabezado de ese mes no muestra ningún número de entradas ocultas

#### Scenario: Sin control para colapsar o expandir todos los meses a la vez

- **WHEN** el usuario ve su diario con varios meses cargados
- **THEN** no encuentra ningún control que colapse o expanda todos los meses de una sola acción —
  solo el control individual de cada encabezado

#### Scenario: El mes del encabezado coincide con el del filtro

- **WHEN** una escucha registrada el 30 de septiembre a las 22:00 en la zona del usuario (1 de octubre en UTC) aparece
  en el diario
- **THEN** figura bajo el encabezado de septiembre, igual que al filtrar por septiembre

#### Scenario: Encabezado fijo al desplazarse

- **WHEN** el usuario se desplaza por las filas de un mes
- **THEN** el encabezado de ese mes permanece visible en la parte superior hasta que empieza el siguiente

### Requirement: Acciones rápidas desde la fila del diario

El sistema SHALL permitir, desde el menú de una fila del diario propio, registrar una escucha
adicional sobre el mismo objetivo de esa fila, agregar ese objetivo a una lista propia
compatible, y marcar el objetivo en Want to Listen ("Quiero volver a escuchar") cuando el
objetivo es un artista o un álbum — nunca una canción, mismo alcance que la capability
`want-to-listen` —, todo sin salir de `/me/diary`. La opción de Want to Listen SHALL rotularse según el estado vigente
del objetivo (agregar si no está, quitar si ya está). Las opciones del menú SHALL mostrarse cada una en una sola línea y
la opción de borrar SHALL quedar separada visualmente del resto.

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

#### Scenario: Quiero volver a escuchar desde la fila

- **WHEN** el usuario elige "Quiero volver a escuchar" en el menú de una fila cuyo objetivo es
  un artista o un álbum
- **THEN** el sistema alterna la entrada de Want to Listen del objetivo (la crea si no existía,
  la quita si ya existía) y anuncia el resultado efectivo ("se agregó" o "se quitó") de forma
  accesible, con una confirmación visual momentánea sobre la fila

#### Scenario: Sin acción de Want to Listen para canciones

- **WHEN** el usuario abre el menú de una fila cuyo objetivo es una canción
- **THEN** no encuentra ninguna opción de "Quiero volver a escuchar" en ese menú

#### Scenario: El menú refleja si el objetivo ya está en Want to Listen

- **WHEN** el usuario abre el menú de una fila cuyo álbum ya está en su Want to Listen
- **THEN** la opción dice «Quitar de Pendientes» y, tras elegirla, el mismo menú vuelve a ofrecer «Marcar como
  pendiente»

#### Scenario: Opciones del menú en una sola línea

- **WHEN** el usuario abre el menú de una fila
- **THEN** cada opción ocupa una sola línea y «Eliminar» aparece separada de las demás

### Requirement: Meses disponibles para filtrar el diario

El sistema SHALL exponer, para el usuario autenticado, el conjunto de pares año/mes calendario en
los que tiene al menos una escucha registrada, del más reciente al más antiguo, para poblar los
filtros de año y mes — sin exponer cuántas escuchas tiene cada mes. Los pares SHALL calcularse en la zona horaria que
indique la petición (UTC si no indica ninguna).

#### Scenario: Solo meses con al menos una escucha

- **WHEN** el usuario abre el selector de año o de mes del diario
- **THEN** las opciones ofrecidas corresponden únicamente a años/meses donde tiene escuchas
  registradas, sin ninguna opción vacía

#### Scenario: Sin conteos en la lista de meses disponibles

- **WHEN** el sistema devuelve los meses disponibles para filtrar
- **THEN** la respuesta no incluye cuántas escuchas tiene el usuario en cada mes

#### Scenario: Meses en la zona horaria del usuario

- **WHEN** la única escucha de un usuario se registró el 30 de septiembre a las 22:00 en America/Santiago y pide los
  meses disponibles con esa zona
- **THEN** la respuesta incluye septiembre y no octubre

### Requirement: Destacar una entrada del diario

El sistema SHALL permitir al propietario destacar hasta un máximo de **6** entradas propias
de diario. Una entrada destacada SHALL ser visible para cualquier visitante con acceso al
perfil del dueño, sin importar la audiencia (`private`, `followers` o `public`) que tenga
asignada. Destacar y quitar el destacado SHALL ser operaciones idempotentes. Destacar una
entrada SHALL NOT modificar su audiencia subyacente: al quitar el destacado, la entrada
vuelve a regirse únicamente por su audiencia y por la matriz de visibilidad general (ver
`diary-visibility`).

#### Scenario: Destacar hace visible una entrada más allá de su audiencia

- **WHEN** el propietario destaca una entrada de diario cuya audiencia es `followers`
- **THEN** un visitante sin relación de seguimiento aprobada puede ver esa entrada en la
  sección de destacados del perfil

#### Scenario: Quitar el destacado restaura la regla de audiencia

- **WHEN** el propietario quita el destacado de una entrada cuya audiencia es `followers`
- **THEN** un visitante sin relación de seguimiento aprobada deja de ver esa entrada

#### Scenario: Exceder el máximo de destacadas

- **WHEN** el propietario intenta destacar una séptima entrada
- **THEN** la API responde `400` con código `VALIDATION_ERROR` y el conjunto de destacadas
  no cambia

#### Scenario: Destacar de forma idempotente

- **WHEN** el propietario destaca una entrada que ya estaba destacada
- **THEN** la operación responde sin error y no duplica el estado

#### Scenario: Destacar una entrada ajena

- **WHEN** una request intenta destacar una entrada de diario que no pertenece a quien la
  envía
- **THEN** la API responde `404` con código `LISTEN_ENTRY_NOT_FOUND` y no destaca nada

### Requirement: Fila del diario propio

Cada fila del diario propio SHALL organizarse en cuatro columnas de ancho fijo que nunca se parten en otra línea, en
cualquier ancho de pantalla: fecha, carátula, cuerpo y acciones.

- **Fecha**: el número de día calendario y, debajo, el día de la semana abreviado, ambos en la zona horaria del usuario,
  mostrados solo cuando el día difiere del de la fila anterior dentro del mismo grupo de mes — el mes nunca se repite
  por fila, lo dice el encabezado del grupo. La fecha completa y la relativa SHALL seguir disponibles como valor
  accesible y como texto al pasar el mouse o el foco.
- **Carátula**: para un álbum, su carátula; para una canción, la carátula de un álbum que la contiene; para un artista,
  su foto recortada en círculo. Sin imagen, el disco de vinilo, en círculo para artistas.
- **Cuerpo**: el título del objetivo SHALL ser el elemento visual dominante, con una afordancia de enlace que no dependa
  de `:hover`, y la reacción (si existe) SHALL mostrarse junto a él (ver «Reacciones: etiquetas y presentación»). Debajo,
  una línea secundaria SHALL mostrar el artista acreditado (enlazado a su página cuando el objetivo es un álbum o una
  canción con artista acreditado; texto plano en otro caso), el tipo del objetivo localizado (artista, álbum o canción),
  el contexto de escucha y, al final, la audiencia como ícono con su nombre localizado como nombre accesible y como
  texto al pasar el mouse o el foco (no como texto siempre visible). Una impresión escrita no vacía SHALL mostrarse completa como una cita —tipografía de lectura en
  cursiva, comillas tipográficas y una regla vertical neutra a la izquierda— y NUNCA SHALL usar una superficie con fondo
  o borde propio. Ninguna fila SHALL repetir el nombre del propio usuario.
- **Acciones**: el control de editar, de solo ícono y siempre visible, y el menú «···» con las demás acciones. Cada control SHALL tener un área táctil de al menos 44px en pantallas táctiles. La posición de las
  acciones SHALL ser la misma en todas las filas, tengan o no reacción, impresión o artista.

La acción de editar NUNCA SHALL usar el componente de botón sólido reservado a acciones de una sola vez por pantalla; el
texto de las opciones del menú SHALL compartir el tamaño tipográfico de los datos de la fila. Al elegir borrar, el
mensaje de advertencia SHALL ocupar su propia línea, capaz de ajustar su ancho al contenedor de la fila. Guardar una
edición SHALL cerrar el formulario automáticamente y confirmar el éxito con una señal visual momentánea sobre la fila,
sin un mensaje de texto visible, y el mismo evento SHALL anunciarse a través de tecnología de asistencia.

#### Scenario: Carátula según el tipo de objetivo

- **WHEN** el diario incluye una escucha de un álbum con carátula, una de una canción de ese álbum y una de un artista
  con foto
- **THEN** la primera muestra la carátula, la segunda la carátula del álbum y la tercera la foto del artista en círculo

#### Scenario: Sin imagen disponible

- **WHEN** el objetivo de una escucha no tiene carátula ni foto
- **THEN** la fila muestra el disco de vinilo, en círculo si el objetivo es un artista

#### Scenario: El tipo del objetivo es visible

- **WHEN** el diario incluye una escucha de la canción «Slave to the Grind» y otra del álbum del mismo nombre
- **THEN** la línea secundaria de cada fila dice «Canción» y «Álbum», respectivamente

#### Scenario: La fila no se parte en móvil

- **WHEN** el usuario abre su diario en una pantalla de 375px
- **THEN** editar y el menú de cada fila quedan en la misma posición en todas las filas, alineados con la primera
  línea, y cada control mide al menos 44px de área táctil

#### Scenario: Audiencia como ícono con nombre accesible

- **WHEN** el usuario ve una escucha privada
- **THEN** la línea secundaria termina con el ícono de candado, cuyo nombre accesible es «Privado», sin escribir
  «Privado» como texto visible

#### Scenario: Día y día de la semana

- **WHEN** dos filas consecutivas del mismo mes son de días distintos
- **THEN** cada una muestra su número de día y su día de la semana abreviado; cuando son del mismo día, la segunda los
  deja en blanco

#### Scenario: Fecha relativa con fecha absoluta accesible

- **WHEN** el usuario pasa el mouse o el foco sobre el bloque de fecha de una entrada
- **THEN** obtiene la fecha completa y la relativa ("hace 2 días") como valor accesible y texto al pasar el mouse

#### Scenario: Escucha con impresión se muestra como cita

- **WHEN** el diario propio incluye una escucha con una impresión escrita no vacía
- **THEN** la impresión se muestra completa como una cita en cursiva con comillas tipográficas y una
  regla vertical a la izquierda, sin fondo ni borde de panel

#### Scenario: El artista acreditado de un álbum o canción enlaza a su página

- **WHEN** el usuario ve en su diario una entrada cuyo objetivo es un álbum o una canción con artista acreditado
- **THEN** el nombre del artista, en la línea secundaria, es un enlace a la página de ese artista

#### Scenario: Guardar cierra el formulario y confirma sin texto visible

- **WHEN** el usuario guarda una edición exitosamente
- **THEN** el formulario se cierra sin acción manual adicional, la fila muestra una confirmación visual momentánea sin
  texto y un lector de pantalla anuncia que el cambio se guardó

#### Scenario: La confirmación de borrado no desborda la fila

- **WHEN** el usuario elige borrar desde el menú y aparece el mensaje de confirmación
- **THEN** el mensaje se ajusta al ancho de la fila en su propia línea, sin superponerse con la fecha o las acciones

### Requirement: Reacciones: etiquetas y presentación

El sistema SHALL mostrar las reacciones con texto localizado y un ícono de refuerzo, sin depender únicamente del color
ni del emoji. El sistema SHALL diferenciar visualmente la ausencia de reacción de la reacción neutra, y SHALL traducir
las etiquetas en español e inglés. En la fila del diario propio y en las filas del diario del perfil, la reacción SHALL
mostrarse como ícono con el nombre localizado como nombre accesible y como texto al pasar el mouse o el foco, en vez de
como texto siempre visible: en el diario propio, junto al título y en el color de acento; en el diario del perfil, en su
línea de metadato. Sin reacción, no se dibuja ningún ícono — nunca uno neutro por defecto. Cualquier otro lugar donde se
muestre una reacción —el feed, el panel de ampliación de una entrada— SHALL seguir mostrando el texto localizado siempre
visible junto al ícono.

#### Scenario: Etiquetas localizadas

- **WHEN** la interfaz muestra la reacción `liked`
- **THEN** el texto visible es `Me gustó` en español e `Like it` en inglés, con icono de refuerzo

#### Scenario: Ausencia frente a neutra

- **WHEN** la interfaz muestra una entrada sin reacción y otra con reacción `neutral`
- **THEN** la primera no muestra reacción y la segunda muestra la etiqueta localizada `Neutro`/`Neutral` con su icono

#### Scenario: La reacción acompaña al título en el diario propio

- **WHEN** el diario propio muestra una entrada con reacción `loved`
- **THEN** el ícono aparece junto al título, en el color de acento, con «Me encantó» como nombre accesible y como texto
  al pasar el mouse o el foco

#### Scenario: Sin reacción no hay ícono

- **WHEN** una entrada del diario propio no tiene reacción
- **THEN** junto al título no aparece ningún ícono, y las acciones de la fila no cambian de posición

#### Scenario: El panel de ampliación conserva el texto visible

- **WHEN** el usuario abre el panel para elegir o corregir la reacción de una entrada
- **THEN** cada opción se muestra con su texto localizado siempre visible, no solo con un ícono

#### Scenario: El feed no adopta la excepción

- **WHEN** una reacción se muestra fuera de las filas del diario (por ejemplo, en el feed)
- **THEN** el texto localizado permanece siempre visible junto al ícono

### Requirement: Cabecera, filtros y estado de carga del diario propio

El diario propio SHALL abrir con una cabecera que muestra el título, una línea que lo describe como registro personal y
una acción para anotar una escucha que abre el punto de entrada global de registro. Cuando el usuario no tiene escuchas,
el estado vacío SHALL ofrecer esa misma acción; cuando los filtros no dan resultados, SHALL ofrecer limpiarlos.

Los filtros SHALL presentarse como un buscador y un único control que despliega el resto (reacción, contexto,
audiencia, tipo y fecha) e indica cuántos filtros hay activos; los filtros activos SHALL verse, fuera del panel, como
etiquetas que se quitan individualmente. La fecha SHALL elegirse con un único control que ofrece, agrupados por año, el
año completo y cada mes con escuchas. Los filtros activos SHALL reflejarse en la URL sin agregar entradas al historial
del navegador, y abrir esa URL SHALL mostrar el diario ya filtrado. Mientras llegan los resultados de un filtro nuevo,
la lista anterior SHALL mostrarse atenuada y marcada como ocupada para tecnología de asistencia. Al acercarse al final
de lo cargado, el diario SHALL pedir la página siguiente sin intervención, conservando un control manual equivalente.

#### Scenario: Anotar desde la cabecera

- **WHEN** el usuario pulsa «Anotar escucha» en la cabecera de su diario
- **THEN** se abre el registro global con la acción Escucha seleccionada y, al registrar, la nueva escucha aparece en el
  diario

#### Scenario: Estado vacío con acción

- **WHEN** un usuario sin escuchas abre su diario
- **THEN** ve un estado vacío localizado con la acción «Anotar escucha»

#### Scenario: Sin resultados con acción

- **WHEN** los filtros activos no coinciden con ninguna escucha
- **THEN** el estado sin resultados ofrece «Limpiar filtros», que restaura el diario completo

#### Scenario: Filtros compactos en móvil

- **WHEN** el usuario abre su diario en una pantalla de 375px sin filtros activos
- **THEN** antes de la primera escucha solo hay una línea con el buscador y el control de filtros

#### Scenario: Filtros activos visibles

- **WHEN** el usuario aplica la reacción «Me encantó» y el tipo canción y cierra el panel
- **THEN** ve dos etiquetas, «Me encantó» y «Canciones», y quitar una deja la otra aplicada

#### Scenario: Filtros en la URL

- **WHEN** el usuario aplica filtros y recarga la página
- **THEN** el diario se abre con esos filtros aplicados, y volver atrás en el navegador no recorre cada cambio de filtro

#### Scenario: Carga visible al filtrar

- **WHEN** el usuario cambia un filtro y los resultados todavía no llegaron
- **THEN** la lista anterior se ve atenuada y marcada como ocupada hasta que llegan los nuevos

#### Scenario: Carga continua

- **WHEN** el usuario se acerca al final de las escuchas cargadas y hay más
- **THEN** el diario pide la página siguiente sin que pulse nada, y el control «Cargar más» sigue disponible

### Requirement: Riel de contexto del diario propio

En pantallas de 1024px o más, el diario propio SHALL mostrar junto a la lista un riel con: atajos a cada año y mes con
escuchas, que aplican el filtro de fecha; hasta 4 objetivos de Want to Listen del usuario, cada uno con una acción para
anotar su escucha, más un enlace a Want to Listen; y un enlace a la vista del diario que ven los demás en su perfil. El
riel NO SHALL mostrar conteos, totales, rachas ni metas. Un módulo sin contenido SHALL omitirse. Por debajo de 1024px,
el riel no se muestra.

#### Scenario: Ir a un mes desde el riel

- **WHEN** el usuario elige «Septiembre» bajo 2026 en el riel
- **THEN** el diario queda filtrado por septiembre de 2026, igual que con el control de fecha

#### Scenario: Anotar desde Para anotar

- **WHEN** el usuario pulsa «Anotar» en un álbum de Para anotar
- **THEN** se crea la escucha, aparece al principio del diario con su formulario de ampliar abierto y el álbum deja de
  figurar en Para anotar y en Want to Listen

#### Scenario: Sin pendientes

- **WHEN** el usuario no tiene nada en Want to Listen
- **THEN** el riel no muestra el módulo Para anotar

#### Scenario: El riel no resume volumen

- **WHEN** el usuario ve el riel
- **THEN** ningún módulo muestra cuántas escuchas hay por año, por mes ni en total

#### Scenario: Sin riel en móvil

- **WHEN** el usuario abre su diario en una pantalla de menos de 1024px
- **THEN** la página no muestra el riel

