## MODIFIED Requirements

### Requirement: Variantes de grabación en la tracklist

Cuando los atributos de versión de la grabación de una pista (capacidad `song-versions`,
derivados del vínculo grabación → obra) no están vacíos, la fila SHALL mostrar una etiqueta
localizada por atributo (en vivo, cover, instrumental, …; el texto de MusicBrainz si no hay
traducción) y, cuando incluyen `cover` o `live` y la obra tiene una grabación original
distinta de la pista, un enlace locale-aware a esa grabación original. La misma regla SHALL
aplicarse a las pistas adicionales de otras ediciones.

#### Scenario: Pista en vivo con original conocida

- **WHEN** una pista es una grabación vinculada a la obra "Money" con el atributo `live` y
  la obra tiene como original la grabación de estudio
- **THEN** la fila muestra la etiqueta "En vivo" y un enlace "versión de Money" a la
  página de esa canción

#### Scenario: Pista sin atributos

- **WHEN** la grabación de una pista no tiene atributos de versión
- **THEN** la fila no muestra etiqueta de variante

#### Scenario: Cover sin original ingerida

- **WHEN** una pista es un `cover` y ninguna grabación original de la obra está en la base
- **THEN** la fila muestra la etiqueta "Cover" sin enlace a la original
