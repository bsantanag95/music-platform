## ADDED Requirements

### Requirement: Tema en las entradas de comentario de artista
Una entrada de feed o de actividad de la comunidad cuyo objetivo es un artista SHALL incluir el
tema del comentario y mostrarlo como etiqueta corta. Las entradas de comentarios de álbum y de
canción SHALL NOT incluir tema. El tema SHALL NOT alterar la selección, el orden ni la
agrupación de las entradas.

#### Scenario: Comentario de artista en el feed
- **WHEN** una persona seguida publica un comentario de artista con tema "Para empezar"
- **THEN** su entrada del feed muestra la etiqueta "Para empezar" junto al artista

#### Scenario: Comentario de álbum en el feed
- **WHEN** una persona seguida publica un comentario en un álbum
- **THEN** su entrada del feed no muestra etiqueta de tema
