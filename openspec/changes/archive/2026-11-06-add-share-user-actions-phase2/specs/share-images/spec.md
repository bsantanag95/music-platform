## ADDED Requirements

### Requirement: Imágenes de valoración y de escucha
El sistema SHALL generar la imagen Enlace de:
- **Valoración:** carátula, título, artista, la nota y `@usuario`. La nota SHALL ser el puntaje detallado si existe y, si no, las
  estrellas; nunca un número derivado de las estrellas.
- **Escucha:** carátula, título, artista, mes y año, reacción si tiene, `@usuario` y su impresión como cita de hasta 200 caracteres.

Solo existen para álbumes y canciones. Una valoración sin marca ni destacado, una escucha que no es pública ni destacada, o de un
perfil que un anónimo no puede ver, SHALL responder con la imagen genérica.

#### Scenario: Valoración con puntaje
- **WHEN** se genera la imagen de una valoración marcada de 4,5 estrellas y puntaje 86
- **THEN** la imagen muestra 86 con el color de su tramo

#### Scenario: Valoración solo con estrellas
- **WHEN** se genera la imagen de una valoración marcada de 4,5 estrellas sin puntaje
- **THEN** la imagen muestra las estrellas y ningún número de 1 a 100

#### Scenario: Valoración sin marca
- **WHEN** se pide la imagen de una valoración sin marca
- **THEN** la respuesta es la imagen genérica

#### Scenario: Valoración destacada
- **WHEN** se pide la imagen de una valoración destacada sin marca
- **THEN** la respuesta es la imagen de la valoración

#### Scenario: Escucha sin impresión
- **WHEN** se genera la imagen de una escucha pública sin texto
- **THEN** la imagen no muestra ninguna cita
