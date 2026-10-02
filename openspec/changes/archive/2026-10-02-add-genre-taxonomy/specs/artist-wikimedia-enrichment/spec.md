## MODIFIED Requirements

### Requirement: Enlace a Wikidata solo desde MusicBrainz

El sistema SHALL identificar la entidad de Wikidata de un artista únicamente a partir de la
relación de URL `wikidata` que declara MusicBrainz para ese artista. El sistema SHALL NOT
buscar la entidad por nombre ni por ninguna otra heurística. Un artista sin esa relación
SHALL quedar sin foto, descripción, resumen, lugar ni géneros desde Wikimedia.

#### Scenario: Artista enlazado

- **WHEN** MusicBrainz declara para Los Bunkers la relación `wikidata` a `Q2737642`
- **THEN** el sistema enriquece el artista desde esa entidad

#### Scenario: Artista sin enlace

- **WHEN** un artista no tiene relación `wikidata` en MusicBrainz
- **THEN** el sistema no consulta Wikimedia para ese artista y la página se construye sin
  esos datos

## ADDED Requirements

### Requirement: Géneros en el enriquecimiento

El enriquecimiento desde Wikimedia SHALL extraer los géneros (P136) de la misma entidad de
Wikidata que ya pide para el artista, como un paso aislado de los demás: un fallo al guardar los
géneros SHALL NOT descartar la foto, los textos ni el lugar, y viceversa. Las reglas de selección y
guardado de esos géneros son las de la capability `genre-seeds`.

#### Scenario: Una sola request a Wikidata

- **WHEN** se enriquece un artista
- **THEN** la foto, los textos, el lugar y los géneros salen de una sola consulta a la entidad de
  Wikidata

#### Scenario: Fallo aislado

- **WHEN** falla el guardado de los géneros de un artista durante el enriquecimiento
- **THEN** la foto y los textos del artista se actualizan igual
