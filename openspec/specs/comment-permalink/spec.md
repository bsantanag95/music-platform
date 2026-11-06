# comment-permalink Specification

## Purpose
Dar a cada comentario raíz de un artista, un álbum o una canción una dirección propia (`/comment/<id>`) con su imagen para compartir, porque un ancla no llega al servidor. Cubre la visibilidad de esa página, la redirección de una respuesta a su raíz y el enlace a la conversación con `?thread=`.
## Requirements
### Requirement: Página propia de un comentario
El sistema SHALL ofrecer la página `/<locale>/comment/<id>` para cada comentario raíz visible de un artista, un álbum o
una canción. La página SHALL mostrar el texto completo del comentario, su autor, su fecha y el objeto comentado con
enlace a su página, y SHALL funcionar sin sesión.

#### Scenario: Comentario de un álbum sin sesión
- **WHEN** un visitante sin sesión abre la dirección de un comentario raíz de un álbum
- **THEN** ve el comentario completo, su autor, su fecha y el enlace al álbum

### Requirement: Comentario que no se puede ver
La página SHALL responder `404` si el comentario no existe, está oculto por moderación o es de una cuenta desactivada.
También SHALL responder `404` si el visitante y el autor se bloquearon, en cualquier dirección.

#### Scenario: Comentario oculto por moderación
- **WHEN** un visitante abre la dirección de un comentario oculto
- **THEN** la respuesta es `404` y la página no nombra el comentario

#### Scenario: Autor bloqueado
- **WHEN** un visitante abre la dirección de un comentario de alguien que lo bloqueó
- **THEN** la respuesta es `404`

### Requirement: Una respuesta lleva a su raíz
La dirección de una respuesta SHALL redirigir a la de su comentario raíz. Si la raíz no se puede ver, SHALL responder
`404`.

#### Scenario: Dirección de una respuesta
- **WHEN** un visitante abre la dirección de una respuesta visible
- **THEN** llega a la dirección de su comentario raíz

#### Scenario: Respuesta con raíz oculta
- **WHEN** un visitante abre la dirección de una respuesta cuya raíz está oculta
- **THEN** la respuesta es `404`

### Requirement: Enlace a la conversación
La página SHALL ofrecer **Ver la conversación**, que lleva a la página del objeto con `?thread=<id>`. Al llegar con ese
parámetro, las páginas de artista, álbum y canción SHALL traer ese comentario aunque no esté en la primera página,
ponerlo primero y llevarlo a la vista. Si el comentario ya no se puede ver, la página SHALL quedar como está, sin error.

#### Scenario: Comentario fuera de la primera página
- **WHEN** un visitante sigue "Ver la conversación" de un comentario que no está entre los 20 primeros de un álbum
- **THEN** el comentario aparece primero y queda a la vista

#### Scenario: Comentario borrado después de compartir
- **WHEN** un visitante abre una página de álbum con `?thread=` de un comentario borrado
- **THEN** la página se muestra normal, sin mensaje de error

### Requirement: Metadatos de la página del comentario
La página SHALL anunciar la imagen del comentario, con una descripción que sale de su texto. La respuesta `404` de un
comentario que no se puede ver no SHALL nombrarlo ni mostrar su texto; su imagen, pedida directamente, SHALL ser la
genérica.

#### Scenario: Vista previa de un comentario
- **WHEN** un crawler pide la dirección de un comentario visible
- **THEN** los metadatos anuncian la imagen del comentario y su texto recortado a 160 caracteres

