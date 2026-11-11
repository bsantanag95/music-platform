# concert-tours-festivals Specification

## Purpose
Agrupar los conciertos compartidos por gira y por festival con los datos de MusicBrainz (ADR 0059): la gira de cada
concierto y su página, el festival del que un concierto es un día o un escenario y la página del festival con sus partes
y su cartel reunido, y la gira como valor inicial del recuerdo que crea "Estuve ahí".

## Requirements
### Requirement: Gira de un concierto

Un concierto de MusicBrainz que es parte de una serie de tipo `Tour` SHALL quedar enlazado a esa gira (nombre y `mbid`).
La pestaña Conciertos del artista y la página del concierto SHALL mostrar "Gira: <nombre>" enlazado a la página de la
gira.

#### Scenario: Concierto de una gira

- **WHEN** una persona abre "M72 World Tour: Mexico City"
- **THEN** ve "Gira: M72 World Tour" con enlace a la gira

### Requirement: Página de la gira

Cada gira con conciertos visibles SHALL tener una página (`/{locale}/tour/{id}`) con su nombre, sus artistas principales,
sus conciertos visibles (próximos y pasados por fecha, con la cifra de personas con umbral y "Estuve ahí" con sesión),
cuántas fechas tiene y, con sesión, en cuántas estuvo quien mira. Una gira sin conciertos visibles SHALL responder 404.

#### Scenario: Recorrer una gira

- **WHEN** una persona con sesión abre la gira y estuvo en 2 de sus fechas
- **THEN** ve todas sus fechas visibles y que estuvo en 2

### Requirement: Festival y sus partes

Un día o escenario de un festival de MusicBrainz (relación `parts` hacia un evento de tipo `Festival`) SHALL quedar
enlazado a ese festival, guardado como concierto de tipo festival con su rango de fechas aunque no tenga cartel propio.
La página de una parte SHALL mostrar "Parte de <festival>". La página del festival SHALL mostrar su rango de fechas, sus
partes conocidas agrupadas por día (cada una con su recinto y "Estuve ahí") y el cartel reunido de sus partes y el suyo
sin repetir artistas. El festival sin cartel propio SHALL NOT ofrecer "Estuve ahí" ni aparecer en la pestaña de un
artista.

#### Scenario: Festival de varios días

- **WHEN** una persona abre "Glastonbury Festival 2019"
- **THEN** ve del 26 al 30 de junio, sus días y escenarios conocidos y los artistas que tocaron en ellos

#### Scenario: Día de un festival

- **WHEN** una persona abre "Glastonbury Festival 2019, Friday: Pyramid Stage"
- **THEN** ve "Parte de Glastonbury Festival 2019" con enlace al festival

### Requirement: La gira en el recuerdo

Cuando "Estuve ahí" crea un recuerdo de un concierto con gira, el recuerdo SHALL llevar el nombre de la gira (recortado a
100 caracteres) como valor inicial. Enlazar un recuerdo existente SHALL NOT modificar su gira.

#### Scenario: Sumarse a un concierto de gira

- **WHEN** una persona sin recuerdo dice "Estuve ahí" en un concierto del M72 World Tour
- **THEN** su recuerdo nuevo tiene la gira "M72 World Tour"

