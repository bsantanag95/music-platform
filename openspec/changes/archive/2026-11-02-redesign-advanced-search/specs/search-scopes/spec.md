## ADDED Requirements

### Requirement: La búsqueda rápida enlaza a la avanzada

`/search` SHALL ser el buscador rápido: campo con tipo, pastillas (Persona/Grupo, categoría, década) y resultados, sin
panel de filtros. Junto al campo SHALL ofrecer un enlace **Búsqueda avanzada** a
`/search/advanced?type=<tipo>&q=<texto>` (Artistas, Álbumes y Canciones; no en Usuarios). Si la URL de `/search` trae
algún criterio que la búsqueda rápida no tiene (cualquiera de `advanced-search-filters` salvo `q`, `artistType`, una sola
`category` y `decade`), la página SHALL redirigir a `/search/advanced` con los mismos parámetros.

#### Scenario: Enlace a la avanzada
- **WHEN** una persona en `/search?type=album&q=maiden` pulsa **Búsqueda avanzada**
- **THEN** la aplicación abre `/search/advanced?type=album&q=maiden` con el título prellenado

#### Scenario: Enlace de la fase anterior
- **WHEN** una persona abre `/search?type=artist&q=sumo&country=AR`
- **THEN** la aplicación redirige a `/search/advanced?type=artist&q=sumo&country=AR`

#### Scenario: Pastillas siguen en la rápida
- **WHEN** una persona abre `/search?type=album&q=kiss&category=studio&decade=1970`
- **THEN** la página no redirige y muestra los resultados con esas pastillas activas
