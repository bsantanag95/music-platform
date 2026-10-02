## ADDED Requirements

### Requirement: Entidad de Wikidata de cada álbum

La ingesta de la discografía SHALL guardar, para cada release-group, la entidad de Wikidata que
MusicBrainz declara en su relación de URL `wikidata`, pedida en el mismo browse de release-groups
(sin requests adicionales). Si MusicBrainz deja de declararla, la ingesta SHALL borrarla. El
sistema SHALL NOT buscar la entidad de un álbum por nombre ni por otra heurística.

#### Scenario: Álbum enlazado

- **WHEN** el browse trae "Meddle" con la relación `wikidata` a `Q205458`
- **THEN** el release-group de "Meddle" guarda `Q205458` y la página sigue el mismo número de
  requests a MusicBrainz

#### Scenario: Relación retirada

- **WHEN** una sincronización posterior trae un release-group sin relación `wikidata`
- **THEN** el release-group queda sin entidad de Wikidata
