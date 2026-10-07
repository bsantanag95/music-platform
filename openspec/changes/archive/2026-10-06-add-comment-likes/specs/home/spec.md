## ADDED Requirements

### Requirement: Comentarios populares por likes reales
"Comentarios populares" de Inicio SHALL agruparse por tipo de entidad (artistas, álbumes, canciones) y
ordenarse por el conteo real de likes (descendente), con desempate por longitud del texto y luego por
fecha. SHALL excluir comentarios ocultos por moderación, autores con perfil no público o cuenta
desactivada y, para un visitante autenticado, autores con bloqueo en cualquier dirección. La fila SHALL
mostrar la pill `♡ N` a la derecha del título solo si el conteo es de al menos 3; bajo el umbral no se
muestra cifra, pero el comentario puede aparecer por el desempate.

#### Scenario: Orden por likes
- **WHEN** hay dos comentarios de álbum, uno con 5 likes y otro más largo con 3
- **THEN** el de 5 likes aparece primero y ambos muestran su `♡ N`

#### Scenario: Bajo el umbral
- **WHEN** un comentario tiene 2 likes
- **THEN** su fila no muestra pill de likes

#### Scenario: Bloqueo
- **WHEN** el visitante bloqueó al autor de un comentario muy likeado
- **THEN** ese comentario no aparece para el visitante
