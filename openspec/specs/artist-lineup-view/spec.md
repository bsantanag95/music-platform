# artist-lineup-view Specification

## Purpose
Presentar la alineación de un artista al estilo de Metal-Archives: la pestaña Integrantes de un grupo (la línea de tiempo «La banda a lo largo del tiempo», sub-vistas Completa, Actual o Última alineación, Antiguos y Apoyo, con instrumentos por período y las otras bandas de cada integrante en una línea colapsable) y la pestaña Bandas de una persona.
## Requirements
### Requirement: Pestaña Integrantes de un grupo

La página de un grupo SHALL ofrecer la pestaña Integrantes con sub-vistas enlazables por URL:
Completa (por defecto), Actual, Antiguos y Apoyo. Completa SHALL agrupar, en este orden, Actual,
Antiguos, Músicos de apoyo actuales y Músicos de apoyo anteriores; Apoyo SHALL mostrar los dos
bloques de apoyo. En un grupo que terminó, Actual SHALL llamarse "Última alineación". Una
sub-vista sin personas SHALL ocultarse, y si solo una tiene contenido no SHALL mostrarse la barra
de sub-vistas. Un valor de sub-vista desconocido SHALL mostrar Completa.

#### Scenario: Banda activa

- **WHEN** una persona abre la pestaña Integrantes de Mötley Crüe
- **THEN** ve la sub-vista Completa con los bloques Actual, Antiguos y Músicos de apoyo
  anteriores, y la barra Completa · Actual · Antiguos · Apoyo

#### Scenario: Enlace a una sub-vista

- **WHEN** una persona abre la URL de la sub-vista Antiguos
- **THEN** ve solo el bloque Antiguos con la sub-vista Antiguos marcada como actual

#### Scenario: Banda separada

- **WHEN** una persona abre la pestaña Integrantes de Pink Floyd
- **THEN** el primer bloque y su sub-vista se llaman "Última alineación"

#### Scenario: Sin músicos de apoyo

- **WHEN** un grupo no tiene músicos de apoyo
- **THEN** la barra no muestra Apoyo

### Requirement: Fila de integrante

Cada fila SHALL mostrar el nombre enlazado a la página de la persona, la marca de fundador, el
año de muerte si la persona terminó, y el rol como una línea por grupo de instrumentos con sus
períodos en años. Los instrumentos SHALL mostrarse traducidos al idioma de lectura cuando haya
traducción, y en el término de MusicBrainz si no. Un período abierto SHALL terminar en
"presente"; un período de un solo año SHALL mostrarse como ese año; un extremo desconocido SHALL
mostrarse como "?"; un período sin fechas SHALL mostrarse como "período desconocido". La marca
de integrante adicional SHALL mostrarse como "adicional". Una leyenda SHALL explicar las marcas
cuando alguna fila las use.

#### Scenario: Integrante que se fue y volvió

- **WHEN** una persona ve a Vince Neil en español
- **THEN** la fila muestra "Vince Neil ★" y "Voz principal (1981–1992, 1997–2015,
  2018–presente)"

#### Scenario: Instrumentos por período

- **WHEN** una persona ve a Tommy Lee
- **THEN** el rol tiene dos líneas: "Batería (1981–1999, 2004–2015, 2018–presente)" y "Coros,
  teclados, piano (2018–presente)"

#### Scenario: Integrante fallecido

- **WHEN** una persona ve a Randy Castillo, fallecido en 2002
- **THEN** la fila muestra "Randy Castillo (†2002)"

#### Scenario: Sin fechas

- **WHEN** una persona ve a DJ Larceny
- **THEN** la fila muestra "Tornamesa · adicional (período desconocido)" dentro de Actual

### Requirement: También en colapsado

Cada fila de integrante o músico de apoyo con otras afiliaciones SHALL mostrar una línea
"También en" con sus otros grupos enlazados (actuales sin prefijo, antiguos con "ex-" y los de
apoyo con "(apoyo)"), sin el artista que se está viendo. Colapsada, la línea SHALL ocupar una
sola línea con las 3 primeras afiliaciones y un control "+N" con la cantidad restante; al
expandirla SHALL mostrar todas solo en esa fila y ofrecer volver a colapsar. Con 3 o menos
afiliaciones no SHALL haber control. Sin afiliaciones, la línea SHALL NOT mostrarse.

#### Scenario: Integrante con muchas bandas

- **WHEN** una persona ve a Randy Castillo con 15 otras afiliaciones
- **THEN** su fila muestra una sola línea con 3 bandas y "+12", del mismo alto que una fila con
  3 bandas

#### Scenario: Expandir una fila

- **WHEN** la persona activa "+12" en la fila de Randy Castillo
- **THEN** esa fila muestra las 15 afiliaciones y las demás filas siguen colapsadas

#### Scenario: Navegar a otra banda

- **WHEN** la persona activa "ex-Ozzy Osbourne" en la línea de Randy Castillo
- **THEN** llega a la página de Ozzy Osbourne

### Requirement: Aviso de sincronización de integrantes

Mientras haya integrantes o músicos de apoyo cuya alineación sigue pendiente, la pestaña SHALL
mostrar un aviso discreto de que sus otras bandas aparecerán en una próxima visita, sin
cantidades, y SHALL programar su sincronización en segundo plano sin esperarla.

#### Scenario: Primera visita

- **WHEN** una persona abre la pestaña Integrantes de una banda cuyos integrantes nunca se
  sincronizaron
- **THEN** ve la alineación sin líneas "También en" y el aviso

#### Scenario: Alineación completa

- **WHEN** todos los integrantes ya están sincronizados
- **THEN** la pestaña no muestra el aviso

### Requirement: Pestaña Bandas de una persona

La página de una persona SHALL ofrecer la pestaña Bandas con, en este orden y omitiendo los
vacíos: el bloque Bandas (una tarjeta por grupo con foto, nombre, marca de fundadora, líneas de
instrumentos con períodos, años de actividad del grupo y cantidad de discos principales cuando
su discografía está sincronizada, actuales primero), el bloque Apoyo para (artistas a los que da
apoyo, con instrumentos y períodos) y el bloque Músicos de apoyo (sus propios músicos de apoyo,
con filas de integrante y "También en"). Construir la pestaña SHALL NOT sincronizar la
discografía de ningún grupo.

#### Scenario: Integrante de una banda

- **WHEN** una persona abre la pestaña Bandas de Tommy Lee
- **THEN** ve la tarjeta de Mötley Crüe con "Batería (1981–1999, 2004–2015, 2018–presente)" y la
  de Methods of Mayhem, enlazadas a sus páginas

#### Scenario: Músico de gira

- **WHEN** una persona abre la pestaña Bandas de un baterista que dio apoyo a Mötley Crüe
- **THEN** el bloque Apoyo para muestra a Mötley Crüe con la batería y sus años

#### Scenario: Solista con banda de gira

- **WHEN** una persona abre la pestaña Bandas de un solista con músicos de apoyo
- **THEN** ve el bloque Músicos de apoyo con sus filas y sus líneas "También en"

### Requirement: Pestaña solo con contenido

La pestaña Integrantes o Bandas SHALL mostrarse solo si el artista tiene algo que listar (un
grupo con integrantes o apoyo; una persona con grupos, apoyo dado o músicos de apoyo), y su URL
directa SHALL responder 404 en caso contrario.

#### Scenario: Solista sin bandas

- **WHEN** un solista no tiene grupos, ni apoyo dado ni músicos de apoyo
- **THEN** la barra no muestra Bandas y la URL de la pestaña responde 404

### Requirement: Línea de tiempo de la alineación

La pestaña Integrantes de un grupo SHALL mostrar, encima del filtro de sub-vistas y en las sub-vistas Completa, Actual (o Última
alineación) y Antiguos, la línea de tiempo «La banda a lo largo del tiempo»: una fila por integrante actual y antiguo (sin músicos
de apoyo) con un tramo por cada período de cada rol, distinguiendo la voz de los instrumentos, sobre un eje de años desde la
formación del grupo hasta hoy o hasta su separación. La línea de tiempo SHALL NOT inventar fechas: un período sin año de inicio
SHALL dibujarse desde la formación con el inicio marcado como desconocido, un período terminado sin año de fin SHALL dibujarse con
el fin marcado como desconocido, y un período sin ningún año SHALL NOT dibujarse. Cada fila SHALL tener un texto equivalente para
lectores de pantalla con sus roles y años. La línea de tiempo SHALL omitirse cuando menos de dos integrantes tienen un período con
algún año, y SHALL NOT mostrarse en la sub-vista Apoyo. La página SHALL NOT desbordar en horizontal en 390 px.

#### Scenario: Grupo con historia fechada

- **WHEN** una persona abre la pestaña Integrantes de Iron Maiden
- **THEN** ve «La banda a lo largo del tiempo» con una fila por cada integrante actual y antiguo, la voz distinguida de los
  instrumentos y un eje de 1975 a hoy, y debajo la alineación de siempre

#### Scenario: Período sin año de fin

- **WHEN** un integrante tiene un período terminado que solo tiene año de inicio
- **THEN** su tramo empieza en ese año, termina con el fin marcado como desconocido y el texto accesible dice «1978–?»

#### Scenario: Pocos datos

- **WHEN** solo un integrante del grupo tiene períodos con año
- **THEN** la pestaña no muestra la línea de tiempo

#### Scenario: Sub-vista Apoyo

- **WHEN** una persona abre la sub-vista Apoyo
- **THEN** ve los músicos de apoyo sin la línea de tiempo

#### Scenario: Teléfono

- **WHEN** una persona abre la pestaña Integrantes en 390 px
- **THEN** la línea de tiempo cabe en el ancho sin desplazamiento horizontal de la página

