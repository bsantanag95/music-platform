## REMOVED Requirements

### Requirement: Resultado de canción sin página propia

**Reason**: La búsqueda ya resuelve la grabación identidad del primer grupo y devuelve su
`recordingId`; no enlazarla obligaba a abrir un álbum y elegir la pista, que es justo el tiempo que
la búsqueda exacta debía ahorrar.

**Migration**: Ver "Acceso directo a la canción resuelta": el grupo resuelto enlaza a
`/song/<id>` además de listar sus álbumes.

## ADDED Requirements

### Requirement: Acceso directo a la canción resuelta

En el tipo Canciones, el grupo resuelto (el que expone `recordingId`) SHALL ofrecer un enlace
directo a `/song/<id>` además de listar los álbumes que la contienen. El enlace SHALL mostrarse
solo cuando `recordingId` no sea `null`; sin identidad resuelta, el panel SHALL conservar la lista
de álbumes como único destino. Los grupos no resueltos SHALL seguir abriendo su propia búsqueda. El
título de la canción es dato del catálogo y SHALL NOT traducirse; el texto del enlace sí.

#### Scenario: Búsqueda exacta de canción

- **WHEN** una persona busca `dokken kiss of death` en Canciones y el grupo resuelto es
  "Kiss of Death — Dokken" con `recordingId`
- **THEN** el panel muestra "Ver canción" enlazando a `/song/<recordingId>` junto a los álbumes
  que contienen la canción

#### Scenario: Enlace en el primer render local

- **WHEN** el grupo resuelto tiene apariciones locales y la página pinta primero las coincidencias
  locales antes de la respuesta de MusicBrainz
- **THEN** el enlace directo a `/song/<id>` ya está visible y se mantiene tras llegar el resto

#### Scenario: Grupo sin identidad resuelta

- **WHEN** un grupo no logra una grabación identidad (`recordingId` es `null`)
- **THEN** el panel no muestra el enlace directo y solo lista sus álbumes

#### Scenario: Grupos no resueltos

- **WHEN** la respuesta incluye "Otras canciones con ese título"
- **THEN** esas filas siguen abriendo su propia búsqueda y no enlazan a `/song/<id>`
