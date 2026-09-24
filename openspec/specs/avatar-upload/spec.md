# avatar-upload Specification

## Purpose

Ciclo de vida técnico de la foto de perfil de usuario: subida, reemplazo y borrado mediante
`/api/me/profile/avatar` sobre el servicio de imágenes (`image-storage`, `kind: "avatar"`), con
límites de tamaño y de frecuencia, traducción de los motivos de rechazo a códigos propios del
contrato de errores, limpieza de la imagen reemplazada o quitada, y entrega de la URL ya resuelta
en cada superficie que representa a un usuario. Cambio connect-avatar-upload.

## Requirements

### Requirement: Subida y reemplazo de avatar
El sistema SHALL permitir que un usuario autenticado suba una foto de perfil mediante `PUT
/api/me/profile/avatar`, procesándola con el servicio de imágenes usando `kind: "avatar"`. Si el
usuario ya tenía un avatar, el sistema SHALL asociar el nuevo antes de eliminar el anterior, de
modo que una falla en el borrado del anterior nunca deje al usuario sin avatar visible. La
respuesta SHALL incluir la URL resultante, para que el editor refleje el cambio sin recargar la
página.

#### Scenario: Subida exitosa sin avatar previo
- **WHEN** un usuario sin avatar sube un archivo válido
- **THEN** el sistema lo procesa, lo asocia como su avatar, responde con la URL de la foto, y el
  perfil deja de mostrar el monograma y muestra la foto

#### Scenario: Reemplazo de avatar existente
- **WHEN** un usuario con avatar sube un nuevo archivo válido
- **THEN** el sistema asocia el nuevo avatar y elimina el archivo y el registro del avatar
  anterior

#### Scenario: Falla la subida, el avatar anterior se conserva
- **WHEN** el procesamiento o la subida del nuevo archivo falla
- **THEN** el usuario conserva su avatar anterior sin cambios y la API responde con un error

### Requirement: Eliminación de avatar
El sistema SHALL permitir que un usuario autenticado quite su foto de perfil mediante `DELETE
/api/me/profile/avatar`, desasociándola antes de eliminar el archivo y el registro
correspondiente. Si el usuario no tiene avatar, la operación SHALL ser un no-op exitoso. La
respuesta SHALL indicar que ya no hay foto asociada.

#### Scenario: Quitar avatar existente
- **WHEN** un usuario con avatar invoca `DELETE /api/me/profile/avatar`
- **THEN** el sistema desasocia y elimina la imagen, responde sin URL de foto, y el perfil vuelve
  a mostrar el monograma

#### Scenario: Quitar sin tener avatar
- **WHEN** un usuario sin avatar invoca `DELETE /api/me/profile/avatar`
- **THEN** la API responde con éxito sin efecto alguno

### Requirement: Solo el dueño puede modificar su avatar
El sistema SHALL rechazar cualquier intento de subir o eliminar el avatar de una cuenta que no
sea la del usuario autenticado en la sesión.

#### Scenario: Intento sobre otra cuenta
- **WHEN** una solicitud autenticada intenta modificar el avatar de otro usuario
- **THEN** el sistema la rechaza sin efectuar ningún cambio

### Requirement: Rechazo por tamaño antes de cargar el archivo en memoria
El sistema SHALL rechazar una solicitud de subida que declare o presente un tamaño mayor al
límite configurado antes de materializar el contenido del archivo en memoria, sin esperar a la
validación de tamaño del servicio de imágenes.

#### Scenario: Solicitud desproporcionada rechazada de entrada
- **WHEN** llega una solicitud de subida cuyo tamaño declarado excede ampliamente el límite
- **THEN** el sistema la rechaza sin cargar el contenido completo en memoria ni invocar el
  pipeline de procesamiento

### Requirement: Límite de frecuencia de subida
El sistema SHALL limitar la frecuencia con la que un mismo usuario puede subir avatares, y SHALL
responder con el código de límite de frecuencia del contrato cuando se supera, sin procesar el
archivo.

#### Scenario: Subidas repetidas en ráfaga
- **WHEN** un usuario supera el límite de subidas permitidas en la ventana configurada
- **THEN** la API responde con el código de límite de frecuencia y no procesa ni almacena el
  archivo

#### Scenario: El avatar vigente no se ve afectado
- **WHEN** una subida es rechazada por límite de frecuencia
- **THEN** el avatar actual del usuario permanece sin cambios

### Requirement: Motivos de rechazo traducidos al contrato de errores de la API
El sistema SHALL traducir cada motivo de rechazo del servicio de imágenes a un código propio y
distinto del contrato público de errores, de modo que el cliente pueda mostrar un mensaje
localizado específico del motivo sin leer el texto del error ni conocer los códigos internos del
servicio de imágenes. El sistema SHALL NOT exponer al cliente el código interno de configuración
de storage ausente: esa falla SHALL presentarse como un error interno del servidor.

#### Scenario: Formato no soportado
- **WHEN** el usuario sube un archivo en un formato no soportado (incluido SVG)
- **THEN** la API responde con el código específico de formato no soportado, distinto del de
  cualquier otro motivo de rechazo

#### Scenario: Cada límite tiene su propio código
- **WHEN** el usuario sube un archivo que excede el tamaño máximo, uno que excede las dimensiones
  máximas, o uno que no alcanza las dimensiones mínimas del preset de avatar
- **THEN** la API responde con un código distinto en cada caso, y el cliente muestra un mensaje
  localizado propio de cada motivo

#### Scenario: Storage sin configurar no se expone
- **WHEN** el proveedor de storage no está configurado en producción
- **THEN** la API responde con un error interno genérico, sin revelar el código interno del
  servicio de imágenes

### Requirement: La foto acompaña al usuario en toda superficie que lo represente
El sistema SHALL entregar la URL de la foto de perfil junto con los demás datos de identidad en
cada superficie que represente a un usuario (perfil, búsqueda de personas, listados de
conexiones, vista rápida del perfil y feed de actividad), de modo que ninguna superficie muestre el monograma de un
usuario que sí tiene foto. El sistema SHALL resolver esa URL en el servidor y SHALL NOT exponer
al cliente el identificador de la imagen ni la ruta del proveedor de storage.

#### Scenario: Misma identidad visual en todas las superficies
- **WHEN** un usuario con foto aparece en su perfil, en la búsqueda de personas, en un listado de
  conexiones y en la vista rápida del perfil
- **THEN** las cuatro superficies muestran su foto, no su monograma

#### Scenario: El autor de una entrada del feed muestra su foto
- **WHEN** el feed muestra actividad de un usuario con foto
- **THEN** el chip del autor muestra su foto en lugar de la inicial, y las entradas de usuarios sin foto conservan la inicial

#### Scenario: El cliente no conoce el storage
- **WHEN** el cliente recibe los datos de identidad de un usuario con foto
- **THEN** recibe una URL ya resuelta, sin el identificador de la imagen ni datos del proveedor
