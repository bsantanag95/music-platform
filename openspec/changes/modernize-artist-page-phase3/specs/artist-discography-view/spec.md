## MODIFIED Requirements

### Requirement: Barra de la discografía fija

La barra de la discografía SHALL tener dos filas en cualquier viewport: arriba las secciones; debajo el buscador, el filtro
personal (cuando corresponde), «Agrupar» (cuando corresponde) y «Vista». Desde la tableta cada grupo de opciones SHALL llevar su
rótulo visible; en el teléfono los rótulos SHALL quedar disponibles para lectores de pantalla. La barra SHALL quedar fija bajo las
pestañas del artista al bajar por la página, con fondo opaco, en cualquier viewport; en móvil las secciones SHALL ocupar una línea
que se desplaza de lado y la segunda fila SHALL NOT desbordar la página. Al cambiar de sección con la barra ya fija, la página SHALL
desplazarse para que la sección nueva empiece justo debajo de la barra. Los títulos de bloque y los grupos de resultados de la
búsqueda SHALL quedar visibles debajo de la barra al llevarlos a la vista.

#### Scenario: Bajar por una discografía larga

- **WHEN** una persona baja hasta los discos de 2010 en Principal
- **THEN** las pestañas y la barra de secciones siguen visibles arriba

#### Scenario: Cambiar de sección a mitad de página

- **WHEN** con la barra fija la persona pulsa "En vivo"
- **THEN** la tabla de En vivo empieza justo debajo de la barra

#### Scenario: Dos filas con rótulos

- **WHEN** una persona abre Principal de Iron Maiden en 1024 px
- **THEN** ve las secciones en la primera fila y, debajo, el buscador, «Agrupar» con Tipo · Década · Sin agrupar y «Vista» con
  Grilla · Tabla, cada grupo con su rótulo

#### Scenario: Teléfono

- **WHEN** una persona abre Principal en 390 px
- **THEN** las secciones se desplazan de lado en la primera fila, los controles caben en la segunda y la página no desborda

### Requirement: Disco sin carátula en la grilla

En la grilla, un disco sin carátula (ausencia confirmada, imagen que no se pudo resolver o imagen que falló al cargar, también
antes de que la página se hidrate) SHALL mostrar en el cuadro su título y su año en lugar de la silueta de vinilo, y la página SHALL
NOT mostrar el icono de imagen rota del navegador. Cuando la tarjeta lleva etiquetas («★ Mejor valorado», «EP»), el título SHALL
quedar debajo de ellas, sin taparse. El relleno SHALL ser decorativo para lectores de pantalla (el título ya está en el enlace de la
tarjeta). La tabla SHALL seguir usando la miniatura de siempre, con el disco dibujado si la imagen falla.

#### Scenario: EP sin carátula

- **WHEN** Principal muestra "Christmas EP" (1984) sin carátula
- **THEN** su cuadro dice "Christmas EP" y "1984" en lugar del vinilo vacío

#### Scenario: Disco sin carátula con etiqueta

- **WHEN** un disco sin carátula es el mejor valorado de Principal
- **THEN** la etiqueta «★ Mejor valorado» queda arriba y el título se lee completo debajo de ella

#### Scenario: Carátula que falla al cargar

- **WHEN** la miniatura de un disco responde con error antes de que la página termine de cargar
- **THEN** el cuadro muestra el título y el año, sin el icono de imagen rota
