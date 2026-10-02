## MODIFIED Requirements

### Requirement: Sin géneros ni etiquetas de MusicBrainz

El sistema SHALL NOT ingerir los géneros ni las etiquetas de MusicBrainz: son datos
suplementarios con licencia CC BY-NC-SA 3.0 (no comercial). Los géneros del artista SHALL
provenir de Wikidata (propiedad P136), según la capability `genre-seeds`.

#### Scenario: Artista con géneros en MusicBrainz

- **WHEN** se sincroniza la ficha de un artista que tiene géneros en MusicBrainz
- **THEN** la request no pide géneros ni etiquetas y el artista no guarda ningún género
  proveniente de MusicBrainz
