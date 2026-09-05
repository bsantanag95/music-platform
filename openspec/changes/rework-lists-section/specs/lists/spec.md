## MODIFIED Requirements

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
usuario.

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
- **THEN** la API responde `404` con `LIST_NOT_FOUND` sin revelar su existencia

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
