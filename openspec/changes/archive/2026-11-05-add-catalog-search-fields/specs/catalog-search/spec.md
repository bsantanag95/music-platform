## ADDED Requirements

### Requirement: Campos del catálogo en el endpoint de búsqueda

`GET /api/catalog/search` SHALL aceptar, en `type=artist`, `activeFrom`, `activeTo`, `role`, `genre`, `award` y
`awardWon`, y en `type=album`, `genre`, `award`, `awardWon` y `artistCountry` (repetible), con la lectura tolerante de la
búsqueda avanzada. Con alguno de ellos, el endpoint SHALL responder sin solicitudes a MusicBrainz ni stubs nuevos, con
`total` exacto, `nextOffset` para la página siguiente de 25 y `catalogOnly: true`; sin ellos, `catalogOnly` SHALL ser
`false` y la respuesta SHALL ser la de siempre. Estos campos bastan por sí solos para buscar sin `q`.

#### Scenario: Página siguiente solo del catálogo
- **WHEN** un cliente pide `type=album&genre=rock&artistCountry=CL&offset=25`
- **THEN** recibe los álbumes 26 a 50 de esa búsqueda, `catalogOnly: true` y ninguna solicitud a MusicBrainz

#### Scenario: Solo un campo del catálogo
- **WHEN** un cliente pide `type=artist&award=any` sin `q`
- **THEN** recibe `200` con los artistas nominados, no `400`
