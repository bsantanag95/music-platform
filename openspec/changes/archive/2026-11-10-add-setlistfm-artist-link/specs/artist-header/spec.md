## MODIFIED Requirements

### Requirement: Ficha del artista

La cabecera SHALL mostrar una ficha con estas filas, omitiendo las que no tienen dato:

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
