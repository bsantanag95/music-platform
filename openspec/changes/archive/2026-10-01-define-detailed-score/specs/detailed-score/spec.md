## ADDED Requirements

### Requirement: El puntaje detallado es un refinamiento de las estrellas
La valoración SHALL tener un puntaje detallado opcional de 1 a 100 como refinamiento de las
estrellas, no como una nota independiente: las estrellas SHALL seguir siendo la nota
protagonista en todas las superficies y el puntaje SHALL poder omitirse siempre. La
valoración SHALL tener un único valor coherente: el puntaje detallado SHALL caer siempre
dentro de la banda de 10 puntos de las estrellas guardadas (½★ = 1–10, 1★ = 11–20 … 5★ =
91–100), garantizado por la base de datos y no solo por la interfaz. El puntaje SHALL aplicar
a álbumes y canciones.

#### Scenario: Puntaje coherente con las estrellas
- **WHEN** se guarda una valoración de 4 estrellas con puntaje 76
- **THEN** la valoración se guarda con ambos valores

#### Scenario: Puntaje incoherente
- **WHEN** se intenta guardar una valoración de 4 estrellas con puntaje 90
- **THEN** la API responde `400` con código `INVALID_RATING` y no escribe nada

### Requirement: Las estrellas se derivan del puntaje
Cuando se puntúa solo con el número, las estrellas SHALL derivarse del puntaje como
`⌈puntaje / 10⌉ / 2` (1–10 → ½★, 11–20 → 1★ … 91–100 → 5★). La derivación SHALL ser la
inversa exacta de las bandas: para todo puntaje de 1 a 100, el puntaje SHALL caer en la banda
de las estrellas derivadas.

#### Scenario: Derivar estrellas
- **WHEN** se puntúa con 86
- **THEN** las estrellas derivadas son 4,5

#### Scenario: Extremos de las bandas
- **WHEN** se puntúa con 10, con 11, con 90 y con 100
- **THEN** las estrellas derivadas son 0,5, 1, 4,5 y 5 respectivamente

### Requirement: El puntaje se puede enviar sin estrellas
El endpoint de valoración (`PUT /api/catalog/{target}/{id}/ratings`) SHALL aceptar
`{ detailedScore }` sin `stars` y derivar las estrellas; SHALL seguir aceptando `{ stars }`
(que reemplaza la valoración dejando el puntaje en nulo) y `{ stars, detailedScore }` (que
valida la coherencia). Un cuerpo sin `stars` ni `detailedScore`, o con `detailedScore` fuera
de 1–100 o no entero, SHALL responder `400` con código `VALIDATION_ERROR`. El contrato
existente de las llamadas con `stars` SHALL NOT cambiar.

#### Scenario: Solo puntaje
- **WHEN** un usuario envía `{ detailedScore: 86 }` sobre un álbum que no había valorado
- **THEN** se crea la valoración con 4,5 estrellas y puntaje 86 y la respuesta las devuelve

#### Scenario: Solo puntaje sobre una valoración existente
- **WHEN** un usuario con 4 estrellas envía `{ detailedScore: 86 }`
- **THEN** su valoración pasa a 4,5 estrellas con puntaje 86

#### Scenario: Cuerpo vacío
- **WHEN** se envía `{}`
- **THEN** la API responde `400` con código `VALIDATION_ERROR` y no escribe nada

#### Scenario: Llamada existente con estrellas
- **WHEN** un cliente envía `{ stars: 4 }`
- **THEN** la valoración se guarda con 4 estrellas y sin puntaje, igual que antes

### Requirement: No hay promedio del puntaje de la comunidad
Ninguna superficie SHALL mostrar un promedio, histograma ni orden basados en el puntaje
detallado de la comunidad: la media y la distribución de la comunidad SHALL expresarse solo en
estrellas.

#### Scenario: Bloque de comunidad
- **WHEN** un álbum tiene muchas valoraciones con puntaje detallado
- **THEN** el bloque de comunidad muestra la media y el histograma en estrellas, sin
  ninguna cifra `/100` agregada
