# comment-likes Specification

## Purpose
Señal de popularidad real y anónima sobre los comentarios del catálogo (likes con umbral de cifra, sin identidades).
## Requirements
### Requirement: Dar y quitar like a un comentario
Una persona autenticada SHALL poder dar like a un comentario visible de otra persona, y quitarlo.
Un usuario SHALL tener como máximo un like por comentario; repetir la operación SHALL ser
idempotente. Los likes SHALL borrarse en cascada con el comentario o con la cuenta.

#### Scenario: Dar like
- **WHEN** una persona autenticada da like a un comentario ajeno
- **THEN** el comentario cuenta un like más y la respuesta indica `liked: true`

#### Scenario: Like repetido
- **WHEN** la misma persona da like otra vez al mismo comentario
- **THEN** el conteo no cambia y la operación responde éxito

#### Scenario: Quitar like
- **WHEN** la persona quita su like
- **THEN** el conteo baja en uno; quitar un like inexistente responde éxito sin cambios

#### Scenario: Sin sesión
- **WHEN** una petición sin sesión intenta dar o quitar un like
- **THEN** se rechaza como no autenticada

#### Scenario: Comentario borrado
- **WHEN** el autor borra su comentario
- **THEN** sus likes desaparecen y dar like a ese id responde `COMMENT_NOT_FOUND`

### Requirement: No se puede likear el propio comentario
El sistema SHALL rechazar un like del autor sobre su propio comentario con `PERMISSION_DENIED`.

#### Scenario: Auto-like
- **WHEN** la autora intenta dar like a su comentario
- **THEN** se rechaza y no se crea ninguna fila

### Requirement: Anonimato de los likes
La identidad de quien dio like SHALL NOT exponerse en ninguna respuesta ni superficie, ni siquiera
al autor del comentario. El visitante SHALL conocer únicamente si él mismo dio like (`likedByMe`).

#### Scenario: Respuesta sin identidades
- **WHEN** se lista un comentario con likes
- **THEN** la respuesta contiene `likeCount` y `likedByMe`, y ningún dato de quienes dieron like

### Requirement: Umbral de la cifra
`likeCount` SHALL ser `null` mientras el conteo real sea menor que 3 y el número real desde 3. La
cifra SHALL ser igual para todos los visitantes, autor incluido. El conteo SHALL excluir los likes
de cuentas desactivadas (reaparecen al reactivar la cuenta).

#### Scenario: Bajo el umbral
- **WHEN** un comentario tiene 2 likes
- **THEN** `likeCount` es `null` y la interfaz no muestra cifra

#### Scenario: En el umbral
- **WHEN** un comentario tiene 3 likes
- **THEN** `likeCount` es 3 y se muestra `♡ 3`

#### Scenario: Cuenta desactivada
- **WHEN** una de las 3 personas que dieron like desactiva su cuenta
- **THEN** el conteo pasa a 2 y la cifra deja de mostrarse

### Requirement: Restricciones sociales
Dar like SHALL requerir cuenta activa y SHALL rechazarse con `SOCIAL_SUSPENSION_ACTIVE` si la cuenta
tiene suspensión social. Dar like a un comentario cuyo autor bloqueó al visitante, o al que el
visitante bloqueó, SHALL rechazarse con `BLOCKED`. Quitar un like SHALL seguir permitido bajo
suspensión y bloqueo. Un comentario oculto por moderación SHALL responder `COMMENT_NOT_FOUND`.

#### Scenario: Suspensión social
- **WHEN** una cuenta con suspensión social activa da like
- **THEN** se rechaza con `SOCIAL_SUSPENSION_ACTIVE`; quitar un like previo funciona

#### Scenario: Bloqueo
- **WHEN** existe un bloqueo en cualquier dirección entre visitante y autor
- **THEN** dar like se rechaza con `BLOCKED`

#### Scenario: Comentario oculto
- **WHEN** el comentario está oculto por moderación
- **THEN** dar like responde `COMMENT_NOT_FOUND`

### Requirement: Botón de like en la lista de comentarios
`Comments` SHALL mostrar un botón de like (`aria-pressed`) en comentarios ajenos para personas
autenticadas, con estado optimista que se revierte con el código de error si la petición falla.
Los visitantes anónimos SHALL ver la cifra (si hay) sin botón. El comentario propio SHALL mostrar la
cifra sin botón.

#### Scenario: Optimista con fallo
- **WHEN** la persona pulsa like y el servidor responde error
- **THEN** el estado vuelve al anterior y se muestra el mensaje del código de error

#### Scenario: Anónimo
- **WHEN** una persona sin sesión ve un comentario con 5 likes
- **THEN** ve `♡ 5` y ningún botón

