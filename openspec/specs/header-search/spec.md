# header-search

## Purpose

Búsqueda de catálogo compacta y persistente desde el Header, disponible en toda la
aplicación para cualquier sesión.
## Requirements
### Requirement: Búsqueda persistente en el Header

El sistema SHALL exponer un campo de búsqueda compacto en el Header, visible en toda la
aplicación para cualquier visitante, con o sin sesión activa, con el selector de tipo y las
sugerencias locales de las capacidades `search-scopes` y `search-typeahead`. El selector del
Header SHALL arrancar siempre en Artistas. Al enviar una consulta con texto no vacío tras
normalizar sin una sugerencia activa, el Header SHALL navegar **siempre** a
`/search?type=<tipo>&q=<consulta>` y SHALL NOT resolver por sí mismo la búsqueda: la redirección
por coincidencia exacta única, cuando corresponde, la decide la página `/search`. Elegir una
sugerencia SHALL navegar directamente a la entidad sugerida. Tras navegar, el campo del Header
SHALL vaciarse y su tipo SHALL volver a Artistas.

#### Scenario: Búsqueda enviada desde el Header
- **WHEN** una persona escribe un texto con el tipo Álbumes y envía el formulario del Header
- **THEN** la aplicación navega a `/search?type=album&q=<consulta>` con el texto normalizado

#### Scenario: El Header no resuelve a un artista
- **WHEN** una persona envía desde el Header el nombre exacto de un artista que existe, sin elegir
  una sugerencia
- **THEN** la aplicación navega a `/search?type=artist&q=<consulta>`, y es la página de
  resultados la que redirige al perfil si ese artista es la única coincidencia exacta o lista los
  homónimos si no lo es

#### Scenario: Disponible en cualquier página
- **WHEN** una persona navega a cualquier página de la aplicación, con o sin sesión activa
- **THEN** el campo de búsqueda del Header está presente, con su selector de tipo, y disponible
  para usarse

#### Scenario: Entrada vacía
- **WHEN** una persona envía el formulario del Header sin texto o únicamente con espacios
- **THEN** la aplicación no realiza ninguna solicitud ni navegación

#### Scenario: Sugerencia elegida desde el Header
- **WHEN** una persona escribe `sabr` en el Header y elige la sugerencia Sabrina Carpenter
- **THEN** la aplicación abre `/artist/<id>` de Sabrina Carpenter directamente

#### Scenario: El Header vuelve a Artistas
- **WHEN** una persona busca desde el Header con el tipo Canciones y la navegación termina
- **THEN** el campo del Header queda vacío y su selector muestra Artistas

