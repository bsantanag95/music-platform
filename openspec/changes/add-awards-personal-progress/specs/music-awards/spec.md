## ADDED Requirements

### Requirement: Tu relación con los ganadores recientes

Con sesión, "Ganadores recientes" del hub de premios SHALL mostrar cuántos de sus álbumes ganadores distintos (con álbum en el
catálogo; un mismo disco que ganó en varios premios cuenta una vez) escuchó la persona, con una barra de progreso. Un álbum SHALL
contar como escuchado si la persona registró una escucha o lo valoró; tenerlo en Pendiente SHALL NOT contar como escuchado. Cada
carátula SHALL marcarse **Escuchado** o, si está en Pendiente y no lo escuchó, **Pendiente**. Mientras falte alguno, SHALL ofrecer el
filtro **Todos / Te faltan N** (`?ganadores=faltan`), que deja solo los álbumes que no escuchó, una vez cada uno. Las marcas SHALL
mostrarse solo a la propia persona. Sin sesión, la sección SHALL NOT mostrar progreso, marcas ni filtro.

#### Scenario: Progreso

- **WHEN** una persona con sesión escuchó Brat y valoró Cowboy Carter, y los ganadores recientes suman 12 álbumes distintos
- **THEN** ve "Has escuchado 2 de 12 álbumes ganadores" y las carátulas de esos dos discos marcadas como Escuchado

#### Scenario: Te faltan

- **WHEN** abre `/es/awards?ganadores=faltan` y no escuchó Debí Tirar Más Fotos, que ganó en tres premios
- **THEN** el riel muestra ese disco una sola vez y ninguno de los que ya escuchó

#### Scenario: Todo escuchado

- **WHEN** escuchó todos los álbumes ganadores recientes
- **THEN** ve "Escuchaste los 12 álbumes ganadores" y no se ofrece el filtro

#### Scenario: Sin sesión

- **WHEN** una persona sin sesión abre `/es/awards`
- **THEN** ve los ganadores recientes sin progreso, marcas ni filtro
