## MODIFIED Requirements

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

## ADDED Requirements

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
