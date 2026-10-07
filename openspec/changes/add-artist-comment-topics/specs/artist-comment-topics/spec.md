## ADDED Requirements

### Requirement: Tema de los comentarios de artista
Todo comentario de artista SHALL tener exactamente un tema del catálogo cerrado `start`
("Para empezar"), `albums` ("Álbumes"), `songs` ("Canciones") o `general` ("General"). Un
comentario de álbum o de canción SHALL NOT tener tema. La base de datos SHALL imponerlo con
restricciones, no solo la aplicación.

#### Scenario: Comentario de artista con tema
- **WHEN** una persona autenticada publica un comentario en un artista eligiendo "Álbumes"
- **THEN** el comentario se guarda con tema `albums` y la respuesta lo incluye

#### Scenario: Tema omitido
- **WHEN** se publica un comentario de artista sin indicar tema
- **THEN** se guarda con tema `general`

#### Scenario: Tema fuera del catálogo
- **WHEN** se publica un comentario de artista con un tema que no está en el catálogo
- **THEN** se rechaza con `INVALID_TOPIC` y no se crea ninguna fila

#### Scenario: Tema en álbum o canción
- **WHEN** se publica un comentario en un álbum o una canción indicando un tema
- **THEN** se rechaza con `INVALID_TOPIC` y no se crea ninguna fila

#### Scenario: La base impide un comentario de artista sin tema
- **WHEN** se intenta insertar directamente en la base un comentario de artista con `topic` nulo
- **THEN** la inserción falla por restricción

### Requirement: Las notas existentes pasan a General
Los comentarios de artista anteriores a la existencia de los temas SHALL quedar con el tema
`general`. El sistema SHALL NOT asignarles ningún otro tema.

#### Scenario: Migración de notas previas
- **WHEN** se aplica la migración que introduce los temas
- **THEN** todo comentario de artista existente tiene tema `general` y su texto, autor, fecha y
  likes no cambian

### Requirement: Filtro por tema
El listado de comentarios de un artista SHALL poder filtrarse por tema. Sin filtro SHALL mostrar
los comentarios de todos los temas, del más reciente al más antiguo, con la paginación existente.
Pedir un filtro de tema sobre un álbum o una canción SHALL rechazarse con `INVALID_TOPIC`.

#### Scenario: Filtrar por un tema
- **WHEN** se pide el listado de un artista con tema `start`
- **THEN** solo se devuelven comentarios de `start`, paginados igual que el listado completo

#### Scenario: Sin filtro
- **WHEN** se pide el listado de un artista sin tema
- **THEN** se devuelven los comentarios de todos los temas

#### Scenario: Filtro sobre un álbum
- **WHEN** se pide el listado de un álbum con un tema
- **THEN** se rechaza con `INVALID_TOPIC`

### Requirement: Sección Comentarios en la página de artista
La página de artista SHALL mostrar al final una sección titulada "Comentarios" con un control de
filtro (Todos y un chip por tema) y, para quien tiene sesión, un formulario con selector de tema.
El selector SHALL arrancar en `general`, o en el tema del chip activo si hay uno distinto de
"Todos". Cada comentario SHALL mostrar su tema. Las páginas de álbum y de canción SHALL mantener
su sección de comentarios sin chips, selector ni tema.

#### Scenario: Escribir desde un tema filtrado
- **WHEN** una persona con sesión tiene activo el chip "Para empezar" y abre el formulario
- **THEN** el selector de tema aparece en "Para empezar"

#### Scenario: Escribir sin filtro
- **WHEN** una persona con sesión abre el formulario con "Todos" activo
- **THEN** el selector de tema aparece en "General"

#### Scenario: Tema sin comentarios
- **WHEN** se activa un chip de un tema sin comentarios
- **THEN** se muestra un estado vacío propio de ese tema, no el de la lista completa

#### Scenario: Álbum y canción sin cambios
- **WHEN** una persona abre un álbum o una canción
- **THEN** su sección de comentarios no muestra chips, selector ni etiqueta de tema

### Requirement: El tema no se edita
Editar un comentario SHALL permitir cambiar únicamente su texto. El tema SHALL permanecer el que
tenía al publicarse.

#### Scenario: Editar el texto
- **WHEN** la autora edita su comentario
- **THEN** el texto cambia y el tema se conserva

### Requirement: Comportamiento heredado de los comentarios
Los comentarios de artista con tema SHALL conservar sus likes, moderación, bloqueos, reportes,
exclusión de cuentas desactivadas y borrado en cascada tal como funcionan hoy.

#### Scenario: Like en un comentario con tema
- **WHEN** una persona da like a un comentario de artista de cualquier tema
- **THEN** el like funciona igual que en cualquier otro comentario
