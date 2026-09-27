## ADDED Requirements

### Requirement: Foto con crédito

La cabecera SHALL mostrar la foto del artista en formato rectangular 4:3 (no circular), a lo
sumo a 200 px de ancho en escritorio y a 96 px en móvil, junto al nombre. Debajo de la foto
SHALL mostrarse el crédito que exige la licencia: autor y licencia, enlazados a la página del
archivo en Commons y al texto de la licencia. Sin foto, SHALL mostrarse el placeholder
visual del catálogo en el mismo formato. La página SHALL NOT mostrar una imagen de portada.

#### Scenario: Foto con licencia CC BY-SA

- **WHEN** el artista tiene una foto de Carolina Gatica con licencia CC BY-SA 4.0
- **THEN** la cabecera muestra la foto 4:3 y debajo "Foto: Carolina Gatica · CC BY-SA 4.0",
  con ambos enlaces

#### Scenario: Sin foto

- **WHEN** el artista no tiene foto
- **THEN** la cabecera muestra el placeholder 4:3 y ningún crédito

### Requirement: Identidad del artista

La cabecera SHALL mostrar el antetítulo de tipo traducido (banda, solista, etc.), el nombre
del artista y, debajo, la descripción corta de Wikidata en el idioma de la interfaz. Sin
descripción en ese idioma, la línea SHALL omitirse. La cabecera SHALL NOT mostrar la
desambiguación de MusicBrainz ni el nombre legal.

#### Scenario: Descripción traducida

- **WHEN** una persona abre Pink Floyd en español
- **THEN** ve "BANDA", "Pink Floyd" y "banda de rock británica"

#### Scenario: Sin descripción

- **WHEN** el artista no tiene descripción en el idioma de la interfaz
- **THEN** la cabecera muestra tipo y nombre, sin una línea vacía

### Requirement: Ficha del artista

La cabecera SHALL mostrar una ficha con estas filas, omitiendo las que no tienen dato:

- Grupos: **Origen** (lugar de formación, traducido y con país) y **Actividad** (año de
  formación, año de separación si terminó, y estado "Activa" o "Separada").
- Personas: **Nacimiento** (fecha con su precisión y lugar de nacimiento con país),
  **Fallecimiento** si terminó, y **Actividad** desde el año del primer lanzamiento de su
  discografía propia.
- **Enlaces**: sitio oficial, Bandcamp, Wikipedia (el artículo del idioma de lectura) y la
  plataforma de streaming, en ese orden fijo.

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
  actividad desde el año de su primer lanzamiento

#### Scenario: Enlaces en orden fijo

- **WHEN** un artista tiene Spotify, sitio oficial y artículo de Wikipedia
- **THEN** la fila Enlaces muestra "Sitio oficial · Wikipedia · Spotify"

### Requirement: Resumen de la biografía

La cabecera SHALL mostrar el resumen de Wikipedia recortado a tres líneas, con una acción
"Seguir leyendo" que lleva a la pestaña Biografía, y la atribución visible "Fuente:
Wikipedia · CC BY-SA 4.0" con enlaces al artículo y a la licencia. Cuando el resumen está en
otro idioma que la interfaz, SHALL indicarlo ("Resumen en español"). Sin resumen, el bloque
SHALL omitirse.

#### Scenario: Resumen en el idioma de la interfaz

- **WHEN** una persona abre en español un artista con artículo en la Wikipedia en español
- **THEN** ve tres líneas del resumen, "Seguir leyendo" y la atribución

#### Scenario: Resumen en otro idioma

- **WHEN** una persona abre en inglés un artista que solo tiene artículo en español
- **THEN** ve el resumen en español con la indicación de su idioma

#### Scenario: Sin resumen

- **WHEN** el artista no tiene resumen
- **THEN** la cabecera no muestra el bloque ni "Seguir leyendo"
