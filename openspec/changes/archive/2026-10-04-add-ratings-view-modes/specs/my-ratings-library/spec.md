## MODIFIED Requirements

### Requirement: Biblioteca de valoraciones propias
El sistema SHALL ofrecer a cada persona con sesión una página "Mis valoraciones"
(`/me/ratings`) con sus valoraciones de álbumes y canciones. Cada entrada SHALL mostrar la
carátula, el título enlazado a su página, el artista principal, el tipo (álbum o canción), el
año de salida cuando existe, la nota con el formato de `rating-display` (estrellas y `86/100`,
o estrellas y `4,5` sin puntaje) y los controles de edición, con el nivel de detalle que fija
el modo de visualización (`my-ratings-view-modes`). La página SHALL paginarse y SHALL mostrar
el total de valoraciones desglosado por tipo (álbumes y canciones); el desglose SHALL respetar
los filtros vigentes y la API SHALL devolverlo como `counts` junto con `total`. Las valoraciones
de artistas NO SHALL listarse ni contarse. Sin valoraciones, la página SHALL decirlo y enlazar a
Explorar; sin sesión SHALL redirigir al inicio de sesión.

#### Scenario: Ver mis valoraciones
- **WHEN** una persona con 12 álbumes y 3 canciones valorados abre `/me/ratings`
- **THEN** ve 15 valoraciones paginadas, cada una con su carátula, título, artista, tipo y
  nota, y el total "15"

#### Scenario: Desglose por tipo
- **WHEN** esa persona abre `/me/ratings`
- **THEN** la respuesta trae `counts` con 12 álbumes y 3 canciones, y la página lo muestra junto
  al total

#### Scenario: El desglose respeta los filtros
- **WHEN** filtra por 5 estrellas y solo 4 de sus álbumes y 1 de sus canciones tienen 5 estrellas
- **THEN** `counts` trae 4 álbumes y 1 canción

#### Scenario: Sin valoraciones
- **WHEN** una persona sin valoraciones abre `/me/ratings`
- **THEN** ve el mensaje de vacío con un enlace a Explorar

#### Scenario: Sin sesión
- **WHEN** una persona sin sesión abre `/me/ratings`
- **THEN** es redirigida al inicio de sesión

### Requirement: Orden por nota con los sin puntaje después
La biblioteca SHALL ordenarse por: mejor nota (por defecto), peor nota, más reciente o
título. "Mejor nota" SHALL ordenar por estrellas descendente y, dentro de las mismas
estrellas, por puntaje detallado descendente; "peor nota" por estrellas y puntaje
ascendentes. En ambos sentidos, dentro de las mismas estrellas, las valoraciones sin puntaje
SHALL ir después de las que lo tienen, sin imputarles ningún valor; el desempate final SHALL
ser la fecha de actualización descendente. "Más reciente" SHALL ordenar por fecha de
actualización descendente y "título" por título ascendente sin distinguir acentos ni
mayúsculas. Con la agrupación por tipo (`group=type`) el orden elegido SHALL aplicarse dentro de
cada tipo, con los álbumes antes que las canciones; con la agrupación por artista (`group=artist`)
SHALL ordenar primero por el nombre del artista principal acreditado (sin distinguir mayúsculas,
con las valoraciones sin artista al final), luego los álbumes antes que las canciones y dentro de
cada tipo aplicar el orden elegido; con `group=none` SHALL aplicarse a toda la lista. Un valor de orden inválido SHALL responder `400` con código `VALIDATION_ERROR`.

#### Scenario: Mejor nota con desempate por puntaje
- **WHEN** una persona tiene tres discos de 4 estrellas con puntajes 78, 72 y sin puntaje, y
  uno de 4,5 estrellas
- **THEN** el orden "mejor nota" es el de 4,5, luego 78, 72 y el sin puntaje

#### Scenario: Peor nota con los sin puntaje después
- **WHEN** ordena por "peor nota" esos mismos discos de 4 estrellas
- **THEN** quedan 72, 78 y el sin puntaje, y el de 4,5 al final

#### Scenario: Orden dentro de cada tipo
- **WHEN** una persona con `group=type` ordena por "mejor nota" y tiene una canción de 5★ y un
  álbum de 3★
- **THEN** el álbum de 3★ aparece antes que la canción de 5★, porque los álbumes van primero y el
  orden rige dentro de cada tipo

#### Scenario: Orden por artista
- **WHEN** esa persona usa `group=artist` con "mejor nota" y tiene un álbum de 3★ de "Aimee Mann",
  una canción de 5★ y un álbum de 4★ de "Heart"
- **THEN** el orden es: el álbum de Aimee Mann, el álbum de 4★ de Heart y la canción de 5★ de
  Heart; y una valoración sin artista queda al final

#### Scenario: Orden sin agrupar
- **WHEN** esa persona usa `group=none` con "mejor nota"
- **THEN** la canción de 5★ aparece antes que el álbum de 3★

#### Scenario: Orden inválido
- **WHEN** se pide un orden que no existe
- **THEN** la API responde `400` con código `VALIDATION_ERROR`

### Requirement: Filtros de la biblioteca
La biblioteca SHALL poder filtrarse por estrellas (un valor de ½ a 5), tipo (álbum o
canción), año de salida, década y una búsqueda de texto `q`, combinables entre sí. La búsqueda
SHALL coincidir, sin distinguir mayúsculas, con el título del álbum o la canción o con el nombre
de su artista principal acreditado. El año de una canción SHALL ser el
menor año de salida de los álbumes donde aparece; una canción sin año de ningún álbum SHALL
quedar sin año y fuera de los filtros de año y década. El selector de año SHALL ofrecer solo
los años que tienen valoraciones. Si llegan año y década, el año SHALL mandar. Filtrar por
año con el orden "mejor nota" y `group=none` SHALL dar el ranking de ese año. Los filtros inválidos SHALL
responder `400` con código `VALIDATION_ERROR`. Con filtros sin resultados, la página SHALL
ofrecer limpiarlos.

#### Scenario: Top del año
- **WHEN** una persona filtra por el año 1987 con el orden "mejor nota" y sin agrupar
- **THEN** ve solo las valoraciones de discos y canciones de 1987, de la mejor a la peor nota

#### Scenario: Filtrar por estrellas y tipo
- **WHEN** filtra por 5 estrellas y tipo canción
- **THEN** ve solo sus canciones valoradas con 5 estrellas

#### Scenario: Buscar por título o artista
- **WHEN** escribe "floyd" en el buscador
- **THEN** ve solo las valoraciones cuyo título o artista principal contiene "floyd", y `counts`
  y el total reflejan esa búsqueda

#### Scenario: Canción sin año
- **WHEN** una canción valorada no está en ningún álbum con año de salida y la persona filtra por
  una década
- **THEN** esa canción no aparece, y sí aparece sin filtro de año

#### Scenario: Filtros sin resultados
- **WHEN** los filtros no tienen ninguna valoración
- **THEN** la página lo dice y ofrece "Limpiar filtros"

### Requirement: Edición en la fila
Cada entrada SHALL permitir abrir el diálogo de puntaje (`album-personal-panel`) con su
valoración, que permite afinar el puntaje, destacar o quitar de destacadas y borrar la nota. En
el modo Detallada la fila SHALL además permitir cambiar las estrellas con el control de selección
de estrellas de `rating-display`; en los modos Índice y Gráfico las estrellas SHALL cambiarse
solo desde el diálogo. Cambiar las estrellas SHALL conservar el puntaje solo si sigue siendo
coherente; si no, SHALL guardarse sin puntaje y avisar de forma accesible cuál se quitó. Tras
editar, la entrada SHALL actualizarse en el lugar sin reordenarse hasta que se cambie el orden o
los filtros, o se recargue la página. Borrar la nota SHALL quitar la entrada y actualizar el total
y el contador de su tipo.

#### Scenario: Cambiar estrellas conserva un puntaje coherente
- **WHEN** una persona con 4,5★ · 86 cambia las estrellas a 4,5 (sin cambio) o a 5★
- **THEN** con 4,5 nada cambia, y con 5★ se guarda sin puntaje y se avisa que se quitó el 86

#### Scenario: Afinar desde la fila
- **WHEN** la persona abre el diálogo desde una fila de 4★ y guarda 76
- **THEN** la fila muestra 4 estrellas y `76/100`, sin cambiar de posición

#### Scenario: Afinar desde la pared
- **WHEN** la persona abre el diálogo desde una carátula del modo Gráfico y guarda 76
- **THEN** el overlay de esa carátula muestra `76/100`, sin cambiar de posición

#### Scenario: Borrar desde la fila
- **WHEN** la persona confirma "Borrar nota" desde el diálogo de una fila
- **THEN** la fila desaparece y el total baja en uno

### Requirement: Marca "Sin afinar"
Las entradas sin puntaje detallado SHALL mostrar en lugar de `86/100` una marca atenuada "Sin
afinar" que a la vez SHALL ser la acción que abre el diálogo de puntaje, en los modos Detallada
e Índice y en el overlay del modo Gráfico. La marca SHALL existir solo en esta página.

#### Scenario: Fila sin puntaje
- **WHEN** una valoración de 4 estrellas no tiene puntaje detallado
- **THEN** su fila muestra las estrellas y "Sin afinar", y al activarla se abre el diálogo de
  puntaje

#### Scenario: Carátula sin puntaje
- **WHEN** esa misma valoración se ve en el modo Gráfico y se pasa el cursor sobre la carátula
- **THEN** el overlay muestra las estrellas y "Sin afinar", y al activarla se abre el diálogo de
  puntaje
