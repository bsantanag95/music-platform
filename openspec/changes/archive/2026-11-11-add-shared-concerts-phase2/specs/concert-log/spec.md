## ADDED Requirements

### Requirement: Compartir este concierto desde Mis conciertos

En Mis conciertos, el menú de un recuerdo sin enlazar con fecha completa, ciudad y país SHALL ofrecer "Compartir este
concierto" (capability `community-concerts`), que abre la creación del concierto compartido con sus datos. Un recuerdo
con fecha parcial, sin ciudad o sin país SHALL NOT ofrecerlo.

#### Scenario: Recuerdo con fecha parcial

- **WHEN** un recuerdo tiene solo el año
- **THEN** su menú no ofrece "Compartir este concierto"
