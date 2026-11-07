## MODIFIED Requirements

### Requirement: Página de discografía de una persona
`/users/<u>/artist/<id>` SHALL mostrar los discos de la sección principal del artista, más las secciones que su dueño eligió, que la persona valoró, en orden cronológico, con su nota y una curva de la
carrera. La nota SHALL ser la detallada si existe y, si no, las estrellas, mostradas como estrellas: el sistema SHALL NOT mostrar un número inventado. La página
SHALL existir desde 3 discos valorados, o desde el umbral de la vista Por canción, y SHALL reflejar siempre las notas vigentes. Para el dueño SHALL existir
siempre, también sin valoraciones, y SHALL decirle cuántos discos le faltan si no llega a ninguna de las dos.

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

#### Scenario: Dueño sin valoraciones
- **WHEN** una persona abre su discografía de un artista del que no valoró nada
- **THEN** la página existe para ella y le ofrece valorar lo que falta

### Requirement: Lámina de álbum
`/users/<u>/artist/<id>?disco=<album>` SHALL mostrar las pistas de ese disco como barras con su nota, desde 3 canciones valoradas, con las mismas reglas de quién
mira que la discografía. Para el dueño SHALL existir con cualquier disco mostrado, también sin canciones valoradas, con lo que le falta. El disco SHALL estar entre los mostrados; si no, o si no llega al umbral para un visitante, la respuesta SHALL ser `404`.

#### Scenario: Álbum con canciones valoradas
- **WHEN** una seguidora abre un disco con 5 canciones valoradas
- **THEN** ve sus pistas con la nota de cada una y las demás vacías

#### Scenario: Disco ajeno
- **WHEN** alguien abre `?disco=` con un disco de otro artista
- **THEN** la respuesta es `404`

#### Scenario: Con la marca
- **WHEN** un anónimo abre la Lámina de álbum de una discografía compartida
- **THEN** la ve, sin una marca aparte

#### Scenario: Dueño sin canciones valoradas
- **WHEN** el dueño abre la Lámina de un álbum del que no valoró ninguna canción
- **THEN** la ve con sus pistas, cada una con sus estrellas, y lo que le falta para que se vea

## ADDED Requirements

### Requirement: Valora lo que falta
`?valorar=1` en la discografía propia SHALL listar los discos de las secciones mostradas que no tienen nota, en orden cronológico, cada uno con el control de
estrellas de siempre. Cada elección SHALL guardarse al instante con la API de valoraciones, sin un envío aparte. En la Lámina de un álbum, el dueño SHALL ver ese
control en cada canción sin nota. Para un visitante, el parámetro SHALL ignorarse. La discografía propia SHALL enlazar a este modo mientras queden discos sin nota.

#### Scenario: Valorar un disco
- **WHEN** el dueño elige 4 estrellas en un disco de la lista
- **THEN** se guarda la valoración y el disco aparece en su discografía al volver

#### Scenario: Visitante con el parámetro
- **WHEN** una seguidora abre la discografía con `?valorar=1`
- **THEN** ve la discografía como siempre, sin controles

#### Scenario: Canciones del álbum
- **WHEN** el dueño abre la Lámina de un álbum con canciones sin nota
- **THEN** cada una tiene sus estrellas y las valoradas muestran su nota

### Requirement: Arma la tuya en una discografía
La discografía de otra persona SHALL ofrecer "Arma la tuya" a quien no es su dueño. Con sesión SHALL llevar a `/users/<yo>/artist/<id>?valorar=1`. Sin sesión SHALL
llevar al registro, con enlace al login, con la intención `discografia=<id>`; después de registrarse o de iniciar sesión, con contraseña o con Google, la persona SHALL
llegar a su discografía de ese artista en el modo para valorar. El destino SHALL armarse en el código con el usuario autenticado; un valor que no sea un identificador
SHALL descartarse.

#### Scenario: Visitante anónimo
- **WHEN** una persona sin sesión abre una discografía compartida
- **THEN** ve el llamado que lleva al registro con `discografia=<id>`

#### Scenario: Registro con la intención
- **WHEN** una persona se registra desde `/auth/register?discografia=<id>`
- **THEN** llega a `/<locale>/users/<su-usuario>/artist/<id>?valorar=1`, no a `/welcome`

#### Scenario: Dueño
- **WHEN** el dueño abre su discografía
- **THEN** no ve el llamado
