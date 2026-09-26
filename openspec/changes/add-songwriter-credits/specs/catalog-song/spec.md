## ADDED Requirements

### Requirement: Autoría en la página de canción

La página de canción SHALL mostrar, bajo el artista acreditado, una línea "Escrita por"
con los autores de la obra (u obras) de la grabación, cada uno enlazado a su página de
artista, y el rol entre paréntesis cuando no es `writer` ("música", "letra"). La línea
SHALL obtenerse con una consulta de lectura, sin requests a MusicBrainz al renderizar. Sin
autores registrados, la línea SHALL NOT mostrarse.

#### Scenario: Canción con autores

- **WHEN** una persona abre la página de "Eyes Wide Open"
- **THEN** bajo el artista ve "Escrita por Jerrod Bettis, Meghan Kabir, Audra Mae" con
  enlaces a sus páginas

#### Scenario: Versión con obra compartida

- **WHEN** una versión en vivo comparte la obra con la versión de estudio
- **THEN** su página muestra los mismos autores

#### Scenario: Sin autores

- **WHEN** la grabación no tiene obra o su obra no tiene autores
- **THEN** la página no muestra la línea "Escrita por"
