## MODIFIED Requirements

### Requirement: Foto con crédito

La cabecera SHALL mostrar la foto del artista como retrato **circular** junto al nombre, de 148 px en escritorio y 96 px en
móvil. El crédito que exige la licencia (autor y licencia, enlazados a la página del archivo en Commons y al texto de la licencia)
SHALL mostrarse en la portada, en la esquina inferior derecha. Sin foto, el retrato SHALL ser la carátula del disco mejor valorado
de la discografía principal o, si no lo hay, la del disco principal más reciente con carátula, en formato cuadrado y enlazada a ese
disco, sin crédito. Sin foto ni carátulas, el retrato SHALL mostrar las iniciales del nombre.

#### Scenario: Foto con licencia CC BY-SA

- **WHEN** el artista tiene una foto de Carolina Gatica con licencia CC BY-SA 4.0
- **THEN** la cabecera muestra la foto en un círculo y en la portada "Foto: Carolina Gatica · CC BY-SA 4.0", con ambos enlaces

#### Scenario: Sin foto, con carátulas

- **WHEN** el artista no tiene foto y su disco mejor valorado tiene carátula
- **THEN** el retrato es esa carátula en cuadrado, enlazada al disco, y no hay crédito de foto

#### Scenario: Sin foto ni carátulas

- **WHEN** el artista no tiene foto ni ningún disco con carátula
- **THEN** el retrato muestra sus iniciales y no hay crédito de foto

### Requirement: Identidad del artista

La cabecera SHALL mostrar el nombre del artista como título principal y, debajo, la descripción corta de Wikidata en el idioma de
la interfaz. Sin descripción en ese idioma, la línea SHALL omitirse. El tipo de artista traducido SHALL mostrarse en la ficha, no
como antetítulo. La cabecera SHALL NOT mostrar la desambiguación de MusicBrainz ni el nombre legal.

#### Scenario: Descripción traducida

- **WHEN** una persona abre Pink Floyd en español
- **THEN** ve "Pink Floyd", "banda de rock británica" y la ficha empieza con "Banda"

#### Scenario: Sin descripción

- **WHEN** el artista no tiene descripción en el idioma de la interfaz
- **THEN** la cabecera muestra el nombre y la ficha, sin una línea vacía

### Requirement: Ficha del artista

La cabecera SHALL mostrar una ficha compacta en dos líneas separadas por `·`: la primera con los géneros, el tipo de artista
(«Banda», «Solista»…), los datos de identidad, la alineación, los premios y la comunidad; la segunda con Enlaces y En vivo. Cada
fila SHALL conservar su rótulo para lectores de pantalla, aunque no se muestre. La ficha SHALL incluir estas filas, omitiendo las
que no tienen dato:

- Grupos: **Origen** (lugar de formación, traducido y con país) y **Actividad** (año de
  formación, año de separación si terminó, y estado "Activa" o "Separada").
- Personas: **Nacimiento** (fecha con su precisión y lugar de nacimiento con país),
  **Fallecimiento** si terminó, y **Primer disco** con el año del primer lanzamiento de su
  discografía propia (no "Actividad": es lo único que se sabe).
- Grupos: **Integrantes** (o **Última alineación** si el grupo terminó) con hasta 5 nombres
  de ese bloque de la alineación, en su orden y enlazados, y un enlace "Ver alineación" a la
  sub-vista Actual de la pestaña Integrantes.
- Personas: **Bandas** con hasta 5 grupos (actuales primero, luego antiguos del más reciente
  al más antiguo), enlazados, y un enlace "Ver todas" a la pestaña Bandas.
- **Enlaces**: sitio oficial, Bandcamp, Wikipedia (el artículo del idioma de lectura) y la
  plataforma de streaming, en ese orden fijo. Cada enlace externo SHALL marcarse como tal (`↗`)
  y SHALL NOT usar el color de acento. El enlace a setlist.fm no va en esta fila.
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
- **THEN** la ficha muestra "Nacimiento: 2 de mayo de 1983 · Viña del Mar, Chile" y la
  "Primer disco" con el año de su primer lanzamiento, sin fila "Actividad"

#### Scenario: Enlaces en orden fijo

- **WHEN** un artista tiene Spotify, sitio oficial y artículo de Wikipedia
- **THEN** la fila Enlaces muestra "Sitio oficial ↗ · Wikipedia ↗ · Spotify ↗"

#### Scenario: Alineación actual en la ficha

- **WHEN** una persona abre Mötley Crüe
- **THEN** la ficha muestra "Integrantes: Vince Neil, Tommy Lee, Nikki Sixx, John 5, DJ Larceny ·
  Ver alineación", con cada nombre enlazado

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

## ADDED Requirements

### Requirement: Portada de carátulas

La cabecera SHALL ocupar todo el ancho de la ventana con un fondo hecho de las carátulas de la discografía principal del artista
(miniaturas de 250 px, nunca la resolución completa), en el orden de la discografía y sin repetir disco salvo para llenar el muro:

- Con **8 o más** carátulas, un muro de carátulas atenuado.
- Con **1 a 7**, el color desenfocado de la primera carátula de fondo y hasta 5 fundas en abanico a un lado; con una sola, un disco
  asoma de la funda.
- **Sin carátulas**, un fondo de tinta con un disco dibujado.

El fondo SHALL ser decorativo (oculto para lectores de pantalla) y el texto de la cabecera SHALL leerse con contraste suficiente
sobre él. La página SHALL NOT desbordar en horizontal en ningún caso.

#### Scenario: Muchas carátulas

- **WHEN** una persona abre Iron Maiden, con 17 álbumes con carátula
- **THEN** la cabecera muestra un muro de carátulas de Iron Maiden detrás del nombre

#### Scenario: Dos carátulas

- **WHEN** un artista tiene dos discos con carátula
- **THEN** el fondo toma el color de la primera y las dos fundas aparecen en abanico, sin celdas vacías ni repetidas

#### Scenario: Una carátula

- **WHEN** un artista tiene un solo disco con carátula
- **THEN** la funda aparece con el disco asomando

#### Scenario: Sin carátulas

- **WHEN** un artista no tiene ningún disco con carátula
- **THEN** la cabecera muestra el disco dibujado sobre tinta

#### Scenario: Teléfono

- **WHEN** una persona abre un artista con dos carátulas en 390 px
- **THEN** el abanico queda junto al retrato, sin tapar el nombre ni la ficha, y la página no desborda

## REMOVED Requirements

### Requirement: Resumen de la biografía

**Reason**: la cabecera se compacta (propuesta D · Mezcla); el resumen recortado repetía el comienzo de la pestaña Biografía.

**Migration**: la pestaña Biografía muestra el texto completo con su atribución y el enlace a Wikipedia sigue en la línea de
enlaces de la ficha.
