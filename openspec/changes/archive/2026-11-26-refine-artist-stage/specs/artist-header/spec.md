## MODIFIED Requirements

### Requirement: Ficha del artista

La cabecera SHALL mostrar una ficha compacta en tres líneas como mucho, separadas por `·`: la primera con los géneros, el tipo de
artista («Banda», «Solista»…) y los datos de identidad; la segunda con la alineación, los premios y la comunidad; la tercera con
Enlaces y En vivo. Cada fila SHALL conservar su rótulo para lectores de pantalla; las filas cuyo valor solo no se entiende
(**Primer disco**, **Fallecimiento**) SHALL mostrar además su rótulo a la vista. La ficha SHALL incluir estas filas, omitiendo las
que no tienen dato:

- Grupos: **Origen** (lugar de formación, traducido y con país) y **Actividad** (año de
  formación, año de separación si terminó, y estado "Activa" o "Separada").
- Personas: **Nacimiento** (fecha con su precisión y lugar de nacimiento con país),
  **Fallecimiento** si terminó, y **Primer disco** con el año del primer lanzamiento de su
  discografía propia (no "Actividad": es lo único que se sabe).
- Grupos: **Integrantes** (o **Última alineación** si el grupo terminó) con hasta 3 nombres
  de ese bloque de la alineación, en su orden y enlazados, «y N más» si hay más, y un enlace "Ver alineación" a la
  sub-vista Actual de la pestaña Integrantes.
- Personas: **Bandas** con hasta 3 grupos (actuales primero, luego antiguos del más reciente
  al más antiguo), enlazados, «y N más» si hay más, y un enlace "Ver todas" a la pestaña Bandas.
- **Enlaces**: sitio oficial, Bandcamp, Wikipedia (el artículo del idioma de lectura) y la
  plataforma de streaming, en ese orden fijo. Cada enlace externo SHALL marcarse como tal (`↗`),
  SHALL NOT usar el color de acento y SHALL NOT llevar subrayado permanente. El enlace a setlist.fm no va en esta fila.
- Grupos y personas: **En vivo**, después de Enlaces, con "Conciertos en setlist.fm ↗": la
  página del artista en setlist.fm si está guardada, o si no la búsqueda del artista por nombre
  en setlist.fm. Artistas de otro tipo (varios, desconocido) SHALL NOT mostrar la fila.

#### Scenario: Grupo separado

- **WHEN** una persona abre Pink Floyd en español
- **THEN** la ficha muestra "Origen: Londres, Reino Unido" y "Actividad: 1965 – 2014 ·
  Separada"

#### Scenario: Grupo activo con pocos datos

- **WHEN** un grupo solo tiene año de formación 2003 y país
- **THEN** la ficha muestra "Actividad: desde 2003 · Activa" y el origen con el país

#### Scenario: Solista

- **WHEN** una persona abre a Mon Laferte en español
- **THEN** la ficha muestra "Nacimiento: 2 de mayo de 1983 · Viña del Mar, Chile" y, a la vista, «Primer disco» con el año de su
  primer lanzamiento, sin fila "Actividad"

#### Scenario: Enlaces en orden fijo

- **WHEN** un artista tiene Spotify, sitio oficial y artículo de Wikipedia
- **THEN** la fila Enlaces muestra "Sitio oficial ↗ · Wikipedia ↗ · Spotify ↗"

#### Scenario: Alineación actual en la ficha

- **WHEN** una persona abre Mötley Crüe
- **THEN** la ficha muestra "Integrantes: Vince Neil, Tommy Lee, Nikki Sixx y 2 más · Ver alineación", con cada nombre enlazado

#### Scenario: Grupo sin alineación actual

- **WHEN** un grupo activo no tiene integrantes actuales
- **THEN** la ficha no muestra la fila Integrantes

#### Scenario: En vivo con página en setlist.fm

- **WHEN** una persona abre un grupo con su página de setlist.fm guardada
- **THEN** la ficha muestra "En vivo: Conciertos en setlist.fm ↗" enlazado a esa página, en una pestaña nueva

#### Scenario: En vivo sin página guardada

- **WHEN** un solista no tiene enlace de setlist.fm guardado
- **THEN** la fila En vivo enlaza a la búsqueda de su nombre en setlist.fm

#### Scenario: Artista de tipo varios

- **WHEN** una persona abre "Various Artists"
- **THEN** la ficha no muestra la fila En vivo

### Requirement: Portada de carátulas

La cabecera SHALL ocupar todo el ancho de la ventana con un fondo hecho de las carátulas de la discografía principal del artista
(miniaturas de 250 px, nunca la resolución completa), en el orden de la discografía y sin repetir disco salvo para llenar el muro:

- Con **8 o más** carátulas, un muro de carátulas atenuado.
- Con **1 a 7**, el color desenfocado de la carátula del último trabajo de fondo y hasta 5 fundas en abanico a un lado, de la más
  reciente (al frente) a la más antigua; con una sola, un disco asoma de la funda. La carátula que ya se usa como retrato SHALL NOT
  repetirse en el abanico; si no queda otra, se dibuja el disco solo.
- **Sin carátulas**, un fondo de tinta con un disco dibujado.

Cuando a la discografía principal le faltan carátulas por resolver para llenar la portada (menos de 8 resueltas, o menos que sus
discos si tiene menos de 8), la página SHALL resolver al cargar hasta 12 de las que faltan, de la más reciente a la más antigua, con
un tiempo de espera acotado; las que no lleguen a tiempo SHALL terminar de resolverse después de responder. El fondo SHALL ser
decorativo (oculto para lectores de pantalla) y el texto de la cabecera SHALL leerse con contraste suficiente sobre él. La página
SHALL NOT desbordar en horizontal en ningún caso.

#### Scenario: Muchas carátulas

- **WHEN** una persona abre Iron Maiden, con 17 álbumes con carátula
- **THEN** la cabecera muestra un muro de carátulas de Iron Maiden detrás del nombre

#### Scenario: Dos carátulas

- **WHEN** un artista con foto tiene dos discos con carátula
- **THEN** el fondo toma el color del más reciente y las dos fundas aparecen en abanico, con el más reciente al frente, sin
  celdas vacías ni repetidas

#### Scenario: Una carátula

- **WHEN** un artista con foto tiene un solo disco con carátula
- **THEN** la funda aparece con el disco asomando

#### Scenario: Sin carátulas

- **WHEN** un artista no tiene ningún disco con carátula
- **THEN** la cabecera muestra el disco dibujado sobre tinta

#### Scenario: Teléfono

- **WHEN** una persona abre un artista con dos carátulas en 390 px
- **THEN** el abanico queda junto al retrato, sin tapar el nombre ni la ficha, y la página no desborda

#### Scenario: Retrato con carátula

- **WHEN** un artista sin foto tiene un solo disco con carátula
- **THEN** el retrato es esa carátula y el fondo toma su color con el disco dibujado, sin repetir la funda

#### Scenario: Carátulas sin resolver

- **WHEN** una persona abre por primera vez un artista con 20 discos en Principal y una sola carátula resuelta
- **THEN** la página resuelve las carátulas que faltan de sus discos más recientes antes de responder, dentro del tiempo acotado, y
  la portada muestra el muro si llegan a 8
