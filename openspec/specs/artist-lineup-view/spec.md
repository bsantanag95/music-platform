# artist-lineup-view Specification

## Purpose
Presentar la alineación de un artista al estilo de Metal-Archives: la pestaña Integrantes de un grupo (sub-vistas Completa, Actual o Última alineación, Antiguos y Apoyo, con instrumentos por período y las otras bandas de cada integrante en una línea colapsable) y la pestaña Bandas de una persona.
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

