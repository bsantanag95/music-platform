## MODIFIED Requirements

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

## ADDED Requirements

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
