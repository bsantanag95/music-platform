## REMOVED Requirements

### Requirement: Tier list
**Reason**: La Fase 2 suma tier lists de canciones; el escenario que las rechazaba deja de valer. La regla pasa a "Tier list de discos o canciones".
**Migration**: Ninguna en datos: `0086` ya admite canciones. La API acepta `entityType: 'recording'`.

## ADDED Requirements

### Requirement: Tier list de discos o canciones
Una persona con sesión SHALL poder crear una tier list de discos o de canciones, con título, seis niveles en orden fijo (S, A, B, C, D y E) y una
bandeja "Sin escuchar / sin valorar". Una tier list SHALL tener un solo tipo de ítem. Cada ítem SHALL estar en un nivel o en la bandeja, sin repetidos,
con un orden dentro de cada uno. Una tier list SHALL tener como máximo 50 ítems, contando la bandeja.

#### Scenario: Disco repetido
- **WHEN** una persona intenta agregar un disco que ya está en su tier list
- **THEN** la tier list no cambia

#### Scenario: Tier list de canciones
- **WHEN** una persona crea una tier list de canciones desde un disco
- **THEN** la tier list guarda canciones y la imagen usa la carátula de su disco

#### Scenario: Tipo equivocado
- **WHEN** una persona intenta agregar una canción a una tier list de discos
- **THEN** la API responde `400` con `VALIDATION_ERROR`

#### Scenario: Nivel fuera de rango
- **WHEN** se intenta guardar un ítem con nivel 6
- **THEN** la base lo rechaza con su `CHECK`

### Requirement: Ubicación por la nota del dueño
Todo ítem que entra a una tier list, desde cualquier fuente o a mano, SHALL caer en el nivel del tramo de la nota vigente de su dueño (la nota detallada
si existe; si no, el tramo de sus estrellas); sin nota, en la bandeja. Dentro de un nivel SHALL conservar el orden de la fuente. El servidor SHALL leer
la nota; nunca SHALL tomarla del pedido.

#### Scenario: Lista con valorados y sin valorar
- **WHEN** una persona arma una tier list desde una lista propia con un disco valorado en 88 y otro sin valorar
- **THEN** el primero queda en A y el segundo en la bandeja

### Requirement: Las canciones de un disco
Al crear una tier list de canciones desde un disco, el sistema SHALL tomar las pistas de su edición representativa en orden, sin repetir una grabación,
hasta 50, y ubicarlas por la nota del dueño. Un disco sin pistas SHALL responder `400` con `VALIDATION_ERROR`. La tier list SHALL nacer privada.

#### Scenario: Disco valorado a medias
- **WHEN** una persona valoró dos de las ocho canciones de un disco y arma su tier list
- **THEN** esas dos quedan en el nivel de su nota y las otras seis en la bandeja, en el orden del disco

#### Scenario: Grabación repetida
- **WHEN** un disco trae la misma grabación en dos medios
- **THEN** la tier list la tiene una sola vez

### Requirement: Armar desde tus valoraciones o una lista
Al crear una tier list, una persona SHALL poder elegir como fuente sus valoraciones, con los filtros del Top N (año o década, año de escucha, género,
artista), o una lista propia del mismo tipo. La vista previa SHALL mostrar hasta 50 candidatos con su nota, todos elegidos, y permitir quitar alguno. La
tier list SHALL nacer privada con lo elegido, ubicado por la nota del dueño. Un objetivo que no existe o de otro tipo SHALL responder `400` con
`VALIDATION_ERROR`.

#### Scenario: Canciones de un artista
- **WHEN** una persona elige sus valoraciones de canciones con el filtro de un artista
- **THEN** la vista previa muestra sus canciones valoradas de ese artista y la tier list las reparte por nota

#### Scenario: Quitar de la vista previa
- **WHEN** una persona quita dos candidatos antes de armarla
- **THEN** la tier list no los incluye

#### Scenario: Más de 30 candidatos
- **WHEN** una persona tiene 45 discos valorados de los noventa
- **THEN** la vista previa de la tier list muestra los 45

### Requirement: Agregar a mano
El editor de una tier list SHALL permitir buscar y agregar un disco o una canción, según su tipo. Lo agregado SHALL caer al final del nivel de la nota
del dueño, o de la bandeja si no tiene, y SHALL anunciarse dónde quedó. Pasar de 50 SHALL responder `400` con `VALIDATION_ERROR` sin agregar nada.

#### Scenario: Agregar un disco valorado
- **WHEN** el dueño agrega un disco que valoró con 4 estrellas
- **THEN** el disco queda al final de B y se anuncia que quedó en B

#### Scenario: Tier list llena
- **WHEN** el dueño intenta agregar un ítem a una tier list con 50
- **THEN** la respuesta es `400` con `VALIDATION_ERROR` y la tier list no cambia
