## MODIFIED Requirements

### Requirement: Acciones sociales del álbum

El detalle de álbum SHALL reservar un área localizada para reseñas, rating y comentarios,
mostrando lectura pública y controles de escritura únicamente a usuarios autenticados. Las
reseñas de la comunidad SHALL presentarse con su autor, las estrellas vigentes de ese
autor, un título opcional como metadato secundario (junto al autor y las estrellas, no
como encabezado; omitido cuando no existe) y el cuerpo, y SHALL diferenciarse visual y
estructuralmente de los comentarios: la reseña lleva rating y es la postura crítica del
autor sobre la obra, el comentario es una nota conversacional corta. El editor de reseña
propia SHALL pedir el cuerpo, un título opcional y —solo cuando el usuario aún no valoró
el álbum— las estrellas, en el mismo formulario.

#### Scenario: Usuario anónimo en álbum

- **WHEN** una persona sin sesión visita un álbum
- **THEN** puede leer las reseñas, los ratings y los comentarios públicos y recibe una
  acción para iniciar sesión antes de escribir

#### Scenario: Usuario autenticado en álbum

- **WHEN** un usuario autenticado visita un álbum
- **THEN** puede consultar y modificar su reseña, su rating y sus comentarios sin que el
  tracklist se vuelva a ingerir

#### Scenario: Reseña y comentario se distinguen en la vista

- **WHEN** un álbum tiene reseñas y comentarios
- **THEN** la vista los presenta en secciones diferenciadas: las reseñas con autor,
  estrellas y —cuando existe— título en la línea de metadato; los comentarios como notas
  cortas sin título ni rating

#### Scenario: Reseña sin título en la vista

- **WHEN** una reseña de la comunidad no tiene título
- **THEN** la vista la muestra con el autor, las estrellas y el cuerpo, sin dejar un hueco
  ni un separador donde iría el título
