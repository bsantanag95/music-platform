## ADDED Requirements

### Requirement: Formatos Publicación y Cuadrado
El sistema SHALL generar con `format=post` una imagen de 1080×1350 y con `format=square` una de 1080×1080 para los objetos que los declaran, con la
misma marca, tipografías y escala. Pedir un formato que el objeto no declara SHALL responder `400` con `VALIDATION_ERROR`.

#### Scenario: Top 5
- **WHEN** se pide la imagen de un Top 5 con `format=post`
- **THEN** es un PNG de 1080×1350

#### Scenario: Formato no disponible
- **WHEN** se pide la imagen de un álbum con `format=square`
- **THEN** la respuesta es `400` con `VALIDATION_ERROR`

### Requirement: Imagen de una Lámina Top N
El sistema SHALL generar: **Top 5**, el primero destacado a 250 px y los otros cuatro en filas con su puesto; **Top 10**, dos filas de cinco con su
puesto; **Grilla 3×3**, nueve carátulas sin números. Todas SHALL llevar título, nombre y `@usuario`, firma y créditos, y las notas solo si la Lámina
las muestra, con la escala de la casa. Los formatos SHALL ser `post` para Top 5 y Top 10, `square` para la Grilla, y además `link` y `story`. Una
Lámina que un anónimo no puede ver SHALL responder con la imagen genérica.

#### Scenario: Ítem sin carátula
- **WHEN** un ítem de la Lámina no tiene carátula
- **THEN** ocupa su lugar con el recuadro tipográfico

#### Scenario: Lámina con menos ítems que lugares
- **WHEN** se genera la imagen de un Top 10 con 7 ítems
- **THEN** la imagen muestra los 7 sin lugares vacíos numerados

## MODIFIED Requirements

### Requirement: Carátulas y fotos en la imagen
Las carátulas SHALL obtenerse solo a través del pipeline de carátulas existente (espejo o miniatura
`front-250` de Cover Art Archive) y SHALL dibujarse a su tamaño de origen o menor: el sistema SHALL NOT
ampliar una carátula más allá de 250 px de lado ni pedir otra resolución. Una imagen SHALL juntar como máximo 4 carátulas, salvo
una Lámina armada por una persona, que SHALL juntar como máximo 10. Las imágenes en formatos que
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
