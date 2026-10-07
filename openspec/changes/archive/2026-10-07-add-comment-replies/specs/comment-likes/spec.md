## ADDED Requirements

### Requirement: Likes en las respuestas
Las respuestas (capability `comment-replies`) SHALL poder recibir likes con las mismas reglas que
cualquier comentario: un like por persona, anonimato, umbral de la cifra, exclusión de cuentas
desactivadas, no likear lo propio y restricciones sociales. El botón de like de `Comments` SHALL
mostrarse también en las respuestas ajenas.

#### Scenario: Like a una respuesta
- **WHEN** una persona autenticada da like a una respuesta ajena
- **THEN** la respuesta cuenta un like más y la respuesta del servidor indica `liked: true`

#### Scenario: Auto-like en una respuesta
- **WHEN** la autora de una respuesta intenta darle like
- **THEN** se rechaza con `PERMISSION_DENIED`

#### Scenario: Borrar la raíz
- **WHEN** se borra la raíz de una respuesta con likes
- **THEN** los likes de la respuesta desaparecen junto con ella
