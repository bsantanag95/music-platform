# catalog-song Specification

## Purpose

Define la autoría que muestra la página de detalle de canción. La página nació mínima
(`rebalance-catalog-detail-pages`) y desde `redesign-song-page` es una ficha compacta de
biblioteca: su estructura vive en `song-page-layout`, las versiones y los discos en
`song-versions`, el panel personal en `song-personal-panel` y los agregados en
`song-community-stats`. Esta capacidad conserva la fila "Escrita por" y el bloque Composición.

## Requirements
### Requirement: Autoría en la página de canción

La página de canción SHALL mostrar, en la ficha técnica de la cabecera, una fila "Escrita
por" con los autores de la obra (u obras) de la grabación, cada uno enlazado a su página de
artista, y el rol entre paréntesis cuando no es `writer` ("música", "letra"); y SHALL
repetirlos con todos sus roles en el bloque Composición (capacidad `song-page-layout`). La
autoría SHALL obtenerse con una consulta de lectura, sin requests a MusicBrainz al
renderizar. Sin autores registrados, la fila y el bloque SHALL NOT mostrarse.

#### Scenario: Canción con autores

- **WHEN** una persona abre la página de "Eyes Wide Open"
- **THEN** la ficha técnica muestra "Escrita por Jerrod Bettis, Meghan Kabir, Audra Mae" con
  enlaces a sus páginas, y el bloque Composición los lista con sus roles

#### Scenario: Versión con obra compartida

- **WHEN** una versión en vivo comparte la obra con la versión de estudio
- **THEN** su página muestra los mismos autores

#### Scenario: Sin autores

- **WHEN** la grabación no tiene obra o su obra no tiene autores
- **THEN** la página no muestra la fila "Escrita por" ni el bloque Composición

