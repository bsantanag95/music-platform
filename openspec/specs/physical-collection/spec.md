# physical-collection Specification

## Purpose

Declaración de coleccionismo físico de Fase 5 (cambio `add-physical-collection`): opción por
álbum (`release_group`) para registrar y presumir las copias en soporte físico que posee cada
usuario, mostradas en formato de lista. Cada entrada tiene un formato de un conjunto cerrado,
cero o más atributos de edición de un vocabulario cerrado, una nota libre corta opcional y
audiencia propia. No es un toggle: se permiten varias entradas por álbum. Formato y atributos
son 100% dato del usuario — el catálogo no modela soporte físico. Incluye la acción en la
página de álbum y —desde `rework-collection-section`— la estantería propia `/me/collection`:
superficie única con tres modos de visualización a elegir (estantería / lista detallada /
índice, preferencia local global), toolbar de búsqueda (título o artista) / filtro / orden /
agrupación, conteo por formato en el encabezado, edición de cada copia en línea y cambio de
audiencia en lote. La sección del perfil hereda esa estantería en modo lectura, filtrada por la
matriz de visibilidad.

## Requirements

### Requirement: Agregar una entrada de colección
El sistema SHALL permitir a un usuario autenticado agregar a su colección física una entrada
sobre un álbum (`release_group`) válido. Cada entrada SHALL registrar un formato obligatorio,
cero o más atributos de edición, una nota libre opcional y una audiencia. La operación SHALL
crear siempre una entrada nueva: no es un toggle idempotente.

#### Scenario: Agregar un álbum a la colección
- **WHEN** un usuario autenticado agrega un álbum válido a su colección indicando un formato
- **THEN** el sistema crea una entrada nueva y la refleja en la superficie propia

#### Scenario: Álbum inexistente
- **WHEN** el usuario intenta agregar una entrada cuyo `releaseGroupId` no existe
- **THEN** la API responde `404` con código `ALBUM_NOT_FOUND` y no crea ninguna entrada

#### Scenario: Objetivo que no es un álbum
- **WHEN** la request apunta a un id que no corresponde a un `release_group`
- **THEN** la API responde `400` con código `VALIDATION_ERROR` y no crea ninguna entrada

#### Scenario: Sesión requerida
- **WHEN** una request sin sesión intenta agregar una entrada de colección
- **THEN** la API responde `401` con código `AUTH_REQUIRED` y no modifica ninguna colección

### Requirement: Formato de la entrada
El sistema SHALL exigir en cada entrada un formato dentro de un conjunto cerrado de soportes
físicos: `vinyl`, `cd`, `cassette` y `other`. El sistema SHALL rechazar cualquier otro valor.
Formatos digitales quedan deliberadamente fuera: la colección modela medios físicos.

#### Scenario: Formato válido
- **WHEN** el usuario agrega una entrada con formato `vinyl`
- **THEN** la entrada se crea con ese formato

#### Scenario: Formato fuera del conjunto
- **WHEN** el usuario agrega una entrada con un formato que no pertenece al conjunto cerrado
- **THEN** la API responde `400` con código `VALIDATION_ERROR` y no crea la entrada

#### Scenario: Formato ausente
- **WHEN** el usuario agrega una entrada sin indicar formato
- **THEN** la API responde `400` con código `VALIDATION_ERROR` y no crea la entrada

### Requirement: Atributos de edición
El sistema SHALL permitir asociar a cada entrada cero o más atributos de un **vocabulario
cerrado y curado** que describe cualidades de la edición o de la copia (por ejemplo
`limited-edition`, `numbered`, `first-press`, `reissue`, `remaster`, `anniversary-edition`,
`deluxe-edition`, `colored-vinyl`, `picture-disc`, `180g`, `gatefold`, `box-set`,
`regional-edition`, `bonus-tracks`, `extra-disc`, `signed`, `promo`). Los atributos son
descriptores, no afirmaciones de identidad de catálogo. El sistema SHALL rechazar valores
fuera del vocabulario y SHALL ignorar duplicados dentro de la misma entrada.

#### Scenario: Entrada sin atributos
- **WHEN** el usuario agrega una entrada sin atributos
- **THEN** la entrada se crea con una lista de atributos vacía

#### Scenario: Atributos válidos
- **WHEN** el usuario agrega una entrada con atributos `limited-edition` y `colored-vinyl`
- **THEN** la entrada se crea con esos dos atributos

#### Scenario: Atributo fuera del vocabulario
- **WHEN** el usuario agrega una entrada con un atributo que no pertenece al vocabulario cerrado
- **THEN** la API responde `400` con código `VALIDATION_ERROR` y no crea la entrada

#### Scenario: Atributos duplicados
- **WHEN** el usuario envía el mismo atributo dos veces en una entrada
- **THEN** la entrada se guarda con ese atributo una sola vez

### Requirement: Nota libre de la entrada
El sistema SHALL permitir una nota libre opcional por entrada, de hasta 140 caracteres, para
lo que el vocabulario de atributos no captura (detalles de prensado, arte de portada,
número de catálogo, estado de la copia). El sistema SHALL NOT interpretar, validar contra
catálogo ni sugerir contenido para la nota.

#### Scenario: Nota dentro del límite
- **WHEN** el usuario agrega una entrada con una nota de 140 caracteres o menos
- **THEN** la entrada se crea con esa nota

#### Scenario: Nota que excede el límite
- **WHEN** el usuario agrega una entrada con una nota de más de 140 caracteres
- **THEN** la API responde `400` con código `VALIDATION_ERROR` y no crea la entrada

#### Scenario: Sin nota
- **WHEN** el usuario agrega una entrada sin nota
- **THEN** la entrada se crea sin nota y la superficie no muestra un subtítulo vacío

### Requirement: Múltiples entradas por álbum
El sistema SHALL permitir a un usuario tener varias entradas de colección para el mismo álbum,
con el mismo o distinto formato, para representar copias distinguibles (por ejemplo el vinilo
y el CD, o dos ediciones del mismo CD). El sistema SHALL NOT deduplicar ni bloquear una
entrada nueva por coincidir álbum y formato con otra existente.

#### Scenario: Mismo álbum en dos formatos
- **WHEN** el usuario agrega el mismo álbum en `vinyl` y luego en `cd`
- **THEN** la colección muestra dos entradas independientes para ese álbum

#### Scenario: Mismo álbum y formato, copias distintas
- **WHEN** el usuario agrega dos entradas del mismo álbum en `cd` con notas o atributos distintos
- **THEN** el sistema crea las dos entradas y ambas aparecen en la colección

### Requirement: Editar y quitar una entrada propia
El sistema SHALL permitir al dueño de una entrada editar su formato, atributos, nota y
audiencia, y eliminarla por su identificador, **desde la superficie `/me/collection`** además de
desde la página del álbum. La edición desde la estantería SHALL usar el mismo formulario de
formato/atributos/nota que el alta y SHALL reflejar el cambio de forma optimista, revirtiendo si
la API falla. Quitar una entrada que no existe o que no pertenece al usuario SHALL responder
`404` sin revelar su existencia.

#### Scenario: Editar una entrada propia desde la estantería
- **WHEN** el dueño abre el panel de edición de una entrada en `/me/collection` y cambia su
  formato o sus atributos
- **THEN** la entrada queda actualizada, la superficie refleja el cambio de inmediato y, si la
  API falla, la ficha vuelve a su estado anterior con un aviso de error

#### Scenario: Cambiar la audiencia de una entrada desde la ficha
- **WHEN** el dueño cambia la audiencia de una entrada con el selector rápido de su ficha
- **THEN** la entrada queda con la audiencia elegida sin necesidad de abrir el panel de edición

#### Scenario: Quitar una entrada propia
- **WHEN** el dueño elimina una entrada propia por su identificador
- **THEN** la entrada se elimina y desaparece de la colección

#### Scenario: Quitar una entrada ajena o inexistente
- **WHEN** un usuario intenta eliminar una entrada que no es suya o no existe
- **THEN** la API responde `404` con código `COLLECTION_ENTRY_NOT_FOUND` y no elimina nada

#### Scenario: Sesión requerida para editar
- **WHEN** una request sin sesión intenta editar o eliminar una entrada
- **THEN** la API responde `401` con código `AUTH_REQUIRED`

### Requirement: Audiencia de la entrada
El sistema SHALL permitir configurar la audiencia de cada entrada entre `private`, `followers`
y `public`. Una entrada nueva SHALL usar `followers` por defecto y el dueño SHALL poder
cambiarla después. Una entrada `private` SHALL ser visible solo para su dueño.

#### Scenario: Audiencia por defecto
- **WHEN** un usuario crea una entrada sin especificar audiencia
- **THEN** la entrada queda con audiencia `followers`

#### Scenario: Cambiar la audiencia de una entrada propia
- **WHEN** el dueño cambia la audiencia de una entrada a `public`
- **THEN** la entrada queda pública y visible en las superficies que lo permitan

#### Scenario: Entrada privada
- **WHEN** un visitante consulta una entrada de audiencia `private` que no es suya
- **THEN** esa entrada no aparece en ninguna superficie ajena

### Requirement: Colección propia en formato lista
El sistema SHALL permitir al usuario autenticado ver su colección completa en una superficie
única enriquecida —sin sub-navegación—, con paginación y mostrando por entrada el álbum (con su
carátula cuando exista), su artista, el formato, los atributos y la nota. El sistema SHALL
aceptar, combinables y aplicados en servidor sobre el conjunto completo:

- **búsqueda por texto** (`q`) sobre el título del álbum y el nombre del artista acreditado
  (coincidencia parcial sin distinguir mayúsculas);
- **filtro por formato** y **filtro por atributo** (un valor cada uno);
- **orden** (`sort`): recencia (default), alfabético por título, por artista, o por formato;
- **agrupación** (`group`): sin agrupar (default), por formato, o por artista.

La respuesta SHALL incluir el **conteo por formato** (`counts`), calculado sobre el conjunto
tras aplicar `q` y el filtro de atributo pero **ignorando** el filtro de formato, de modo que el
encabezado muestre siempre la distribución entre formatos. El encabezado SHALL presentar ese
conteo como dato y SHALL NOT incluir barras de progreso, pendientes ni insignias de
completitud.

#### Scenario: Ver la colección propia
- **WHEN** un usuario autenticado abre su página de colección
- **THEN** ve sus entradas paginadas, con la carátula del álbum cuando está disponible, en el
  modo de visualización que tenga elegido

#### Scenario: Buscar por título de álbum
- **WHEN** el usuario busca "rumours" en su colección
- **THEN** ve únicamente las entradas cuyo álbum coincide parcialmente con ese texto

#### Scenario: Buscar por artista acreditado
- **WHEN** el usuario busca "fleetwood" en su colección
- **THEN** ve las entradas cuyo artista acreditado coincide parcialmente con ese texto, aunque
  el título del álbum no coincida

#### Scenario: Filtrar por formato
- **WHEN** el usuario filtra su colección por `vinyl`
- **THEN** ve únicamente las entradas cuyo formato es `vinyl`, y el conteo por formato del
  encabezado sigue mostrando todos los formatos

#### Scenario: Filtrar por atributo
- **WHEN** el usuario filtra su colección por `limited-edition`
- **THEN** ve únicamente las entradas que tienen ese atributo

#### Scenario: Ordenar y agrupar
- **WHEN** el usuario ordena por artista y agrupa por formato
- **THEN** ve sus entradas seccionadas por formato y, dentro de cada sección, ordenadas por
  artista

#### Scenario: Filtros combinados sin resultados
- **WHEN** los filtros activos no dejan ninguna entrada
- **THEN** ve un estado vacío de "sin resultados" localizado, distinto del estado de colección
  vacía, con la opción de limpiar los filtros

#### Scenario: Colección vacía
- **WHEN** un usuario sin entradas abre su página de colección
- **THEN** ve un estado vacío localizado con una vía para ir a agregar discos desde el catálogo,
  y no un error técnico

#### Scenario: Paginación inválida
- **WHEN** se envía una paginación fuera de rango
- **THEN** la API responde `400` con código `VALIDATION_ERROR` y no ejecuta la lectura

### Requirement: Colección ajena en el perfil
El sistema SHALL exponer la lectura paginada de la colección de un usuario por `username`,
filtrando por la matriz de visibilidad existente (bloqueos, perfil privado y relación de
seguimiento) aplicada a la audiencia de cada entrada. La superficie de lectura SHALL
presentarse como la misma estantería que la vista propia —tres tratamientos de ficha y la misma
agrupación—, en **modo lectura**: sin toolbar de búsqueda/orden, sin edición, sin selección en
lote y sin quitar. El visitante SHALL poder cambiar el modo de visualización (su preferencia es
local y global). La respuesta SHALL aceptar `q` y `sort` e incluir `counts`. Si el visitante no
tiene permiso, la respuesta SHALL ser una lista vacía y SHALL NOT revelar si el usuario tiene
colección. Si el `username` no existe, la respuesta SHALL ser `404` con código `USER_NOT_FOUND`.

#### Scenario: Colección visible de un perfil público
- **WHEN** un visitante consulta la colección de un perfil público
- **THEN** recibe únicamente las entradas de audiencia `public`, presentadas como la estantería
  en modo lectura

#### Scenario: Seguidor aprobado de un perfil
- **WHEN** un seguidor aprobado consulta la colección de un perfil
- **THEN** recibe las entradas de audiencia `public` y `followers`

#### Scenario: Perfil privado sin relación aprobada
- **WHEN** un visitante sin relación aprobada consulta la colección de un perfil privado
- **THEN** recibe una lista vacía sin indicar si el usuario tiene colección

#### Scenario: Bloqueo en cualquier dirección
- **WHEN** el visitante bloqueó al dueño o fue bloqueado por él
- **THEN** el visitante no ve ninguna entrada del dueño

#### Scenario: Sin controles de gestión en modo lectura
- **WHEN** un visitante mira la colección de otra persona
- **THEN** no ve la toolbar, ni el modo de selección, ni acciones de editar o quitar sobre
  ninguna entrada

#### Scenario: Usuario inexistente
- **WHEN** se consulta la colección de un `username` que no existe
- **THEN** la API responde `404` con código `USER_NOT_FOUND`

### Requirement: Modos de visualización de la colección
El sistema SHALL presentar la colección —propia y en la vista de perfil— en tres modos de
visualización a elegir por el visitante:

- **Estantería**: cuadrícula de carátulas cuadradas donde predomina lo visual, con el título, el
  artista y el formato al pie de cada ficha.
- **Lista detallada**: fila con carátula, título, artista, formato, atributos, nota, audiencia y
  fecha.
- **Índice**: fila compacta con posición, título, artista y formato, y los controles ocultos
  hasta el hover o el foco.

La preferencia de modo SHALL guardarse **local por visitante** (no en servidor) y SHALL ser
**global** a la colección (no una preferencia por página ni por usuario mirado). El modo por
defecto SHALL ser **Estantería**. Un valor de preferencia inválido o ausente SHALL caer al modo
por defecto sin error. El modo SHALL NOT viajar en la URL ni alterar la consulta de datos.
Cuando una entrada no tiene carátula resuelta, cualquier modo SHALL usar la silueta de disco del
sistema en lugar de un recuadro vacío.

#### Scenario: Elegir un modo de visualización
- **WHEN** el visitante cambia de "Estantería" a "Índice"
- **THEN** la colección se re-renderiza en ese modo y la preferencia queda guardada localmente

#### Scenario: La preferencia persiste entre páginas y recargas
- **WHEN** el visitante que eligió "Lista detallada" recarga o navega a la colección de otra
  persona
- **THEN** la colección se muestra en "Lista detallada" sin volver a pedirle la elección

#### Scenario: Preferencia inicial o corrupta
- **WHEN** el visitante no tiene preferencia guardada, o el valor guardado no es un modo válido
- **THEN** la colección se muestra en "Estantería" sin error

#### Scenario: Entrada sin carátula
- **WHEN** una entrada apunta a un álbum sin carátula resuelta
- **THEN** su ficha muestra la silueta de disco del sistema en cualquiera de los tres modos

### Requirement: Cambio de audiencia en lote de entradas de colección
El sistema SHALL permitir al dueño cambiar la audiencia de varias entradas propias a la vez, de
forma idempotente, mediante una operación de lote que acepta entre 1 y 50 identificadores y una
audiencia destino (`private`, `followers` o `public`). Los identificadores que no existen o que
no pertenecen al usuario SHALL ignorarse sin afectar al resto. Si ninguno de los
identificadores corresponde a una entrada propia, la API SHALL responder `404` con código
`COLLECTION_ENTRY_NOT_FOUND`. La operación SHALL NOT crear, modificar ni eliminar favoritos,
escuchas, ratings, comentarios ni listas.

#### Scenario: Cambiar la audiencia de varias entradas
- **WHEN** el dueño selecciona tres entradas y elige la audiencia `public`
- **THEN** las tres quedan con audiencia `public` en una sola operación

#### Scenario: Idempotencia
- **WHEN** el dueño aplica la misma audiencia que las entradas ya tienen
- **THEN** la operación termina con éxito y no cambia nada

#### Scenario: Identificadores ajenos o inexistentes en el lote
- **WHEN** el lote incluye ids de entradas de otro usuario o que no existen junto a ids propios
- **THEN** solo cambian las entradas propias del lote y las demás se ignoran

#### Scenario: Lote sin ninguna entrada propia
- **WHEN** todos los ids del lote son ajenos o inexistentes
- **THEN** la API responde `404` con código `COLLECTION_ENTRY_NOT_FOUND` y no cambia nada

#### Scenario: Lote fuera de rango
- **WHEN** el lote llega vacío o con más de 50 identificadores
- **THEN** la API responde `400` con código `VALIDATION_ERROR` y no cambia nada

#### Scenario: Sesión requerida
- **WHEN** una request sin sesión intenta el cambio en lote
- **THEN** la API responde `401` con código `AUTH_REQUIRED`

#### Scenario: El cambio en lote no afecta otras señales
- **WHEN** el dueño cambia la audiencia de varias entradas de colección
- **THEN** sus favoritos, escuchas, ratings, comentarios y listas de esos álbumes quedan
  intactos

### Requirement: Acción de colección en la página de álbum
El sistema SHALL ofrecer en la página de álbum una acción autenticada para agregar el álbum a
la colección eligiendo formato y, opcionalmente, atributos y nota. La página SHALL mostrar al
usuario autenticado las entradas propias que ya tiene para ese álbum, con la posibilidad de
quitar cada una. La acción SHALL tener estados de carga, éxito, error y sesión requerida, y
SHALL NOT bloquear la carga del contenido musical.

#### Scenario: Acción sin sesión
- **WHEN** un visitante no autenticado pulsa agregar a la colección en una página de álbum
- **THEN** se le solicita iniciar sesión y no se crea ninguna entrada

#### Scenario: Agregar desde la página de álbum
- **WHEN** un usuario autenticado elige un formato y confirma agregar el álbum a su colección
- **THEN** la entrada se crea y la página muestra la copia agregada con confirmación accesible

#### Scenario: Ver y quitar copias propias del álbum
- **WHEN** un usuario autenticado con entradas para ese álbum abre la página
- **THEN** ve sus copias listadas y puede quitar cualquiera de ellas desde ahí

### Requirement: Independencia de la señal de colección
El sistema SHALL tratar la entrada de colección como una señal independiente: agregarla,
editarla o quitarla SHALL NOT crear, modificar ni eliminar favoritos, escuchas, ratings,
comentarios ni listas del mismo álbum, y SHALL NOT derivar formato ni atributos del catálogo.

#### Scenario: Agregar a la colección no afecta otras señales
- **WHEN** un usuario agrega un álbum a su colección
- **THEN** sus favoritos, escuchas, ratings, comentarios y listas de ese álbum quedan intactos
