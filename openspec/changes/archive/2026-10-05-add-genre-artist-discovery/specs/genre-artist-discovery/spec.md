## ADDED Requirements

### Requirement: Artista conocido

Con sesión, un artista SHALL considerarse **conocido** para la persona cuando existe al menos una señal explícita suya:
lo sigue; valoró al artista o un álbum donde figura acreditado (principal o invitado); registró una escucha del artista
o de un álbum donde figura acreditado; o lo tiene en favoritos o pendientes, o tiene en ellos un álbum suyo. Sin sesión
ningún artista SHALL ser conocido y la interfaz SHALL NOT mostrar marcas, filtro ni exclusión por conocimiento. Las
señales de una persona SHALL NOT ser visibles para otras.

#### Scenario: Conocido por seguirlo

- **WHEN** la persona sigue a un artista del género
- **THEN** ese artista es conocido

#### Scenario: Conocido por un disco donde colabora

- **WHEN** la persona valoró un álbum donde el artista figura como invitado
- **THEN** ese artista es conocido

#### Scenario: Desconocido

- **WHEN** la persona no sigue al artista ni tiene valoraciones, escuchas, favoritos ni pendientes suyos
- **THEN** el artista no es conocido

#### Scenario: Visitante anónimo

- **WHEN** una persona sin sesión abre la pestaña Artistas
- **THEN** no ve ninguna marca de conocimiento ni el filtro «que aún no conozco»

### Requirement: Marcas personales en la tarjeta de artista

Con sesión, la tarjeta de un artista SHALL mostrar un botón **Seguir / Siguiendo** y, si el artista es conocido y la
persona no lo sigue, la etiqueta de texto **«Ya lo conoces»**. El botón SHALL alternar el seguimiento de forma
optimista, deshacer el cambio si la operación falla y no estar anidado dentro de un enlace. Sin sesión la tarjeta SHALL
NOT mostrar el botón ni la etiqueta.

#### Scenario: Seguir desde la tarjeta

- **WHEN** una persona con sesión pulsa «Seguir» en la tarjeta de un artista que no seguía
- **THEN** el botón pasa a «Siguiendo» y el artista queda seguido

#### Scenario: Fallo al seguir

- **WHEN** la operación de seguir falla
- **THEN** el botón vuelve a «Seguir»

#### Scenario: Conocido sin seguir

- **WHEN** la persona valoró un álbum del artista pero no lo sigue
- **THEN** la tarjeta muestra «Ya lo conoces» y el botón «Seguir»

### Requirement: Disco destacado del artista en el género

La tarjeta de artista SHALL mostrar, cuando exista, un **disco destacado**: entre los álbumes del artista como principal,
de categoría estudio o single/EP, que son del género o de sus subgéneros, el de mayor media de estrellas con al menos 3
valoraciones y, si ninguno llega a ese mínimo, el más reciente dando preferencia a los de estudio sobre los single/EP. SHALL mostrar su título y año y enlazarlo. Sin álbum
elegible la tarjeta SHALL NOT mostrar el bloque.

#### Scenario: Con comunidad suficiente

- **WHEN** un artista tiene dos álbumes del género, uno con media 4,5 sobre 3 valoraciones y otro más reciente sin valoraciones
- **THEN** el disco destacado es el de media 4,5

#### Scenario: Sin valoraciones

- **WHEN** ningún álbum del artista en el género llega a 3 valoraciones
- **THEN** el disco destacado es el más reciente

#### Scenario: Estudio antes que single

- **WHEN** ningún álbum llega a 3 valoraciones y el más reciente del artista es un single
- **THEN** el disco destacado es el álbum de estudio más reciente

#### Scenario: Sin álbum elegible

- **WHEN** los únicos álbumes del artista en el género son recopilaciones o directos
- **THEN** la tarjeta no muestra disco destacado

### Requirement: Discografía explorada y artista emergente

Un artista SHALL tener la **discografía explorada** solo cuando esta se recorrió entera. Sus **discos propios** son los
álbumes donde figura como artista principal de categoría estudio o single/EP. Para filtros, órdenes y el riel, un artista
SHALL tener **discografía corta** únicamente cuando su discografía está explorada y tiene entre 1 y 5 discos propios, y
**debut conocido** únicamente cuando está explorada, en cuyo caso el debut es el menor año de lanzamiento de sus discos
propios. Con la discografía sin explorar, o con 0 discos propios conocidos, el tamaño y el debut SHALL ser
**desconocidos**: el artista SHALL quedar fuera de `tam=corta`, del filtro por debut y del riel «Para descubrir», y al
final del orden `recientes`, sin inventar ni estimar un valor (ni con el año de inicio de la ficha ni con los álbumes ya
conocidos); seguirá apareciendo en el listado sin esos filtros.

#### Scenario: Discografía corta

- **WHEN** un artista con la discografía explorada tiene 3 discos propios
- **THEN** cumple `tam=corta`

#### Scenario: Las recopilaciones no cuentan

- **WHEN** un artista con la discografía explorada tiene 4 discos de estudio y 10 recopilaciones
- **THEN** su discografía es corta

#### Scenario: Sin explorar no es corta

- **WHEN** un artista nunca tuvo su discografía recorrida y no tiene ningún disco propio en el catálogo
- **THEN** no cumple `tam=corta` y su debut es desconocido

#### Scenario: Parcial no da debut

- **WHEN** un artista tiene 2 discos conocidos pero su discografía no se recorrió entera
- **THEN** su debut es desconocido y no aparece al filtrar por `debut=` ni en el riel

### Requirement: Discografía sin explorar en la tarjeta

Cuando la discografía de un artista no esté explorada, su tarjeta SHALL mostrar «Discografía sin explorar» en lugar de la
cantidad de álbumes del género, aunque el catálogo ya conozca algunos álbumes suyos (una cantidad parcial se leería como
el total). SHALL conservar el disco destacado si el catálogo conoce algún álbum suyo del género. Con la discografía
explorada la tarjeta SHALL mostrar la cantidad de álbumes del género.

#### Scenario: Artista sin explorar y sin álbumes

- **WHEN** la tarjeta es de un artista sin discografía explorada y sin álbumes en el catálogo
- **THEN** dice «Discografía sin explorar», no «0 álbumes» y no muestra disco destacado

#### Scenario: Sin explorar pero con álbumes conocidos

- **WHEN** la discografía del artista no está explorada pero el catálogo conoce 2 álbumes suyos del género
- **THEN** la tarjeta dice «Discografía sin explorar» y no «2 álbumes», y muestra su disco destacado

#### Scenario: Artista explorado

- **WHEN** la discografía del artista está explorada y tiene 2 álbumes del género
- **THEN** la tarjeta dice «2 álbumes del género»

### Requirement: Completar discografías al mostrar artistas

Al responder una página de género que muestra artistas (Resumen o pestaña Artistas), el sistema SHALL programar, después
de responder, la sincronización de la discografía de hasta 3 de los artistas mostrados cuya discografía no esté explorada
y tengan identificador de MusicBrainz, en orden de aparición y uno tras otro. Usará la sincronización completa existente
con su candado por artista y el límite de ritmo de MusicBrainz. La página SHALL NOT esperar esa sincronización, un fallo
SHALL registrarse sin afectar la respuesta y un artista cuya sincronización falló SHALL quedar pendiente. Cuando el riel «Para descubrir» del Resumen muestre menos de 8 artistas, el sistema SHALL programar además, con el
mismo tope y mecanismo, la de hasta 3 artistas del género con la discografía sin explorar y con identificador de
MusicBrainz, ordenados por álbumes del género descendente. Fuera de una request (scripts) el agendado SHALL omitirse sin error.

#### Scenario: Programa hasta 3

- **WHEN** una persona abre la pestaña Artistas y 10 de los 24 artistas mostrados tienen la discografía sin explorar
- **THEN** se programa la sincronización de los 3 primeros y la respuesta no espera

#### Scenario: El riel con pocos artistas completa discografías

- **WHEN** el Resumen muestra el riel «Para descubrir» con 3 artistas (menos de 8) y el género tiene artistas sin explorar
- **THEN** se programa, sin esperar, la sincronización de hasta 3 artistas del género sin explorar, los de más álbumes del género

#### Scenario: El riel lleno no completa

- **WHEN** el riel muestra 8 artistas
- **THEN** no programa ninguna sincronización por el riel

#### Scenario: Todos explorados

- **WHEN** todos los artistas mostrados tienen la discografía explorada
- **THEN** no se programa ninguna sincronización

#### Scenario: Wikimedia o MusicBrainz caído

- **WHEN** una sincronización programada falla
- **THEN** la página ya respondió con normalidad y el artista queda pendiente para otra visita

### Requirement: Riel «Para descubrir»

El Resumen SHALL mostrar el riel «Para descubrir» con hasta 8 artistas del género o de sus subgéneros que tengan
discografía corta y debut conocido y, con sesión, no sean conocidos. El orden SHALL ser: primero los artistas con algún
álbum del género con al menos 3 valoraciones y media de 3,5 o más; luego por cantidad de seguidores descendente; luego por
debut más reciente; luego por nombre. El orden SHALL ser el mismo para todas las personas con las mismas acciones (sin
aleatoriedad ni afinidad). Con sesión, el riel SHALL mostrar el subtítulo **«Sin los artistas que ya conoces»**. SHALL
ofrecer «Ver todo →» hacia `?tab=artists&orden=descubrir&tam=corta` (más `conocidos=no` con sesión, de modo que la
exclusión sea explícita en la URL y reversible) y SHALL omitirse si hay menos de 4 artistas elegibles. Un anónimo SHALL
verlo sin exclusión por conocimiento y sin subtítulo.

#### Scenario: Excluye lo conocido y lo dice

- **WHEN** una persona con sesión sigue a una de las bandas que cumplirían las reglas
- **THEN** esa banda no aparece en su riel, el riel dice «Sin los artistas que ya conoces» y la banda sí aparece en el riel de un anónimo

#### Scenario: Prioriza la señal de comunidad

- **WHEN** dos artistas elegibles difieren en que solo uno tiene un álbum del género con media 4,2 sobre 5 valoraciones
- **THEN** ese artista aparece primero

#### Scenario: Sin elegibles suficientes

- **WHEN** hay solo 3 artistas elegibles
- **THEN** el Resumen no muestra el riel

#### Scenario: Ver todo

- **WHEN** una persona con sesión pulsa «Ver todo →»
- **THEN** llega a la pestaña Artistas ordenada por `descubrir` con `tam=corta` y `conocidos=no`, y puede quitar ese filtro
