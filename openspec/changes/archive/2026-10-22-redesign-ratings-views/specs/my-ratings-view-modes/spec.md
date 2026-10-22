## REMOVED Requirements

### Requirement: Modo Gráfico con la nota al pasar el cursor
**Reason**: La nota solo aparecía al pasar el cursor y el overlay tapaba la carátula; una pared de portadas no
decía nada en reposo y en móvil cada ficha cargaba chip, "Sin afinar" y un botón sobre el arte.
**Migration**: Sustituido por "Modo Gráfico con la nota visible": la nota va siempre visible bajo la carátula y su
puntaje es el botón que abre el diálogo de edición.

## ADDED Requirements

### Requirement: Modo Gráfico con la nota visible
El modo Gráfico SHALL mostrar una pared de carátulas cuadradas con su leyenda debajo: el título, una línea de
detalle con el artista, el tipo y el año (según la agrupación), las estrellas y el puntaje (`86`, o un guion
`—` si no hay). La carátula SHALL enlazar a la página del álbum o la canción y NO SHALL llevar overlay ni botones
encima. El puntaje SHALL ser un botón que abre el diálogo de puntaje; con puntero grueso SHALL medir al menos 44
px de alto. La etiqueta accesible del enlace de la carátula SHALL exponer título, artista, tipo, estrellas y
puntaje ("Sin afinar" si no hay), y el botón del puntaje SHALL llevar la etiqueta "Editar la nota de …" (o
"Afinar puntaje" si no hay puntaje). Cada carátula SHALL llevar una marca fija de tipo (disco para álbum, nota
musical para canción). Una canción sin carátula propia SHALL mostrar la carátula del álbum donde aparece o, si no
hay, el disco genérico. Las carátulas de la primera fila de la pared SHALL cargarse con prioridad. El contenedor
SHALL tener el ancho único de la página.

#### Scenario: Ver la nota sin pasar el cursor
- **WHEN** la persona abre `/me/ratings` en modo Gráfico y no hay cursor encima de ninguna carátula
- **THEN** cada ficha muestra bajo la carátula el título, el detalle, las estrellas y el puntaje o un guion

#### Scenario: Navegar a la ficha
- **WHEN** hace clic sobre la carátula
- **THEN** navega a la página del álbum o la canción

#### Scenario: Editar desde la pared
- **WHEN** activa el puntaje de una ficha
- **THEN** se abre el diálogo de puntaje con la valoración de esa carátula y no se navega

#### Scenario: Sin overlay sobre el arte
- **WHEN** la persona pasa el cursor o enfoca una carátula
- **THEN** no aparece ningún overlay ni botón sobre la imagen, y el foco se ve en el enlace y en el botón del puntaje

#### Scenario: Táctil
- **WHEN** la persona usa un dispositivo con puntero grueso
- **THEN** cada ficha muestra la misma leyenda y el botón del puntaje mide al menos 44 px de alto

#### Scenario: Distinguir canción de álbum
- **WHEN** la pared muestra un álbum y una canción sin agrupar
- **THEN** el álbum lleva la marca de disco y la canción la de nota musical, y la línea de detalle de cada
  una dice "Álbum" o "Canción"

#### Scenario: Canción sin carátula
- **WHEN** una canción valorada no tiene carátula
- **THEN** la pared muestra el disco genérico y la ficha funciona igual

#### Scenario: Etiqueta accesible completa
- **WHEN** un lector de pantalla recorre una carátula valorada con 4,5★ y 86
- **THEN** anuncia título, artista, tipo, "4,5 estrellas" y "86/100"

#### Scenario: Primera fila con prioridad
- **WHEN** la pared se muestra con más de seis carátulas
- **THEN** las seis primeras se cargan con prioridad y el resto de forma diferida

## MODIFIED Requirements

### Requirement: Modo Detallada
El modo Detallada SHALL mostrar cada valoración como la fila de la biblioteca: carátula, título
enlazado, artista, tipo, año, estrellas editables y puntaje (o un guion `—` si no hay). Los controles de
edición SHALL estar siempre visibles. La fila SHALL ser compacta: las filas SHALL separarse con una línea fina
en lugar de huecos, la carátula SHALL achicarse desde `sm`, y las estrellas y el puntaje SHALL agruparse a la
derecha con un ancho fijo para el puntaje, de modo que queden alineados de una fila a otra; en pantallas
anchas el título y la nota comparten línea; en pantallas angostas la nota baja bajo el título.

#### Scenario: Fila compacta en pantalla ancha
- **WHEN** la persona ve su biblioteca en modo Detallada en una pantalla ancha
- **THEN** el título y la nota (estrellas y puntaje) están en la misma línea, el puntaje queda alineado con el
  de las demás filas y cada fila se separa de la siguiente con una línea fina

#### Scenario: Fila completa
- **WHEN** la persona ve su biblioteca en modo Detallada
- **THEN** cada fila muestra carátula, título, artista, tipo, año, estrellas editables y el
  puntaje o un guion

### Requirement: Modo Índice
El modo Índice SHALL mostrar las valoraciones como una tabla: encabezados de columna (Título, Tipo, Año,
Estrellas, Nota; visibles desde `sm` y solo para lectores de pantalla debajo) y una fila por valoración con el
título enlazado y el artista como subtítulo, el tipo y el año en pantallas anchas, las estrellas y el puntaje
(`86/100`, o un guion `—` si no hay) alineado a la derecha, de modo que las columnas queden alineadas de una
fila a otra. En pantallas angostas el artista SHALL ir en una segunda línea bajo el título, cada uno truncado
por separado, en vez de truncarse junto al título; en pantallas anchas SHALL seguir en la misma línea. Tocar el
puntaje o el guion SHALL abrir el diálogo de puntaje. No SHALL mostrar carátulas.

#### Scenario: Fila compacta
- **WHEN** la persona cambia a modo Índice
- **THEN** ve una tabla con una fila por valoración con título, artista y nota a la derecha, sin
  carátula, y las columnas de año, estrellas y nota alineadas entre filas

#### Scenario: Artista en segunda línea en móvil
- **WHEN** la persona ve el modo Índice sin agrupar en una pantalla angosta
- **THEN** el artista aparece bajo el título, y ni el uno ni el otro quedan cortados por el otro

#### Scenario: Abrir el diálogo desde el índice
- **WHEN** activa el puntaje de una fila del índice
- **THEN** se abre el diálogo de puntaje con la valoración de esa fila

### Requirement: Sin datos repetidos bajo un encabezado
Las entradas SHALL omitir los datos que el encabezado de su sección ya dice: con "Por artista" NO
SHALL repetir el artista ni el tipo (el encabezado nombra al artista y el subencabezado el tipo);
con "Por tipo" NO SHALL repetir el tipo; con "Sin agrupar" SHALL mostrar ambos. El año SHALL
mostrarse siempre que exista. La omisión SHALL aplicarse en los tres modos (en la leyenda de la ficha de la
pared, sin el artista ni el tipo, pero con el año) y NO SHALL afectar la etiqueta accesible de la
carátula, que conserva título, artista, tipo, estrellas y puntaje.

#### Scenario: Por artista sin repetir artista ni tipo
- **WHEN** la persona agrupa por artista y mira el modo Índice o Detallada
- **THEN** las filas muestran el título y la nota, sin el nombre del artista ni "Álbum"/"Canción",
  y conservan el año

#### Scenario: Por tipo sin repetir el tipo
- **WHEN** la persona agrupa por tipo
- **THEN** las filas muestran el artista pero no "Álbum"/"Canción"

#### Scenario: Sin agrupar muestra todo
- **WHEN** la persona elige "Sin agrupar"
- **THEN** cada entrada muestra su artista y su tipo

#### Scenario: La etiqueta accesible no pierde datos
- **WHEN** la pared está agrupada por artista
- **THEN** la etiqueta de cada carátula sigue incluyendo artista y tipo

### Requirement: Áreas táctiles con puntero grueso
En dispositivos con puntero grueso (`pointer: coarse`), las estrellas editables de la fila Detallada, el
conmutador de modo de visualización, los botones de puntaje (el puntaje y el guion de "sin afinar", en las tres
vistas), los segmentos de tipo y las barras del histograma SHALL tener al menos 44 px de alto, y cada mitad de
estrella editable SHALL medir al menos 24 px de ancho. Con puntero fino su tamaño NO SHALL cambiar. Cuando las
estrellas y el puntaje no quepan en una línea, el puntaje SHALL bajar a la línea siguiente en vez de desbordar.

#### Scenario: Teléfono
- **WHEN** la persona usa un dispositivo con puntero grueso y ve la fila Detallada
- **THEN** cada estrella editable mide 48 × 44 px, y el conmutador y el botón de puntaje miden al menos 44 px de alto

#### Scenario: Segmentos e histograma en el teléfono
- **WHEN** la persona usa un dispositivo con puntero grueso
- **THEN** cada segmento de tipo y cada barra del histograma miden al menos 44 px de alto

#### Scenario: Ratón
- **WHEN** la persona usa un ratón
- **THEN** los controles conservan su tamaño compacto
