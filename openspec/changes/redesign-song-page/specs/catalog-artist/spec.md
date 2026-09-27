## ADDED Requirements

### Requirement: Clasificación del tipo de disco

El sistema SHALL derivar la categoría de un release-group de sus tipos de MusicBrainz así:
`compilation` si entre sus tipos secundarios está `Compilation`; si no, `live_other` si está
`Live`; si no, `studio` cuando el tipo primario es `Album` y no tiene otro tipo secundario que
`Soundtrack`; `single_ep` cuando el tipo primario es `Single` o `EP`; y `live_other` en
cualquier otro caso (incluido un `Album` con `Demo`, `Remix`, `DJ-mix`, `Mixtape/Street`,
`Spokenword`, `Interview`, `Audiobook`, `Audio drama` o `Field recording`). La
misma regla SHALL aplicarse en todas las ingestas y búsquedas, y los discos ya ingeridos SHALL
poder reclasificarse con un script operativo.

#### Scenario: Demo publicado como álbum

- **WHEN** se ingiere un release-group `Album` con el tipo secundario `Demo`
- **THEN** su categoría es `live_other` y la discografía del artista no lo muestra entre los
  álbumes de estudio

#### Scenario: Banda sonora de un artista

- **WHEN** se ingiere un release-group `Album` con el tipo secundario `Soundtrack` (por ejemplo
  *Obscured by Clouds*)
- **THEN** su categoría es `studio` y figura entre los álbumes de estudio del artista

#### Scenario: Álbum de estudio

- **WHEN** se ingiere un release-group `Album` sin tipos secundarios
- **THEN** su categoría es `studio`

#### Scenario: Reclasificación de discos existentes

- **WHEN** se corre el script de reclasificación sobre una base con un demo guardado como
  `studio`
- **THEN** el demo pasa a `live_other` y los discos cuya categoría no cambia no se escriben
