## RENAMED Requirements

- FROM: `### Requirement: Destacada única como portada`
- TO: `### Requirement: Destacadas como exhibidor`

## MODIFIED Requirements

### Requirement: Destacadas como exhibidor

La primera lista de "Destacadas" SHALL presentarse como **exhibidor** a todo el ancho: hasta cuatro carátulas de la lista
como fundas abiertas en abanico (las fotos de artistas, en círculo), la insignia de contenido oficial en su propia línea sobre
el título, el tipo, el título en grande (hasta dos líneas, sin truncar por la insignia en ningún ancho), el dueño, la
descripción (hasta dos líneas), los **primeros cuatro elementos** numerados con su título y, si tiene, su artista, y las
acciones "Abrir la lista" y, con sesión y si no es propia, Guardar, junto al conteo de elementos y de guardados. Los
elementos SHALL resolverse en el servidor; si no se pueden obtener, el exhibidor SHALL mostrarse sin ellos. Desde la segunda,
las destacadas SHALL presentarse como **exhibidores compactos** (abanico pequeño, título, tipo y conteo) en una fila de hasta
tres columnas desde `md`, una sobre otra por debajo. En el teléfono el abanico SHALL achicarse y mostrar tres elementos, no
cuatro. Sin carátulas, el abanico SHALL mostrar una sola silueta de disco.

#### Scenario: Destacada en móvil

- **WHEN** la única destacada es una lista oficial de título largo y se ve en 375px
- **THEN** la insignia "Oficial" aparece sobre el título y el título se lee completo (en hasta dos líneas)

#### Scenario: Exhibidor de la destacada

- **WHEN** la única destacada es "Playlist de fondo", con cuatro canciones con carátula
- **THEN** se ve a todo el ancho con las cuatro carátulas en abanico, la insignia "Oficial", su descripción, las cuatro
  canciones numeradas con su artista y "Abrir la lista"

#### Scenario: Varias destacadas

- **WHEN** hay tres listas oficiales destacadas
- **THEN** la primera es el exhibidor y las otras dos van debajo como exhibidores compactos, lado a lado desde `md`

#### Scenario: Elementos no disponibles

- **WHEN** no se pueden obtener los elementos de la destacada
- **THEN** el exhibidor se muestra con su abanico, título, descripción y acciones, sin la lista numerada y sin error


### Requirement: Imágenes y tamaño de las tarjetas de listas

El mosaico de una tarjeta de lista SHALL usar tantas imágenes como tenga la lista, hasta cuatro, sin rellenar huecos con
siluetas de disco ni recortar una imagen fuera del cuadrado: una sola imagen SHALL ocupar la caja, dos SHALL dividirla en
mitades y tres SHALL ocupar tres celdas de una grilla de 2×2, con la cuarta como una celda neutra que muestra los ítems
restantes ("+N") o, si no hay más, el tipo de la lista. Sin ninguna, SHALL mostrarse una única silueta de disco. Las
imágenes SHALL ser la carátula del álbum, la de un álbum representativo de una canción y, en una lista de artistas, la foto
del artista si no fue retirada, recortada en círculo dentro de su celda. La primera de "Destacadas" SHALL
presentarse como exhibidor, con sus carátulas en abanico en lugar del mosaico (ver "Destacadas como exhibidor").

#### Scenario: Lista con dos imágenes

- **WHEN** una lista tiene dos álbumes con carátula
- **THEN** su mosaico muestra las dos carátulas en mitades, sin discos vacíos

#### Scenario: Lista de artistas

- **WHEN** una lista de artistas tiene artistas con foto
- **THEN** su mosaico muestra esas fotos, en círculo

#### Scenario: Una sola destacada

- **WHEN** "Destacadas" tiene una sola lista
- **THEN** se presenta como exhibidor a todo el ancho, con sus carátulas en abanico en lugar del mosaico

#### Scenario: Lista con tres imágenes

- **WHEN** una lista de cinco álbumes tiene carátula solo en tres
- **THEN** su mosaico muestra las tres carátulas cuadradas y una cuarta celda con "+2", sin recortar ninguna
