## ADDED Requirements

### Requirement: Fusión de un comunitario con MusicBrainz

Al importar un concierto de MusicBrainz, si existe uno de la comunidad no oculto con el mismo artista principal, la
misma fecha y la misma ciudad normalizada, el de la comunidad SHALL fusionarse en el importado: sus recuerdos pasan al
importado (sin duplicar a nadie) y queda oculto con el enlace al destino. La ciudad normalizada SHALL calcularla la base
(columna generada), también para los conciertos ya importados.

#### Scenario: MusicBrainz llega después

- **WHEN** la comunidad creó "Los Bunkers en Teatro Caupolicán" del 2009-05-15 y luego MusicBrainz agrega ese concierto
- **THEN** la sincronización deja un solo concierto, el de MusicBrainz, con las personas que estuvieron
