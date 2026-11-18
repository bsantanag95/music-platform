## ADDED Requirements

### Requirement: Horario de lanzamientos en Inicio

En la portada sin sesión, la selección anónima SHALL presentarse como un horario en dos
partes, «Recientes» y «Próximos», cada una ordenada por fecha (de la más reciente a la más
antigua en «Recientes» y de la más cercana a la más lejana en «Próximos»), con una fila por
disco que muestra la fecha, la carátula en miniatura, el título, el artista y su estado
(publicado o próximo), y que enlaza a la página del disco. Cada parte SHALL mostrar al
principio como máximo seis discos y SHALL ofrecer ver el resto de su parte sin salir de la
página. Desde anchos de escritorio las dos partes SHALL ir lado a lado; en pantallas
angostas, una debajo de la otra. La selección, sus filtros y sus topes NO SHALL cambiar. El
Inicio con sesión SHALL usar el mismo horario, con el selector de vistas (ver Requirement:
Selector del riel con sesión).

#### Scenario: Horario en escritorio
- **WHEN** un visitante sin sesión abre `/[locale]` en una pantalla de 1440 px y hay
  lanzamientos recientes y próximos
- **THEN** ve «Recientes» y «Próximos» lado a lado, cada fila con su fecha, título,
  artista y estado, ordenadas por fecha

#### Scenario: Más de seis discos en una parte
- **WHEN** la selección anónima tiene 12 lanzamientos recientes
- **THEN** «Recientes» muestra seis y ofrece ver los otros seis en la misma página

#### Scenario: Solo próximos
- **WHEN** la selección anónima no tiene lanzamientos recientes pero sí próximos
- **THEN** el horario muestra solo «Próximos», sin una parte vacía

#### Scenario: El Inicio con sesión usa el horario con selector
- **WHEN** un usuario autenticado abre `/[locale]`
- **THEN** los lanzamientos se muestran en el horario de dos partes con el selector «De tus
  artistas | Populares», sin flechas sobre las carátulas

## MODIFIED Requirements

### Requirement: Selector del riel con sesión
Con sesión, el apartado de lanzamientos SHALL presentarse como el horario en dos partes de la portada
sin sesión (ver Requirement: Horario de lanzamientos en Inicio) y SHALL ofrecer un
selector con dos vistas: "De tus artistas" (selección personal) y "Populares" (selección anónima). Las dos vistas NO SHALL mezclar sus discos ni usar marcas de relleno. El
riel SHALL abrir en "De tus artistas" cuando esta tiene al menos 3 discos y, si no, en "Populares". Cuando
"De tus artistas" tiene menos de 3 discos, el riel SHALL mostrar una invitación a seguir artistas (o
valorarlos y agregarlos a favoritos) con un enlace a la búsqueda. Si "De tus artistas" está vacía y se
selecciona, SHALL mostrar solo la invitación. Si "Populares" está vacía, el selector SHALL ocultarse. Si ambas
vistas están vacías, el apartado SHALL ocultarse. Sin sesión, el riel SHALL mostrar solo la selección
anónima, sin selector.

#### Scenario: Abre en lo personal
- **WHEN** un usuario con 5 discos en "De tus artistas" abre Inicio
- **THEN** el riel abre en "De tus artistas", sin invitación, y puede cambiar a "Populares"

#### Scenario: Pocos discos propios
- **WHEN** un usuario con 1 disco en "De tus artistas" abre Inicio
- **THEN** el riel abre en "Populares" y muestra la invitación a seguir artistas

#### Scenario: Visitante sin sesión
- **WHEN** un visitante sin sesión abre Inicio
- **THEN** el riel muestra la selección anónima sin selector

## REMOVED Requirements

### Requirement: Horario de lanzamientos en la portada sin sesión
**Reason**: El horario deja de ser exclusivo de la portada sin sesión: el Inicio con sesión también lo usa, con el selector de vistas
(redesign-signed-in-home-phase3), así que el escenario «El Inicio con sesión conserva el riel» ya no es cierto.
**Migration**: Mismo contenido bajo Requirement: Horario de lanzamientos en Inicio, con el escenario del Inicio con sesión
actualizado.
