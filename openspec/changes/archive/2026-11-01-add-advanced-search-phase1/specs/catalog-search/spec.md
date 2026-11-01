## MODIFIED Requirements

### Requirement: Endpoint de búsqueda por tipo sin ingerir discografía

`GET /api/catalog/search?type=<artist|album|song>&q=<texto>` SHALL devolver las coincidencias del
tipo pedido combinando la base local y la búsqueda en vivo de MusicBrainz, dentro del presupuesto
de "Presupuesto de MusicBrainz por tipo". Un `type` ausente o distinto de esos valores SHALL
responder `400` con `code: VALIDATION_ERROR`. El endpoint SHALL NOT ingerir discografía,
tracklist ni carátula de ningún resultado, y SHALL NOT ingerir releases ni tracks de las
apariciones de una canción (ver `catalog-recording-ingestion`). La respuesta SHALL incluir
`type`, `results` (con `id` local, `mbid`, nombre/título, subtítulo, los campos propios del tipo
y `cached`), `remoteFailed` y, para Álbumes y Canciones, `total` de MusicBrainz y `nextOffset`
cuando hay más páginas; en Canciones, cada resultado SHALL ser un grupo (canción, artista) con
sus álbumes y la respuesta SHALL incluir la interpretación usada y sus alternativas. Parámetros
opcionales: `offset`; en Artistas `artistType`, `country`, `beginFrom`, `beginTo` y `ended`; en Álbumes
`category`, `decade`, `yearFrom`, `yearTo` y `artist`; en Canciones `artist`, `durMin` y `durMax`. Los filtros
siguen las reglas de `advanced-search-filters` (valores inválidos o de otro tipo se ignoran sin error) y
`nextOffset` SHALL corresponder a la consulta filtrada.

#### Scenario: Búsqueda de artistas
- **WHEN** una persona busca `Poison` en Artistas
- **THEN** el endpoint responde `200` con `type: "artist"` y artistas locales y de MusicBrainz
  deduplicados por `mbid`, sin álbumes ni canciones y sin haber ingerido ninguna discografía

#### Scenario: Homónimos preservados
- **WHEN** una persona busca `Poison` y MusicBrainz devuelve una banda de glam y otra de thrash
- **THEN** ambas aparecen como elementos separados, cada una con su `disambiguation`

#### Scenario: Falta el parámetro q o type
- **WHEN** la solicitud no incluye `q`, llega vacío tras normalizar, o `type` falta o no es válido
- **THEN** el endpoint responde `400` con `code: VALIDATION_ERROR`

#### Scenario: Paginación
- **WHEN** una búsqueda de álbumes tiene más coincidencias en MusicBrainz que las devueltas
- **THEN** la respuesta incluye `total` y `nextOffset`, y una solicitud con ese `offset` devuelve
  la página siguiente

#### Scenario: Filtros en el endpoint
- **WHEN** una solicitud pide `type=album&q=iron%20maiden&yearFrom=1983&yearTo=1986`
- **THEN** el endpoint responde `200` solo con álbumes cuyo primer lanzamiento cae entre 1983 y 1986, y una
  solicitud con `country=XYZ` en Artistas responde `200` ignorando ese filtro
