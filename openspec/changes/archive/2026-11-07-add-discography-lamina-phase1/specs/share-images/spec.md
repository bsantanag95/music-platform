## MODIFIED Requirements

### Requirement: Carátulas y fotos en la imagen
Las carátulas SHALL obtenerse solo a través del pipeline de carátulas existente (espejo o miniatura
`front-250` de Cover Art Archive) y SHALL dibujarse a su tamaño de origen o menor: el sistema SHALL NOT
ampliar una carátula más allá de 250 px de lado ni pedir otra resolución. Una imagen SHALL juntar como máximo 4 carátulas, salvo
una Lámina armada por una persona o una discografía, que SHALL juntar como máximo 10. Las imágenes en formatos que
el renderizador no acepta (como WebP) SHALL convertirse a PNG en el servidor antes de componerse. Un
disco sin carátula, con la carátula retirada o cuya carátula falla al obtenerse SHALL mostrarse con un
recuadro tipográfico (título y artista), y la imagen SHALL generarse igual. La foto de un artista SHALL
usarse solo si la ficha tiene foto con licencia verificada y SHALL ir acompañada de su crédito (autor y
licencia) en la línea de créditos; sin foto, el artista SHALL mostrarse con un monograma tipográfico.
El avatar de un usuario SHALL mostrarse si existe; si no, su monograma determinista.

#### Scenario: Carátula en WebP del espejo
- **WHEN** la carátula de un álbum está en el espejo como WebP
- **THEN** la imagen del álbum muestra esa carátula, convertida, a no más de 250 px de lado

#### Scenario: Carátula retirada
- **WHEN** un disco tiene la carátula retirada a pedido
- **THEN** la imagen muestra el recuadro tipográfico del disco y no la carátula

#### Scenario: Foto de artista con licencia
- **WHEN** se genera la imagen de un artista con foto de Commons
- **THEN** la línea de créditos incluye el autor y la licencia de la foto

#### Scenario: Falla al obtener la carátula
- **WHEN** el espejo y Cover Art Archive fallan al servir una carátula
- **THEN** la imagen se genera con el recuadro tipográfico en su lugar

## ADDED Requirements

### Requirement: Imagen de una discografía
El tipo `discography`, con referencia `<userId>.<artistId>`, SHALL tener imagen en Publicación, Enlace e Historia, con el marco común: artista, `@usuario`, progreso y
la curva de la carrera. Publicación e Historia SHALL mostrar hasta 20 discos en orden cronológico, con su nota y "+n" si hay más; Enlace, hasta 5. Las 10 mejor
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
