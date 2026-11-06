## MODIFIED Requirements

### Requirement: Botón Compartir en las páginas de destino
Las cabeceras de álbum, artista, canción, género, ceremonia de premio, clase de salón, colección de
Explorar, perfil, reseña, comentario, lista, Camino, colección de un perfil y huella de gusto SHALL mostrar un botón
**Compartir** para cualquier visitante, con o sin sesión. El botón SHALL abrir la hoja de compartir de ese objeto.
Las páginas de gestión `/me/lists/<id>`, `/me/caminos/<id>` y `/me/collection` SHALL mostrarlo solo si un anónimo puede
ver ese contenido. Si no puede, ninguna de estas páginas SHALL mostrar el botón.

#### Scenario: Visitante anónimo
- **WHEN** un visitante sin sesión abre la página de un álbum
- **THEN** ve el botón Compartir y puede abrir la hoja

#### Scenario: Perfil propio
- **WHEN** el dueño abre su perfil
- **THEN** ve el botón Compartir junto a sus controles

#### Scenario: Lista pública en su gestión
- **WHEN** el dueño abre `/me/lists/<id>` de una lista pública
- **THEN** ve el botón Compartir y el enlace de la hoja es el de la vista pública de la lista

#### Scenario: Lista privada en su gestión
- **WHEN** el dueño abre `/me/lists/<id>` de una lista privada
- **THEN** no ve el botón Compartir

## ADDED Requirements

### Requirement: Compartir un comentario desde su fila
Cada comentario raíz de un artista, un álbum o una canción SHALL ofrecer **Compartir** a cualquier visitante, con la
dirección de su página propia. Las respuestas no SHALL ofrecerlo. La fila no SHALL hacer una consulta adicional por
comentario para mostrar el botón.

#### Scenario: Compartir un comentario de una canción
- **WHEN** un visitante abre la hoja desde un comentario raíz de una canción
- **THEN** el enlace de la hoja es la dirección propia de ese comentario

#### Scenario: Respuesta en un hilo
- **WHEN** un visitante abre un hilo de un artista
- **THEN** las respuestas no muestran el botón Compartir
