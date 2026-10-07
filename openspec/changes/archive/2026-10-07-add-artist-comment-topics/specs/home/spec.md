## ADDED Requirements

### Requirement: Tema en los comentarios populares de artista
Cada comentario de artista de "Comentarios populares" SHALL mostrar su tema como etiqueta corta. Los
comentarios de álbum y de canción SHALL NOT mostrar tema. El tema SHALL NOT cambiar qué
comentarios se seleccionan ni su orden por likes.

#### Scenario: Comentario popular de artista
- **WHEN** "Comentarios populares" muestra un comentario de un artista del tema "Álbumes"
- **THEN** el comentario muestra la etiqueta "Álbumes"

#### Scenario: Comentario popular de álbum
- **WHEN** "Comentarios populares" muestra un comentario de un álbum
- **THEN** no muestra etiqueta de tema
