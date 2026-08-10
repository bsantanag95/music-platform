# catalog-album

Delta de la capacidad de detalle de álbum para navegación hacia canciones y estado social.

## ADDED Requirements

### Requirement: Enlaces de tracks a canciones
Cada track del detalle de álbum SHALL enlazar su `recordingId` a `/{locale}/song/{id}` y SHALL conservar créditos, duración y posición visibles.

#### Scenario: Track navegable
- **WHEN** una persona selecciona un track del álbum
- **THEN** la navegación llega al detalle de la grabación con el mismo locale y el UUID interno correcto

### Requirement: Acciones sociales del álbum
El detalle de álbum SHALL reservar un área localizada para rating y comentarios, mostrando lectura pública y controles de escritura únicamente a usuarios autenticados.

#### Scenario: Usuario anónimo en álbum
- **WHEN** una persona sin sesión visita un álbum
- **THEN** puede ver ratings y comentarios públicos y recibe una acción para iniciar sesión antes de escribir

#### Scenario: Usuario autenticado en álbum
- **WHEN** un usuario autenticado visita un álbum
- **THEN** puede consultar y modificar su rating y sus comentarios sin que el tracklist se vuelva a ingerir
