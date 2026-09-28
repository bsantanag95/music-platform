## MODIFIED Requirements

### Requirement: Ficha del artista

La cabecera SHALL mostrar una ficha con estas filas, omitiendo las que no tienen dato:

- Grupos: **Origen** (lugar de formación, traducido y con país) y **Actividad** (año de
  formación, año de separación si terminó, y estado "Activa" o "Separada").
- Personas: **Nacimiento** (fecha con su precisión y lugar de nacimiento con país),
  **Fallecimiento** si terminó, y **Actividad** desde el año del primer lanzamiento de su
  discografía propia.
- Grupos: **Integrantes** (o **Última alineación** si el grupo terminó) con hasta 5 nombres
  de ese bloque de la alineación, en su orden y enlazados, y un enlace "Ver alineación" a la
  sub-vista Actual de la pestaña Integrantes.
- Personas: **Bandas** con hasta 5 grupos (actuales primero, luego antiguos del más reciente
  al más antiguo), enlazados, y un enlace "Ver todas" a la pestaña Bandas.
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

#### Scenario: Alineación actual en la ficha

- **WHEN** una persona abre Mötley Crüe
- **THEN** la ficha muestra "Integrantes: Vince Neil, Tommy Lee, Nikki Sixx, John 5, DJ Larceny ·
  Ver alineación", con cada nombre enlazado

#### Scenario: Grupo sin alineación actual

- **WHEN** un grupo activo no tiene integrantes actuales
- **THEN** la ficha no muestra la fila Integrantes
