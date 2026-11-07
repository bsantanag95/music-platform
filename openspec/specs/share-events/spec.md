# share-events Specification

## Purpose
Medir qué se comparte y por qué canal sin guardar datos personales: tabla `share_event`, endpoint de registro con límite de frecuencia y atribución de las visitas con `?via=<canal>`.
## Requirements
### Requirement: Registro de cada uso de la hoja
Cada vez que se completa una acción de la hoja de compartir (menú nativo confirmado, enlace copiado,
atajo abierto o imagen descargada), el cliente SHALL registrarla con `POST /api/share/events` indicando
el tipo de objeto, su referencia, el canal y el formato. El sistema SHALL guardarla en `share_event` con
la fecha. Un fallo del registro SHALL NOT impedir ni retrasar la acción de compartir.

#### Scenario: Atajo abierto
- **WHEN** un visitante abre el atajo de X en la hoja de un álbum
- **THEN** se guarda un `share_event` con tipo `album`, la referencia del álbum, canal `x` y formato
  `link`

#### Scenario: Menú nativo cancelado
- **WHEN** el usuario cancela el menú nativo
- **THEN** no se guarda ningún `share_event`

#### Scenario: Registro caído
- **WHEN** el endpoint de eventos responde con error
- **THEN** la acción de compartir se completa igual y no se muestra error

### Requirement: Sin datos personales
`share_event` SHALL NOT guardar el usuario que comparte, su IP, su agente de usuario ni ningún dato de
quien visita. El endpoint SHALL aceptar pedidos con y sin sesión.

#### Scenario: Usuario con sesión
- **WHEN** un usuario con sesión comparte un álbum
- **THEN** la fila guardada no contiene su id ni ningún dato que lo identifique

### Requirement: Referencia estable y borrado con la cuenta
La referencia del objeto SHALL ser su identificador interno (el id del álbum, canción, artista, usuario, reseña,
comentario, lista, Camino, valoración, escucha o Lámina; el id de la cuenta para su colección y su huella; el id de la cuenta y el del artista, unidos por un punto, para una discografía; el slug de género, premio o salón; el slug
y el año de una ceremonia o clase; el id de una colección de Explorar), nunca un nombre visible. Al eliminarse una
cuenta, el sistema SHALL borrar los eventos cuyo objeto es su perfil, su colección o su huella, y los de sus reseñas,
comentarios, listas, Caminos, valoraciones, escuchas, Láminas y discografías.

#### Scenario: Perfil de una cuenta eliminada
- **WHEN** se elimina una cuenta cuyo perfil fue compartido
- **THEN** no queda ningún `share_event` con tipo `profile` y la referencia de esa cuenta

#### Scenario: Lista de una cuenta eliminada
- **WHEN** se elimina una cuenta que tenía una lista compartida
- **THEN** no queda ningún `share_event` de esa lista

#### Scenario: Reseña de otra cuenta
- **WHEN** se elimina una cuenta
- **THEN** los eventos de las reseñas de otras cuentas se conservan

#### Scenario: Discografía de una cuenta eliminada
- **WHEN** se elimina una cuenta cuya discografía fue compartida
- **THEN** no queda ningún `share_event` de esa discografía, y los de otras cuentas con el mismo artista se conservan

### Requirement: Validación de los valores
El tipo de objeto, el canal y el formato SHALL validarse contra listas cerradas, tanto en el endpoint
como con `CHECK` en la base. Un valor fuera de lista SHALL rechazarse con `VALIDATION_ERROR`. La
referencia SHALL ser una cadena de 1 a 200 caracteres. Los tipos `review`, `comment`, `list`, `camino`,
`user_collection`, `fingerprint`, `rating`, `listen`, `top` y `discography` y los formatos `post` y `square` SHALL estar entre los valores aceptados.

#### Scenario: Canal desconocido
- **WHEN** se envía un evento con canal `myspace`
- **THEN** la respuesta es `400` con `VALIDATION_ERROR` y no se guarda nada

#### Scenario: Tipo nuevo
- **WHEN** se envía un evento de tipo `comment` con canal `copy`
- **THEN** la respuesta es `204` y el evento se guarda

#### Scenario: Formato Historia
- **WHEN** se envía un evento con formato `story`
- **THEN** la respuesta es `204` y el evento se guarda

### Requirement: Límite de registros
El endpoint SHALL limitar la cantidad de eventos por IP en una ventana de tiempo y responder `429` con
`RATE_LIMITED` al superarla, sin guardar la IP.

#### Scenario: Ráfaga de eventos
- **WHEN** una IP envía más eventos de los permitidos en la ventana
- **THEN** los de más reciben `429` con `RATE_LIMITED`

