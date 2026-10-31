## MODIFIED Requirements

### Requirement: Contenido de la grilla

Cada tarjeta de la grilla SHALL mostrar la carátula, el título y el año, una etiqueta "EP" en
los EP de Principal cuando Principal no se parte en bloques (requirement "Principal en bloques"), el botón de acciones del disco (capability `discography-quick-actions`) y,
para el usuario en sesión, una franja de marcas sobre la base de la carátula con su nota ("★ 4½")
o ✓ si solo lo escuchó, ♥ si es favorito y el marcador si está en Pendiente; sin marcas, la
franja SHALL omitirse. Cada marca SHALL tener un texto accesible. La grilla SHALL mostrar como
máximo 48 discos por bloque y una acción "Mostrar más" que agrega los siguientes 48.

#### Scenario: EP en Principal

- **WHEN** Principal incluye un EP
- **THEN** su tarjeta lleva la etiqueta "EP"

#### Scenario: Artista con cientos de discos principales

- **WHEN** Principal tiene 300 discos
- **THEN** la grilla muestra los primeros 48 y "Mostrar más"

#### Scenario: Disco calificado y favorito

- **WHEN** una persona calificó *Dr. Feelgood* con 4½ estrellas y lo tiene como favorito
- **THEN** la carátula muestra "★ 4½" y el corazón

#### Scenario: Disco escuchado sin calificar

- **WHEN** una persona escuchó un disco y no lo calificó
- **THEN** la carátula muestra ✓

## ADDED Requirements

### Requirement: Principal en bloques

Cuando Principal tiene álbumes y EP, SHALL mostrarse en dos bloques con título y cantidad: **Álbumes** primero y **EP**
debajo. En la grilla, el bloque de EP SHALL usar carátulas más chicas (3 columnas en móvil, 6 en tableta y 8 en
escritorio, frente a 2, 4 y 6 de los álbumes) y sus tarjetas SHALL NOT llevar la etiqueta "EP"; en la tabla, cada bloque
SHALL ser un grupo con su título, y el orden se aplica dentro de cada grupo. Una Principal con un solo tipo y el resto de
las secciones SHALL mostrarse en un solo bloque sin título. "Mejor valorado" SHALL seguir marcándose en el bloque que
contenga el disco.

#### Scenario: Banda con álbumes y EP

- **WHEN** una persona abre Principal de Iron Maiden (17 álbumes y 19 EP)
- **THEN** ve "Álbumes 17" en la grilla grande y debajo "EP 19" con carátulas más chicas, sin etiqueta EP en las
  tarjetas

#### Scenario: Solo EP

- **WHEN** Principal de un artista solo tiene EP
- **THEN** se muestra un solo bloque sin título y cada tarjeta lleva la etiqueta "EP"

#### Scenario: Tabla de Principal

- **WHEN** una persona cambia Principal a tabla
- **THEN** la tabla tiene un grupo "Álbumes" y otro "EP", cada uno con su cantidad

### Requirement: Disco sin carátula en la grilla

En la grilla, un disco sin carátula (ausencia confirmada o imagen que no se pudo resolver) SHALL mostrar en el cuadro su
título y su año en lugar de la silueta de vinilo. El relleno SHALL ser decorativo para lectores de pantalla (el título
ya está en el enlace de la tarjeta). La tabla SHALL seguir usando la miniatura de siempre.

#### Scenario: EP sin carátula

- **WHEN** Principal muestra "Christmas EP" (1984) sin carátula
- **THEN** su cuadro dice "Christmas EP" y "1984" en lugar del vinilo vacío

### Requirement: Separadores por década

En la grilla, un bloque con 12 discos o más SHALL separarse por décadas: un separador con el nombre de la década
("Años 80", "Años 2000"; "1980s" en inglés) antes del primer disco de cada una, y "Sin año" antes de los discos sin año.
Un bloque con menos de 12 discos y la tabla SHALL NOT llevar separadores.

#### Scenario: Álbumes de una banda longeva

- **WHEN** el bloque de álbumes de Iron Maiden (17) se muestra en grilla
- **THEN** los discos quedan bajo "Años 80", "Años 90", "Años 2000", "Años 2010" y "Años 2020"

#### Scenario: Pocos discos

- **WHEN** una sección tiene 8 discos en grilla
- **THEN** no hay separadores de década

### Requirement: Barra de la discografía fija

La barra de la discografía (secciones, buscador y vista) SHALL quedar fija bajo las pestañas del artista al bajar por la
página, con fondo opaco, en cualquier viewport; en móvil las secciones, el buscador y la vista SHALL compartir una fila
y las secciones se desplazan de lado. Al cambiar de sección con la barra ya fija, la página SHALL desplazarse para que la
sección nueva empiece justo debajo de la barra. Los títulos de bloque y los grupos de resultados de la búsqueda SHALL
quedar visibles debajo de la barra al llevarlos a la vista.

#### Scenario: Bajar por una discografía larga

- **WHEN** una persona baja hasta los discos de 2010 en Principal
- **THEN** las pestañas y la barra de secciones siguen visibles arriba

#### Scenario: Cambiar de sección a mitad de página

- **WHEN** con la barra fija la persona pulsa "En vivo"
- **THEN** la tabla de En vivo empieza justo debajo de la barra
