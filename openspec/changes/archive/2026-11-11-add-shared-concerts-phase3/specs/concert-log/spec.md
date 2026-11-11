## ADDED Requirements

### Requirement: Sugerencias de enlace en Mis conciertos

Mis conciertos SHALL mostrar un bloque "¿Son estos tus conciertos?" con, para cada recuerdo sin enlazar, hasta 3
conciertos compartidos visibles con sesión (confirmados o por confirmar, no cancelados, pasados) con el artista del
recuerdo en el cartel y fecha y lugar compatibles: con día exacto, el concierto de ese día o del anterior o el siguiente;
con mes, cualquier día de ese mes; con año, cualquier día de ese año. Si el recuerdo tiene ciudad, la ciudad normalizada
SHALL coincidir; sin ciudad, solo SHALL sugerirse con día exacto. Si los dos tienen país, SHALL coincidir. No SHALL
sugerirse un concierto descartado para ese recuerdo ni uno donde la persona ya tiene otro recuerdo enlazado. El bloque
SHALL mostrar hasta 20 sugerencias y cuántas más hay. Las sugerencias SHALL usar solo los recuerdos de la propia persona.

#### Scenario: Recuerdo con el año y la ciudad

- **WHEN** una persona registró a Los Bunkers en 2009 en Santiago y existe "Los Bunkers en Teatro Caupolicán" del
  2009-05-15 en Santiago
- **THEN** el bloque se lo sugiere para ese recuerdo

#### Scenario: Fecha parcial sin ciudad

- **WHEN** el recuerdo dice solo 2009, sin ciudad
- **THEN** no se le sugiere ningún concierto

#### Scenario: Pasada la medianoche

- **WHEN** el recuerdo es del 2009-05-16 y el concierto del 2009-05-15
- **THEN** se sugiere

#### Scenario: Otra ciudad

- **WHEN** el recuerdo dice Valparaíso y el concierto fue en Santiago
- **THEN** no se sugiere

### Requirement: Enlazar y descartar una sugerencia

"Enlazar" SHALL enlazar el recuerdo al concierto sin modificar ninguno de sus datos y SHALL contar como asistencia (puede
confirmar uno por confirmar). Si el par no cumple las condiciones de una sugerencia (salvo el descarte), la API SHALL
responder `400` con `CONCERT_LINK_INVALID`; si la persona ya tiene otro recuerdo enlazado a ese concierto, `409` con
`CONCERT_LINK_CONFLICT`. "No es este" SHALL descartar ese concierto para ese recuerdo de forma permanente e idempotente.

#### Scenario: Enlazar conserva la fecha parcial

- **WHEN** una persona enlaza su recuerdo de 2009 al concierto del 2009-05-15
- **THEN** el recuerdo queda enlazado y su fecha sigue siendo 2009

#### Scenario: Descartar

- **WHEN** la persona pulsa "No es este"
- **THEN** ese concierto no vuelve a sugerirse para ese recuerdo

#### Scenario: Artista que no tocó

- **WHEN** se pide enlazar un recuerdo de un artista que no está en el cartel del concierto
- **THEN** la API responde `400` con `CONCERT_LINK_INVALID`

### Requirement: Desvincular un recuerdo

El menú de un recuerdo enlazado en Mis conciertos SHALL ofrecer "Desvincular del concierto", que quita el enlace,
conserva el recuerdo con todos sus datos (también uno creado por "Estuve ahí"), deja de tratarlo como creado por la acción
y lo descarta como sugerencia. La confirmación del concierto SHALL NOT cambiar.

#### Scenario: Desvincular

- **WHEN** una persona desvincula su recuerdo de un concierto
- **THEN** el recuerdo sigue en Mis conciertos sin enlace y ese concierto no se le vuelve a sugerir
