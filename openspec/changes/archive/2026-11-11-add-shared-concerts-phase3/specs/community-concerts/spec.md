## ADDED Requirements

### Requirement: Agregar a MusicBrainz

La página de un concierto de la comunidad confirmado SHALL ofrecer, con sesión, un enlace "Agregar a MusicBrainz" al
formulario de alta de eventos de MusicBrainz precargado con su nombre, el tipo concierto, la fecha y, si tiene, el enlace
del setlist como fuente. El servidor SHALL NOT enviar datos a MusicBrainz. Un concierto por confirmar o de MusicBrainz
SHALL NOT ofrecerlo.

#### Scenario: Concierto confirmado

- **WHEN** una persona con sesión abre un concierto de la comunidad confirmado
- **THEN** ve "Agregar a MusicBrainz", que abre el formulario de MusicBrainz con el nombre y la fecha ya escritos

#### Scenario: Por confirmar

- **WHEN** el concierto está por confirmar
- **THEN** no se ofrece el enlace
