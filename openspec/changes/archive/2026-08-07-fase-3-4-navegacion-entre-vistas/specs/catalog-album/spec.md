## MODIFIED Requirements

### Requirement: Read-model compartido de detalle

El sistema SHALL construir un read-model interno que contenga el `release_group`, la edición
seleccionada, la carátula, los tracks, sus créditos y el artista principal asociado al
`release_group` cuando exista, y SHALL reutilizarlo desde el Server Component y el endpoint REST
sin duplicar la lógica de lectura o ingesta.

#### Scenario: Reutilización por página y endpoint

- **WHEN** la página o `GET /api/catalog/release-group/{id}` solicita un álbum
- **THEN** ambos consumidores obtienen el detalle mediante el mismo servicio de catálogo y el
  endpoint conserva su shape público actual

#### Scenario: Álbum inexistente

- **WHEN** el id no corresponde a ningún `release_group`
- **THEN** la página muestra un 404 localizado y el endpoint responde con `ALBUM_NOT_FOUND`

#### Scenario: Álbum sin ediciones ingeribles

- **WHEN** el `release_group` existe pero MusicBrainz no entrega una edición utilizable
- **THEN** la página muestra un estado vacío localizado y el endpoint responde con
  `NO_EDITIONS_FOUND`

#### Scenario: Álbum sin artista principal

- **WHEN** el `release_group` no tiene un crédito primario de artista identificable
- **THEN** el read-model devuelve el detalle sin artista principal y la página puede renderizar
  el álbum sin un enlace de artista roto

### Requirement: Créditos destacados visibles

La vista SHALL mostrar como enlaces locale-aware los créditos destacados de cada track cuando
existan, respetando el nombre, `artistId` y `joinPhrase` entregados por el catálogo. Los créditos
sin rol `featured` no SHALL convertirse en enlaces de colaboración.

#### Scenario: Track con colaboración

- **WHEN** un track contiene un crédito con rol `featured`
- **THEN** la vista muestra la colaboración correspondiente y el nombre de cada artista enlaza a
  su perfil con el locale activo

#### Scenario: Track sin colaboración destacada

- **WHEN** un track no contiene créditos destacados
- **THEN** la vista no muestra una etiqueta de colaboración adicional
