## MODIFIED Requirements

### Requirement: Lista de favoritos propios
El sistema SHALL permitir al usuario autenticado listar sus propios favoritos con paginación,
incluyendo por cada favorito el objetivo, su audiencia, su fecha de creación y —para los
favoritos de álbum— la carátula del álbum (`target.coverThumbUrl`); los favoritos de artista
y de canción no exponen carátula. La respuesta SHALL incluir el **conteo de favoritos propios
por tipo de entidad (`counts`)**, calculado sobre el conjunto completo y no solo sobre la
página cargada. La respuesta SHALL aceptar, combinables, los parámetros opcionales de
**búsqueda por texto (`q`) sobre el título del objetivo y sobre el nombre del artista
acreditado de los álbumes y canciones**, **filtro por tipo de entidad
(`type`)**, **filtro por audiencia (`audience`)** y **orden (`sort`, entre recencia y
alfabético por título del objetivo)**, aplicados en el servidor sobre el conjunto completo de
favoritos propios. Sin ningún parámetro, el orden SHALL ser cronológico descendente y el
comportamiento SHALL ser equivalente al listado paginado previo, ampliado con `counts`.

#### Scenario: Listar favoritos propios
- **WHEN** un usuario autenticado abre su página de favoritos
- **THEN** ve sus favoritos ordenados del más reciente al más antiguo, paginados, cada uno
  con su audiencia y, si es un favorito de álbum, su carátula; y el conteo por tipo

#### Scenario: Sin favoritos
- **WHEN** un usuario sin favoritos abre su página de favoritos
- **THEN** ve un estado vacío localizado y no un error técnico, y `counts` es cero para los
  tres tipos

#### Scenario: Buscar entre los favoritos propios
- **WHEN** el usuario filtra con `q` coincidiendo parcialmente con el título de algún objetivo
- **THEN** solo aparecen sus favoritos cuyo título del objetivo coincide, sin distinguir
  mayúsculas, con paginación válida

#### Scenario: Buscar por el artista de un álbum o canción
- **WHEN** el usuario filtra con `q` coincidiendo parcialmente con el nombre del artista
  acreditado de sus favoritos de álbum y de canción, cuyos títulos no contienen ese texto
- **THEN** aparecen esos álbumes y canciones junto con el favorito del propio artista, si lo
  tiene, sin distinguir mayúsculas; y `counts` refleja solo lo que coincide

#### Scenario: Filtrar por tipo y por audiencia y ordenar
- **WHEN** el usuario filtra por `type=release-group`, `audience=public` y pide `sort=alpha`
- **THEN** solo aparecen sus favoritos de álbum de audiencia `public`, ordenados
  alfabéticamente por título del objetivo

#### Scenario: Parámetros inválidos
- **WHEN** el usuario envía un `type`, un `audience` o un `sort` fuera de los valores
  permitidos, o una paginación fuera de rango
- **THEN** la API responde `400` con código `VALIDATION_ERROR` y no ejecuta la lectura

#### Scenario: Sesión requerida
- **WHEN** una request sin sesión pide el listado de favoritos propios
- **THEN** la API responde `401` con código `AUTH_REQUIRED`
