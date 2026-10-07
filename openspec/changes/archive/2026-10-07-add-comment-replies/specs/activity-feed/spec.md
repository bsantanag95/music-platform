## ADDED Requirements

### Requirement: Las respuestas no generan actividad propia
Una respuesta a un comentario (capability `comment-replies`) SHALL NOT generar entrada en el feed
personal ni en la actividad de la comunidad. Esas superficies SHALL mostrar únicamente comentarios
raíz.

#### Scenario: Respuesta de una persona seguida
- **WHEN** una persona seguida publica una respuesta en un artista
- **THEN** no aparece ninguna entrada nueva en el feed por esa respuesta

#### Scenario: Comentario raíz de una persona seguida
- **WHEN** esa misma persona publica un comentario raíz en un artista
- **THEN** su entrada de feed aparece como hasta ahora
