# ratings-and-comments

Valoraciones duales y comentarios sobre artistas, álbumes conceptuales y grabaciones.

## ADDED Requirements

### Requirement: Rating dual por objetivo
La aplicación SHALL permitir a un usuario autenticado crear y editar una única valoración vigente sobre exactamente un artista, álbum o grabación, con estrellas de 0.5 a 5 en pasos de 0.5 y valoración detallada opcional de 1 a 100 coherente con las estrellas.

#### Scenario: Crear rating válido
- **WHEN** un usuario autenticado envía estrellas y, opcionalmente, una valoración detallada para un objetivo válido
- **THEN** el sistema crea o reemplaza su rating vigente y devuelve las dos escalas guardadas

#### Scenario: Rating incoherente
- **WHEN** la valoración detallada queda fuera de la banda de 10 puntos correspondiente a las estrellas
- **THEN** el sistema rechaza la mutación y la base no almacena el rating

#### Scenario: Rating duplicado
- **WHEN** un usuario vuelve a valorar el mismo objetivo
- **THEN** el sistema actualiza la fila vigente en vez de crear una segunda valoración

### Requirement: Borrado físico de rating
El sistema SHALL permitir al propietario borrar su rating mediante `DELETE` físico, sin columna `deleted_at`, historial ni recuperación.

#### Scenario: Borrar rating propio
- **WHEN** un usuario autenticado confirma el borrado de su rating
- **THEN** la fila se elimina, el objetivo queda sin rating de ese usuario y puede valorarse nuevamente

#### Scenario: Borrar rating ajeno
- **WHEN** un usuario intenta borrar el rating de otro usuario
- **THEN** el sistema rechaza la operación sin eliminar la fila ajena

### Requirement: Comentarios múltiples
La aplicación SHALL permitir a un usuario autenticado crear múltiples comentarios sobre un artista, álbum o grabación y SHALL listarlos con autor y fecha.

#### Scenario: Crear comentario
- **WHEN** un usuario autenticado envía un cuerpo válido para un objetivo existente
- **THEN** el sistema crea el comentario asociado al usuario de la sesión y lo devuelve en el listado

#### Scenario: Múltiples comentarios
- **WHEN** el mismo usuario comenta varias veces el mismo objetivo
- **THEN** cada comentario queda como una entrada independiente

### Requirement: Borrado físico de comentario
El sistema SHALL permitir al propietario borrar físicamente su comentario y SHALL impedir borrar comentarios de otros usuarios.

#### Scenario: Borrar comentario propio
- **WHEN** el propietario confirma el borrado de un comentario
- **THEN** el sistema elimina la fila sin dejar una versión recuperable

#### Scenario: Borrar comentario ajeno
- **WHEN** un usuario intenta borrar un comentario que no le pertenece
- **THEN** el sistema rechaza la operación y conserva el comentario

### Requirement: Estado social localizado
Las páginas de artista, álbum y canción SHALL mostrar formularios, rating actual, comentarios, estados de autenticación y errores en el locale activo sin traducir datos musicales.

#### Scenario: Visitante anónimo
- **WHEN** una persona sin sesión visita un objetivo social
- **THEN** puede leer el contenido público y recibe una acción localizada para iniciar sesión antes de escribir

#### Scenario: Usuario autenticado
- **WHEN** un usuario autenticado visita un objetivo que ya valoró
- **THEN** ve su rating actual y puede editarlo o borrarlo sin perder el resto del contenido
