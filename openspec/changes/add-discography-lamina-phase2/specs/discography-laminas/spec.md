## MODIFIED Requirements

### Requirement: Página de discografía de una persona
`/users/<u>/artist/<id>` SHALL mostrar los discos de la sección principal del artista, más las secciones que su dueño eligió, que la persona valoró, en orden cronológico, con su nota y una curva de la
carrera. La nota SHALL ser la detallada si existe y, si no, las estrellas, mostradas como estrellas: el sistema SHALL NOT mostrar un número inventado. La página
SHALL existir desde 3 discos valorados, o desde el umbral de la vista Por canción, y SHALL reflejar siempre las notas vigentes. El dueño SHALL ver cuántos discos le
faltan si no llega a ninguna de las dos.

#### Scenario: Con cinco discos valorados
- **WHEN** una seguidora abre la página de una persona con 5 discos valorados de un artista
- **THEN** ve esos 5 discos por año, con su nota, y la curva

#### Scenario: Solo estrellas
- **WHEN** un disco tiene 4 estrellas y ningún puntaje detallado
- **THEN** la página muestra las estrellas y no un número

#### Scenario: Pocos discos
- **WHEN** una seguidora abre la página de una persona con 2 discos valorados
- **THEN** la respuesta es `404`

#### Scenario: Pocos discos, el dueño
- **WHEN** el dueño abre su página con 2 discos valorados
- **THEN** ve que le falta 1

#### Scenario: Nota nueva
- **WHEN** el dueño valora otro disco del artista
- **THEN** la página lo incluye sin ningún otro gesto

#### Scenario: Secciones elegidas
- **WHEN** el dueño suma En vivo y valoró 2 discos en vivo
- **THEN** la vista Por disco los incluye en su lugar cronológico

## ADDED Requirements

### Requirement: Vista Por canción
La discografía SHALL ofrecer una vista Por canción: una columna por disco, en orden cronológico, y una fila por número de pista de su edición representativa, con
la nota de cada canción en su celda y la nota del disco arriba. Una pista sin valorar SHALL ser una celda vacía, nunca un 0. Entran los discos de las secciones
mostradas con alguna valoración, del disco o de sus canciones. La vista SHALL ofrecerse desde 10 canciones valoradas repartidas en al menos 2 discos; con menos,
la página SHALL mostrar solo la vista Por disco. La grilla SHALL leerse como tabla para un lector de pantalla.

#### Scenario: Con suficientes canciones
- **WHEN** una persona valoró 12 canciones de 3 discos
- **THEN** la vista Por canción está disponible y cada canción valorada aparece en su celda

#### Scenario: Pocas canciones
- **WHEN** una persona valoró 8 canciones
- **THEN** la página no ofrece la vista Por canción

#### Scenario: Disco solo con canciones
- **WHEN** un disco no tiene nota pero tiene canciones valoradas
- **THEN** aparece en la vista Por canción, sin nota arriba, y no en la vista Por disco

#### Scenario: Pista sin valorar
- **WHEN** una pista no tiene nota
- **THEN** su celda queda vacía, con borde

### Requirement: Preferencias del dueño
El dueño SHALL poder elegir, por artista, si suma las secciones En vivo y Recopilatorios y qué vista se muestra por defecto. La página y la imagen compartida SHALL
mostrar lo que eligió. Un visitante SHALL poder cambiar de vista en la página sin guardar nada. Si la vista elegida es Por canción y no llega al umbral, la página y
la imagen SHALL mostrar la vista Por disco. Las preferencias SHALL guardarse aunque la discografía no esté compartida y SHALL conservarse al quitar la marca.

#### Scenario: Vista por defecto
- **WHEN** el dueño elige Por canción y un anónimo abre su discografía compartida
- **THEN** ve la vista Por canción y la imagen también la muestra

#### Scenario: Cambiar de vista como visitante
- **WHEN** una seguidora pasa a Por disco
- **THEN** la página cambia y las preferencias del dueño no

#### Scenario: Sección inválida
- **WHEN** se piden las preferencias con la sección `singles`
- **THEN** la API responde `400` con `VALIDATION_ERROR`

### Requirement: Lámina de álbum
`/users/<u>/artist/<id>?disco=<album>` SHALL mostrar las pistas de ese disco como barras con su nota, desde 3 canciones valoradas, con las mismas reglas de quién
mira que la discografía. El disco SHALL estar entre los mostrados; si no, o si no llega al umbral para un visitante, la respuesta SHALL ser `404`.

#### Scenario: Álbum con canciones valoradas
- **WHEN** una seguidora abre un disco con 5 canciones valoradas
- **THEN** ve sus pistas con la nota de cada una y las demás vacías

#### Scenario: Disco ajeno
- **WHEN** alguien abre `?disco=` con un disco de otro artista
- **THEN** la respuesta es `404`

#### Scenario: Con la marca
- **WHEN** un anónimo abre la Lámina de álbum de una discografía compartida
- **THEN** la ve, sin una marca aparte
