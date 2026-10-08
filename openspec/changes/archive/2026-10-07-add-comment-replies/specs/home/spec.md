## ADDED Requirements

### Requirement: Comentarios populares solo con comentarios raíz
"Comentarios populares" SHALL seleccionar y mostrar únicamente comentarios raíz. Una respuesta
SHALL NOT aparecer en esa sección aunque tenga más likes que otros comentarios.

#### Scenario: Respuesta muy likeada
- **WHEN** una respuesta acumula más likes que cualquier comentario raíz de su tipo
- **THEN** no aparece en "Comentarios populares"

#### Scenario: Raíz con respuestas
- **WHEN** un comentario raíz con respuestas está entre los más likeados
- **THEN** se muestra como hasta ahora, sin sus respuestas
