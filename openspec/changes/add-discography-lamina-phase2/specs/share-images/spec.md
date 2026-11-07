## MODIFIED Requirements

### Requirement: Imagen de una discografía
El tipo `discography`, con referencia `<userId>.<artistId>`, SHALL tener imagen en Publicación, Enlace e Historia, con el marco común: artista, `@usuario`, progreso y
la curva de la carrera, en la vista que eligió el dueño. En la vista Por disco, Publicación e Historia SHALL mostrar hasta 20 discos en orden cronológico, con su nota y "+n" si hay más; Enlace, hasta 5. Las 10 mejor
valoradas SHALL llevar su carátula y las demás, el recuadro tipográfico con año y título. Como anónimo, SHALL generarse solo con la marca y si un anónimo puede ver
el perfil; si no, SHALL responder la imagen genérica.

#### Scenario: Con 25 discos
- **WHEN** se genera la Publicación de una discografía con 25 discos valorados
- **THEN** la imagen muestra 20 discos y "+5", y como máximo 10 carátulas

#### Scenario: Anónimo sin marca
- **WHEN** un anónimo pide la imagen de una discografía sin marca
- **THEN** recibe la imagen genérica y ninguna nota

#### Scenario: Solo estrellas
- **WHEN** un disco tiene estrellas y ningún puntaje detallado
- **THEN** la imagen muestra las estrellas en su tramo de la escala y no un número

#### Scenario: Vista Por canción
- **WHEN** el dueño eligió Por canción y llega al umbral
- **THEN** la imagen muestra la grilla de hasta 20 discos y 20 pistas, con "+n" si hay más y las celdas sin nota vacías

## ADDED Requirements

### Requirement: Imagen de una Lámina de álbum
La referencia `<userId>.<artistId>.<albumId>` del tipo `discography` SHALL tener imagen en Publicación, Enlace e Historia: la carátula del disco y sus pistas como
barras con su nota, hasta 25, con "+n" si hay más. SHALL seguir las mismas reglas de visibilidad que la discografía.

#### Scenario: Álbum compartido
- **WHEN** un anónimo pide la imagen del álbum de una discografía compartida
- **THEN** recibe las barras con las notas de las canciones

#### Scenario: Sin marca
- **WHEN** un anónimo pide esa imagen sin marca
- **THEN** recibe la imagen genérica
