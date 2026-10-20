## ADDED Requirements

### Requirement: Contenido oculto por moderación fuera del feed

El feed de actividad de usuarios seguidos (`/me/feed` y la pestaña "Siguiendo" de `/activity`) SHALL NOT
incluir comentarios ni reseñas ocultos por moderación, con o sin filtros de tipo, autor o texto. Si el
contenido se restaura, SHALL volver a ser elegible para el feed. El rastro propio del lector ("Tu rastro
reciente" de Inicio y "Tú" de `/activity`) no es un listado público y no cambia.

#### Scenario: Reseña oculta de un seguido

- **WHEN** un moderador oculta una reseña de una persona a la que el lector sigue
- **THEN** esa reseña no aparece en el feed del lector, ni siquiera filtrando por reseñas

#### Scenario: Comentario oculto de un seguido

- **WHEN** un moderador oculta un comentario de una persona a la que el lector sigue
- **THEN** ese comentario no aparece en el feed del lector, y los comentarios visibles de esa persona sí

#### Scenario: Contenido restaurado

- **WHEN** un moderador restaura una reseña oculta
- **THEN** la reseña vuelve a aparecer en el feed de quienes siguen a su autor
