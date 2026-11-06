## MODIFIED Requirements

### Requirement: Referencia estable y borrado con la cuenta
La referencia del objeto SHALL ser su identificador interno (el id del álbum, canción, artista, usuario, reseña,
comentario, lista o Camino; el id de la cuenta para su colección y su huella; el slug de género, premio o salón; el slug
y el año de una ceremonia o clase; el id de una colección de Explorar), nunca un nombre visible. Al eliminarse una
cuenta, el sistema SHALL borrar los eventos cuyo objeto es su perfil, su colección o su huella, y los de sus reseñas,
comentarios, listas y Caminos.

#### Scenario: Perfil de una cuenta eliminada
- **WHEN** se elimina una cuenta cuyo perfil fue compartido
- **THEN** no queda ningún `share_event` con tipo `profile` y la referencia de esa cuenta

#### Scenario: Lista de una cuenta eliminada
- **WHEN** se elimina una cuenta que tenía una lista compartida
- **THEN** no queda ningún `share_event` de esa lista

#### Scenario: Reseña de otra cuenta
- **WHEN** se elimina una cuenta
- **THEN** los eventos de las reseñas de otras cuentas se conservan

### Requirement: Validación de los valores
El tipo de objeto, el canal y el formato SHALL validarse contra listas cerradas, tanto en el endpoint
como con `CHECK` en la base. Un valor fuera de lista SHALL rechazarse con `VALIDATION_ERROR`. La
referencia SHALL ser una cadena de 1 a 200 caracteres. Los tipos `review`, `comment`, `list`, `camino`,
`user_collection` y `fingerprint` SHALL estar entre los valores aceptados.

#### Scenario: Canal desconocido
- **WHEN** se envía un evento con canal `myspace`
- **THEN** la respuesta es `400` con `VALIDATION_ERROR` y no se guarda nada

#### Scenario: Tipo nuevo
- **WHEN** se envía un evento de tipo `comment` con canal `copy`
- **THEN** la respuesta es `204` y el evento se guarda
