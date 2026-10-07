## ADDED Requirements

### Requirement: Responder a un comentario de artista
Una persona autenticada SHALL poder responder a un comentario visible de un artista. La respuesta
SHALL quedar asociada a ese comentario como su raíz. Responder a una respuesta SHALL crear una
nueva respuesta de la misma raíz, no un nivel más. Responder SHALL requerir sesión y que la actividad
social no esté suspendida (`SOCIAL_SUSPENSION_ACTIVE`), igual que comentar.

#### Scenario: Responder a un tema
- **WHEN** una persona autenticada responde a un comentario raíz de un artista
- **THEN** se crea la respuesta con el texto dado, asociada a esa raíz, y la respuesta del servidor
  la incluye con el tema de la raíz

#### Scenario: Responder a una respuesta
- **WHEN** una persona responde a una respuesta existente
- **THEN** la nueva respuesta queda asociada a la raíz de la primera, no a la respuesta

#### Scenario: Sin sesión
- **WHEN** una petición sin sesión intenta responder
- **THEN** se rechaza como no autenticada

#### Scenario: Raíz inexistente u oculta
- **WHEN** se responde a un comentario que no existe o que está oculto por moderación
- **THEN** se rechaza con `COMMENT_NOT_FOUND` y no se crea ninguna fila

#### Scenario: Texto inválido
- **WHEN** el texto de la respuesta está vacío o supera el máximo de un comentario
- **THEN** se rechaza con `INVALID_COMMENT`

### Requirement: Solo los comentarios de artista admiten respuestas
Los comentarios de álbum y de canción SHALL NOT admitir respuestas. Intentar responderles SHALL
rechazarse con `REPLIES_NOT_ALLOWED` y no crear ninguna fila.

#### Scenario: Responder a un comentario de álbum
- **WHEN** se intenta responder a un comentario de un álbum
- **THEN** se rechaza con `REPLIES_NOT_ALLOWED`

### Requirement: La respuesta hereda tema y objetivo de su raíz
Una respuesta SHALL pertenecer al mismo artista que su raíz y SHALL NOT tener tema propio: su tema
es el de la raíz. El objetivo de la respuesta SHALL fijarlo el servidor a partir de la raíz y nunca
el cliente. Una respuesta SHALL NOT poder tener a su vez respuestas.

#### Scenario: Tema heredado
- **WHEN** se lista el hilo de una raíz del tema "Para empezar"
- **THEN** sus respuestas se presentan dentro de ese tema sin tema propio

#### Scenario: La base impide un tema propio
- **WHEN** se intenta insertar directamente una respuesta con `topic` no nulo
- **THEN** la inserción falla por restricción

### Requirement: El listado de comentarios solo trae raíces
El listado de comentarios de un artista SHALL devolver únicamente comentarios raíz, con el filtro
por tema y la paginación vigentes, y SHALL incluir en cada uno `replyCount`: la cantidad de
respuestas visibles. `replyCount` SHALL excluir respuestas ocultas por moderación y respuestas de
cuentas desactivadas.

#### Scenario: Raíces con conteo
- **WHEN** un comentario raíz tiene tres respuestas visibles
- **THEN** el listado lo devuelve con `replyCount` 3 y sin incluir las respuestas

#### Scenario: Respuesta oculta
- **WHEN** una de esas respuestas queda oculta por moderación
- **THEN** `replyCount` pasa a 2

#### Scenario: Una respuesta no aparece como raíz
- **WHEN** existe una respuesta en el artista
- **THEN** no figura entre los elementos del listado de comentarios del artista

### Requirement: Lectura del hilo
Las respuestas de un comentario raíz SHALL obtenerse de forma paginada y ordenadas de la más
antigua a la más reciente. Pedir el hilo de un comentario que no es raíz, que no existe o que está
oculto SHALL responder `COMMENT_NOT_FOUND`. La lectura SHALL ser pública, con sesión opcional para
`likedByMe`.

#### Scenario: Orden de lectura
- **WHEN** se lee el hilo de una raíz con respuestas de distintos momentos
- **THEN** aparecen de la más antigua a la más reciente

#### Scenario: Hilo de una raíz oculta
- **WHEN** se pide el hilo de una raíz oculta por moderación
- **THEN** se responde `COMMENT_NOT_FOUND`

### Requirement: Borrado y moderación de una raíz
Borrar una raíz SHALL borrar físicamente todas sus respuestas y los likes de unas y otras. Borrar
una respuesta SHALL borrar solo esa respuesta. Una raíz oculta por moderación SHALL ocultar su hilo.
Una respuesta SHALL poder moderarse, reportarse, editarse (solo el autor, solo el texto) y borrarse
por separado sin afectar a su raíz.

#### Scenario: Borrar la raíz
- **WHEN** la autora de una raíz con tres respuestas la borra
- **THEN** la raíz y sus tres respuestas dejan de existir

#### Scenario: Borrar una respuesta
- **WHEN** la autora de una respuesta la borra
- **THEN** solo desaparece esa respuesta y `replyCount` de la raíz baja en uno

#### Scenario: Reporte de una respuesta
- **WHEN** una persona reporta una respuesta
- **THEN** el reporte se registra como `targetType: "comment"` sobre esa respuesta

### Requirement: Bloqueos y cuentas desactivadas en las respuestas
Las respuestas SHALL respetar bloqueos y cuentas desactivadas igual que los comentarios raíz.

#### Scenario: Cuenta desactivada
- **WHEN** la autora de una respuesta desactiva su cuenta
- **THEN** su respuesta se muestra como cuenta desactivada y deja de contar en `replyCount`

### Requirement: Interfaz de hilo en la página de artista
En la sección Comentarios de un artista, cada comentario raíz SHALL mostrar la cantidad de
respuestas y SHALL permitir desplegar su hilo y, con sesión, responder desde él. Las respuestas
SHALL mostrarse con sangría mínima, de la más antigua a la más reciente, sin más niveles. Las páginas
de álbum y de canción SHALL NOT mostrar controles de respuesta.

#### Scenario: Desplegar un hilo
- **WHEN** una persona pulsa "Ver 3 respuestas" en un comentario
- **THEN** se cargan y muestran las respuestas bajo ese comentario

#### Scenario: Responder desde el hilo
- **WHEN** una persona con sesión escribe una respuesta y la publica
- **THEN** la respuesta aparece al final del hilo y `replyCount` sube en uno

#### Scenario: Álbum y canción
- **WHEN** una persona abre un álbum o una canción
- **THEN** no ve botón de responder ni conteo de respuestas

### Requirement: Sin notificaciones en esta etapa
El sistema SHALL NOT enviar ni generar notificaciones por recibir respuestas. La estructura de datos
SHALL permitir derivarlas después de la relación entre una respuesta y su raíz.

#### Scenario: Respuesta sin aviso
- **WHEN** una persona responde al comentario de otra
- **THEN** no se crea ninguna notificación ni entrada de actividad para la autora de la raíz
