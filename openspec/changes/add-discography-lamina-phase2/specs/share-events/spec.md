## MODIFIED Requirements

### Requirement: Referencia estable y borrado con la cuenta
La referencia del objeto SHALL ser su identificador interno (el id del álbum, canción, artista, usuario, reseña,
comentario, lista, Camino, valoración, escucha o Lámina; el id de la cuenta para su colección y su huella; el id de la cuenta y el del artista, unidos por un punto, para una discografía, y además el del disco para su Lámina de álbum; el slug de género, premio o salón; el slug
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

#### Scenario: Lámina de álbum de una cuenta eliminada
- **WHEN** se elimina una cuenta cuya Lámina de álbum fue compartida
- **THEN** no queda ningún `share_event` de esa Lámina
