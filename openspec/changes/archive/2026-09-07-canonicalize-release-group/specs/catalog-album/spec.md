## MODIFIED Requirements

### Requirement: Read-model compartido de detalle

El sistema SHALL construir un read-model interno que contenga el `release_group` (incluida
su `category` y su fecha de lanzamiento canónica: `first_release_date` cuando exista y
`first_release_year` en todos los casos en que se conozca el año), la **edición
representativa** resuelta según la capacidad `album-edition-selection`, la carátula, los
tracks, sus créditos y el artista principal asociado al `release_group` cuando exista, y
SHALL reutilizarlo desde el Server Component y el endpoint REST sin duplicar la lógica de
lectura o ingesta.

La fecha/año que el read-model presenta como fecha del álbum SHALL ser la del
`release_group`, no la de la edición ingerida; la `release_date` de la edición SHALL
seguir disponible como dato de la edición.

#### Scenario: Reutilización por página y endpoint

- **WHEN** la página o `GET /api/catalog/release-group/{id}` solicita un álbum
- **THEN** ambos consumidores obtienen el detalle mediante el mismo servicio de catálogo y
  la respuesta incluye `category`, `firstReleaseDate` y `firstReleaseYear` del
  release-group además del `release` con su `editionLabel` y tracklist

#### Scenario: Fecha del álbum frente a fecha de la edición

- **WHEN** un `release_group` de 1994 tiene como edición representativa una reedición
  fechada en 2015
- **THEN** el detalle presenta 1994 como año del álbum y expone 2015 solo como fecha de la
  edición

#### Scenario: Álbum inexistente

- **WHEN** el id no corresponde a ningún `release_group`
- **THEN** la página muestra un 404 localizado y el endpoint responde con `ALBUM_NOT_FOUND`

#### Scenario: Álbum sin ediciones ingeribles

- **WHEN** el `release_group` existe pero MusicBrainz no entrega una edición utilizable
- **THEN** la página muestra un estado vacío localizado y el endpoint responde con
  `NO_EDITIONS_FOUND`

#### Scenario: Álbum sin artista principal

- **WHEN** el `release_group` no tiene un crédito primario de artista identificable
- **THEN** el read-model devuelve el detalle sin artista principal y la página puede
  renderizar el álbum sin un enlace de artista roto

#### Scenario: Álbum sin fecha canónica conocida

- **WHEN** MusicBrainz no aporta `first-release-date` para el `release_group`, ni siquiera
  con precisión anual
- **THEN** `firstReleaseDate` y `firstReleaseYear` son `null` y la vista omite la fecha
  sin romper el layout

## ADDED Requirements

### Requirement: Tipo de obra visible en el detalle de álbum

La vista de álbum SHALL mostrar una etiqueta de tipo de obra localizada, tomada del
namespace `album` de los catálogos de mensajes, cuando la `category` del `release_group`
es `compilation`, `live_other` o `single_ep`. Para `category` `studio` la vista SHALL NOT
mostrar ninguna etiqueta de tipo adicional. La etiqueta SHALL ser texto de interfaz: no
altera el título del álbum ni ningún dato musical.

#### Scenario: Recopilación

- **WHEN** una persona abre un álbum cuya `category` es `compilation`
- **THEN** la vista muestra la etiqueta localizada de recopilación junto al título, sin
  modificar el título

#### Scenario: Álbum de estudio

- **WHEN** una persona abre un álbum cuya `category` es `studio`
- **THEN** la vista no muestra ninguna etiqueta de tipo de obra

#### Scenario: Cambio de locale

- **WHEN** una persona abre el mismo álbum en dos locales soportados
- **THEN** la etiqueta de tipo de obra cambia de idioma y los datos musicales permanecen
  iguales
