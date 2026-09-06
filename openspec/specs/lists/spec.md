# lists Specification

## Purpose

Colecciones curadas de Fase 5: listas personales de un solo tipo de entidad (artista, álbum o
canción), propiedad de un único usuario, con título, descripción opcional, orden manual,
visibilidad por audiencia y edición/borrado por el propietario. Incluye la superficie propia
`/me/lists` —una sección con sub-navegación (Mis listas · Guardadas · Descubrir), tarjetas con
mosaico de portadas y conteo, búsqueda/filtro/orden y listas fijadas—, la vista pública en
perfiles y la acción contextual "añadir a lista". El **detalle de una lista** —propio en
`/me/lists/[listId]` (gestión interna: reordenar en tres modos de visualización, mover a
extremos, quitar, editar metadatos) y ajeno en `/users/[username]/lists/[listId]` (lectura sin
gestión, con atribución y Guardar/Seguir)— presenta los ítems en uno de tres modos
conmutables (Detallada · Índice · Gráfico) con preferencia global por visitante.

## Requirements

### Requirement: Crear una lista
El sistema SHALL permitir a un usuario autenticado crear una lista con título obligatorio,
descripción opcional, un `entityType` fijo entre `artist`, `release_group` y `recording`, y
audiencia con valor `followers` por defecto. Una lista nueva SHALL estar vacía.

#### Scenario: Crear una lista válida
- **WHEN** un usuario autenticado crea una lista con título, tipo de entidad y audiencia
- **THEN** el sistema crea la lista vacía con esos valores y la muestra en la superficie propia

#### Scenario: Título requerido
- **WHEN** el usuario intenta crear una lista sin título
- **THEN** la API responde un error de validación y no crea ninguna lista

#### Scenario: Tipo de entidad inválido
- **WHEN** el usuario envía un `entityType` fuera de los tres permitidos
- **THEN** la API responde un error de validación y no crea ninguna lista

#### Scenario: Sesión requerida
- **WHEN** una request sin sesión intenta crear una lista
- **THEN** la API responde `401` con código `AUTH_REQUIRED` y no crea ninguna lista

### Requirement: Listas de un solo tipo de entidad
El sistema SHALL garantizar que todos los ítems de una lista correspondan al `entityType`
declarado en la lista. La API SHALL rechazar ítems cuyo tipo no coincida con el de la lista, y
la base de datos SHALL rechazarlos igualmente como red de seguridad.

#### Scenario: Agregar un ítem del tipo correcto
- **WHEN** un usuario agrega a una lista de álbumes un álbum existente
- **THEN** el álbum se agrega a la lista en la posición final

#### Scenario: Agregar un ítem de tipo distinto
- **WHEN** un usuario intenta agregar una canción a una lista de álbumes
- **THEN** la API responde un error de validación y no agrega el ítem

### Requirement: Agregar y quitar ítems
El sistema SHALL permitir al propietario agregar ítems al final de la lista y quitarlos. Un
mismo objetivo SHALL aparecer a lo sumo una vez por lista; agregarlo de nuevo SHALL NOT
duplicarlo. Quitar un ítem SHALL conservar el orden de los restantes.

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

### Requirement: Orden manual de la lista
El sistema SHALL permitir al propietario reordenar los ítems de una lista de forma manual,
persistiendo el nuevo orden en una única operación de reordenamiento. Las afordancias de
reordenamiento SHALL estar disponibles en cada modo de presentación del detalle: en los modos
Detallada e Índice mediante controles de mover una posición arriba o abajo, y en el modo
Gráfico mediante la selección de un ítem y una barra de acciones sobre la selección. El
sistema SHALL ofrecer además mover un ítem **al principio** o **al final** de la lista.
Cualquiera de estas afordancias SHALL producir el mismo efecto: una única operación de
reordenamiento con el orden completo resultante.

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

### Requirement: Edición de la lista
El sistema SHALL permitir al propietario modificar el título, la descripción y la audiencia de
una lista propia. El `entityType` SHALL NOT ser modificable después de la creación. La
modificación de una lista ajena SHALL responder `404` con `LIST_NOT_FOUND`.

#### Scenario: Editar título, descripción y audiencia
- **WHEN** el propietario edita el título, la descripción o la audiencia de una lista propia
- **THEN** la lista queda actualizada y `updated_at` se actualiza por el trigger de la base de
  datos

#### Scenario: Modificación vacía
- **WHEN** el propietario envía una modificación sin ningún campo
- **THEN** la API responde un error de validación

#### Scenario: Editar una lista ajena
- **WHEN** un usuario intenta editar una lista que no le pertenece
- **THEN** la API responde `404` con `LIST_NOT_FOUND` y no modifica la lista

### Requirement: Borrado de la lista
El sistema SHALL permitir al propietario borrar una lista propia de forma física e
irreversible, eliminando también sus ítems. El borrado de una lista ajena SHALL responder
`404` con `LIST_NOT_FOUND`.

#### Scenario: Borrar una lista propia
- **WHEN** el propietario borra una lista propia tras confirmar la acción destructiva
- **THEN** la lista y sus ítems se eliminan de forma permanente

#### Scenario: Borrar una lista ajena
- **WHEN** un usuario intenta borrar una lista que no le pertenece
- **THEN** la API responde `404` con `LIST_NOT_FOUND` y no borra la lista

### Requirement: Lista de listas propias
El sistema SHALL permitir al usuario autenticado listar sus propias listas con paginación,
incluyendo por cada lista su título, descripción, tipo de entidad, audiencia, **cantidad de
ítems (`itemCount`) y las primeras carátulas disponibles de sus ítems (`coverThumbs`, hasta
un máximo fijo)** para la representación visual de la tarjeta. La respuesta SHALL aceptar
parámetros opcionales de **búsqueda por texto sobre el título de la lista (`q`), filtro por
tipo de entidad (`entityType`) y orden (`sort`, entre recencia y alfabético)**, combinables y
aplicados en el servidor sobre el conjunto completo de listas propias, no solo sobre la página
cargada. Las **listas fijadas** por el propietario SHALL aparecer primero, y dentro de cada
grupo (fijadas y no fijadas) el orden SHALL respetar el `sort` solicitado. Sin ningún
parámetro, el comportamiento SHALL ser equivalente al listado paginado por recencia previo,
ampliado con `itemCount` y `coverThumbs`.

#### Scenario: Listar listas propias
- **WHEN** un usuario autenticado abre su página de listas
- **THEN** ve sus listas paginadas, con las fijadas primero y el resto ordenado por la más
  reciente, cada una con su conteo de ítems y sus carátulas disponibles

#### Scenario: Sin listas
- **WHEN** un usuario sin listas abre su página de listas
- **THEN** ve un estado vacío localizado y no un error técnico

#### Scenario: Buscar entre las listas propias
- **WHEN** el usuario filtra sus listas con `q` coincidiendo parcialmente con el título de
  alguna
- **THEN** solo aparecen sus listas cuyo título coincide, sin distinguir mayúsculas ni acentos
  exactos, con paginación válida

#### Scenario: Filtrar y ordenar las listas propias
- **WHEN** el usuario filtra por `entityType=release-group` y pide `sort=alpha`
- **THEN** solo aparecen sus listas de álbumes, ordenadas alfabéticamente, con las fijadas
  primero

#### Scenario: Conteo y carátulas de una lista sin ítems
- **WHEN** una lista propia no tiene ítems
- **THEN** su `itemCount` es `0` y su `coverThumbs` es una colección vacía, sin error

#### Scenario: Parámetros inválidos
- **WHEN** el usuario envía un `entityType` o un `sort` fuera de los valores permitidos, o una
  paginación fuera de rango
- **THEN** la API responde `400` con código `VALIDATION_ERROR` y no ejecuta la lectura

### Requirement: Listas ajenas visibles
El sistema SHALL exponer la lectura de las listas de un usuario por `username`, filtrando por
la matriz de visibilidad existente (bloqueos, perfil privado y relación de seguimiento). Si el
visitante no tiene permiso, la respuesta SHALL ser una lista vacía y SHALL NOT revelar si el
usuario tiene listas. Una lista no visible para el visitante SHALL comportarse como
inexistente (`404`). Si el `username` no existe, la respuesta SHALL ser `404` con código
`USER_NOT_FOUND`. Cada lista visible SHALL exponerse con su título, descripción, tipo de
entidad, dueño, **cantidad de ítems (`itemCount`) y las primeras carátulas disponibles de sus
ítems (`coverThumbs`)**, de forma que la tarjeta de una lista ajena se represente igual que la
de una lista propia. La superficie de lectura SHALL ofrecer sobre cada lista visible la acción
de guardarla o seguirla (ver capacidad `list-saves`), salvo sobre las listas del propio
usuario. El **detalle de una lista visible ajena** SHALL ser una página renderizada en
`/<locale>/users/[username]/lists/[listId]` que muestra los ítems con los mismos modos de
visualización que el detalle propio pero **sin controles de gestión**, junto con la atribución
al dueño (con enlace a su perfil), el tiempo relativo y la acción Guardar/Seguir. El detalle
de una lista no visible SHALL responder como inexistente sin revelar su existencia.

#### Scenario: Listas visibles de un perfil público
- **WHEN** un visitante consulta las listas de un perfil público
- **THEN** recibe únicamente las listas de audiencia `public`, cada una con su conteo de ítems
  y sus carátulas disponibles

#### Scenario: Seguidor aprobado de un perfil
- **WHEN** un seguidor aprobado consulta las listas de un perfil
- **THEN** recibe las listas de audiencia `public` y `followers`

#### Scenario: Perfil privado sin relación aprobada
- **WHEN** un visitante sin relación aprobada consulta las listas de un perfil privado
- **THEN** recibe una lista vacía sin indicar si el usuario tiene listas

#### Scenario: Detalle de una lista no visible
- **WHEN** un visitante pide el detalle de una lista que no es visible para él
- **THEN** la API responde `404` con `LIST_NOT_FOUND` sin revelar su existencia, y la página
  muestra el estado de no encontrado

#### Scenario: Detalle de una lista visible ajena
- **WHEN** un visitante abre el detalle de una lista ajena que le es visible
- **THEN** ve los ítems en el modo de visualización que tenga elegido, la atribución al dueño,
  el tiempo relativo y la acción Guardar/Seguir, sin ningún control de edición ni
  reordenamiento

#### Scenario: Bloqueo en cualquier dirección
- **WHEN** el visitante bloqueó al dueño o fue bloqueado por él
- **THEN** el visitante no ve ninguna lista del dueño

#### Scenario: Usuario inexistente
- **WHEN** se consultan las listas de un `username` que no existe
- **THEN** la API responde `404` con código `USER_NOT_FOUND`

#### Scenario: Paginación inválida
- **WHEN** se envía una paginación fuera de rango
- **THEN** la API responde `400` con código `VALIDATION_ERROR` y no ejecuta la lectura

### Requirement: Sección de listas con sub-navegación
El sistema SHALL presentar `/<locale>/me/lists` como una sección con navegación interna de
tres pestañas —**Mis listas**, **Guardadas** y **Descubrir**— accesibles por teclado con
semántica de `tablist`/`tab`/`tabpanel`. La pestaña activa SHALL reflejarse en la URL mediante
un parámetro (`?tab=`) para poder enlazarse y para sobrevivir a una recarga; un valor de
pestaña ausente o inválido SHALL resolver a "Mis listas". El encabezado de la sección y la
acción "Nueva lista" SHALL permanecer visibles en las tres pestañas. Sin sesión, la ruta SHALL
comportarse como el resto de `/me/*` (redirección a inicio de sesión).

#### Scenario: Abrir la sección sin parámetro de pestaña
- **WHEN** un usuario autenticado abre `/me/lists` sin `?tab=`
- **THEN** ve la pestaña "Mis listas" activa y las otras dos disponibles

#### Scenario: Enlace directo a una pestaña
- **WHEN** el usuario abre `/me/lists?tab=guardadas`
- **THEN** ve la pestaña "Guardadas" activa, y al recargar sigue en esa pestaña

#### Scenario: Valor de pestaña inválido
- **WHEN** el usuario abre `/me/lists?tab=cualquier-cosa`
- **THEN** ve la pestaña "Mis listas" activa, sin error

#### Scenario: Navegación entre pestañas por teclado
- **WHEN** el usuario tiene el foco en la lista de pestañas y usa las flechas
- **THEN** el foco se mueve entre pestañas y activa la enfocada, según el patrón `tablist`

### Requirement: Fijar listas propias
El sistema SHALL permitir al propietario **fijar** y **desfijar** cada una de sus listas. Una
lista fijada SHALL ordenarse antes que las no fijadas en la superficie propia. Fijar es una
operación idempotente por lista y usuario: fijar una lista ya fijada, o desfijar una que no lo
está, SHALL NOT producir error. Fijar SHALL NOT alterar el orden manual de los ítems de la
lista ni su audiencia. Solo el propietario SHALL poder fijar sus listas; intentar fijar una
lista ajena SHALL responder `404` con `LIST_NOT_FOUND`.

#### Scenario: Fijar una lista propia
- **WHEN** el propietario fija una de sus listas
- **THEN** esa lista pasa a mostrarse antes que las no fijadas en su superficie propia

#### Scenario: Desfijar una lista propia
- **WHEN** el propietario desfija una lista que tenía fijada
- **THEN** la lista vuelve a ordenarse junto al resto según el orden vigente

#### Scenario: Fijar de forma idempotente
- **WHEN** el propietario fija una lista que ya estaba fijada
- **THEN** la operación responde sin error y no crea un estado duplicado

#### Scenario: Fijar una lista ajena
- **WHEN** un usuario intenta fijar una lista que no le pertenece
- **THEN** la API responde `404` con `LIST_NOT_FOUND` y no modifica nada

### Requirement: Mosaico de portadas de una lista
El sistema SHALL representar cada lista, en su tarjeta, con un mosaico compuesto por las
carátulas disponibles de sus primeros ítems (`coverThumbs`). Cuando un ítem no tiene carátula
—o la lista es de artistas o de canciones, que no exponen carátula— el mosaico SHALL usar la
silueta de disco del sistema (`DiscPlaceholder`) en lugar de un rectángulo vacío. Una lista
sin ítems SHALL mostrar un mosaico compuesto enteramente por la silueta de disco. El mosaico
SHALL ser decorativo a efectos de accesibilidad: el nombre y los metadatos de la lista SHALL
seguir siendo el contenido textual que la identifica.

#### Scenario: Lista de álbumes con carátulas
- **WHEN** una lista de álbumes tiene ítems con carátula disponible
- **THEN** su tarjeta muestra un mosaico con esas carátulas

#### Scenario: Lista de artistas o canciones
- **WHEN** una lista es de artistas o de canciones
- **THEN** su tarjeta muestra un mosaico de siluetas de disco, no rectángulos vacíos

#### Scenario: Lista con carátulas parciales
- **WHEN** una lista de álbumes tiene algunos ítems sin carátula
- **THEN** el mosaico combina las carátulas disponibles con siluetas de disco para el resto

#### Scenario: Lista vacía
- **WHEN** una lista no tiene ítems
- **THEN** su tarjeta muestra un mosaico de siluetas de disco y el conteo `0`

### Requirement: Modos de visualización del detalle de lista
El sistema SHALL presentar los ítems del detalle de una lista —propia o ajena visible— en uno
de tres modos de visualización conmutables, aplicables por igual a listas de artistas, álbumes
o canciones:

- **Detallada**: una fila por ítem con número de posición, carátula (o silueta de disco),
  título y, cuando corresponda, nombre del artista; los controles de gestión del propietario
  se muestran junto a cada fila.
- **Índice**: una fila de texto compacta por ítem, con número de posición y título, pensada
  para escanear y reordenar listas largas; los controles de gestión se revelan al enfocar o
  posar el puntero sobre la fila y SHALL ser accesibles por teclado.
- **Gráfico**: una cuadrícula de carátulas (o siluetas de disco) donde predomina lo visual; el
  título de cada ítem SHALL seguir siendo accesible como texto, no sólo como información
  auxiliar.

El conmutador de modo SHALL tener semántica de grupo de opciones excluyentes y ser navegable
por teclado. El modo elegido SHALL recordarse **por visitante y de forma global** (no por
lista) en el almacenamiento local del navegador; en ausencia de preferencia guardada el modo
por defecto SHALL ser **Detallada**. La preferencia guardada SHALL NOT viajar al servidor ni
afectar a otros visitantes. El servidor SHALL renderizar el modo por defecto y la
reconciliación con la preferencia guardada SHALL ocurrir en el cliente sin pérdida de
contenido. Con `prefers-reduced-motion` el cambio de modo SHALL NOT animarse.

#### Scenario: Elegir un modo de visualización
- **WHEN** el visitante cambia el modo de visualización en el detalle de una lista
- **THEN** los ítems se re-presentan en ese modo y la elección se recuerda para las próximas
  listas que abra

#### Scenario: Preferencia global entre listas
- **WHEN** el visitante eligió el modo Gráfico en una lista y abre otra lista distinta
- **THEN** la segunda lista también se muestra en modo Gráfico

#### Scenario: Sin preferencia guardada
- **WHEN** un visitante sin preferencia guardada abre el detalle de una lista
- **THEN** ve el modo Detallada

#### Scenario: Almacenamiento local no disponible
- **WHEN** el navegador no permite leer ni escribir la preferencia
- **THEN** el detalle se muestra en el modo por defecto sin error

#### Scenario: Título accesible en el modo Gráfico
- **WHEN** el visitante recorre la cuadrícula del modo Gráfico con lector de pantalla o
  teclado
- **THEN** cada ítem expone su título como texto, no sólo como atributo visual

### Requirement: Carátula representativa para ítems de canción
El sistema SHALL enriquecer cada ítem de tipo `recording` con la carátula de un álbum
representativo que contenga esa grabación, de modo que el modo Gráfico y el mosaico de la
tarjeta de una lista de canciones no queden compuestos siempre por siluetas de disco. Cuando
no exista ningún álbum con carátula para la grabación, el ítem SHALL seguir usando la silueta
de disco del sistema. Esta carátula es una ayuda visual: el título de la canción SHALL seguir
siendo el contenido que la identifica.

#### Scenario: Canción con álbum con carátula
- **WHEN** una lista de canciones tiene un ítem cuya grabación aparece en un álbum con
  carátula disponible
- **THEN** el ítem muestra esa carátula en el detalle y aporta al mosaico de la tarjeta

#### Scenario: Canción sin ninguna carátula disponible
- **WHEN** la grabación de un ítem no tiene ningún álbum con carátula
- **THEN** el ítem usa la silueta de disco, sin rectángulo vacío ni error

### Requirement: Acción "añadir a lista" en las páginas de catálogo
El sistema SHALL ofrecer en las páginas de artista, álbum y canción una acción autenticada
para añadir el objetivo a una de las listas propias compatibles, con estados de carga, éxito,
error y sesión requerida, y que SHALL NOT bloquear la carga del contenido musical.

#### Scenario: Acción sin sesión
- **WHEN** un visitante no autenticado pulsa añadir a lista en una página de catálogo
- **THEN** se le solicita iniciar sesión y no se modifica ninguna lista

#### Scenario: Añadir a una lista compatible
- **WHEN** un usuario autenticado añade el objetivo actual a una lista propia del tipo
  correspondiente
- **THEN** el objetivo queda en la lista y la UI lo confirma de forma accesible

#### Scenario: Sin listas compatibles
- **WHEN** el usuario no tiene listas compatibles con el tipo del objetivo
- **THEN** la UI ofrece la opción de crear una lista nueva y no bloquea la navegación