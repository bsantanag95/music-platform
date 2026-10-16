## MODIFIED Requirements

### Requirement: Conjunto de seis colecciones del día 0

El sistema SHALL ofrecer seis plantillas que producen una colección válida sin actividad de la comunidad:
`new-releases`, `grammy-winners`, `genre-spotlight`, `anniversaries`, `upcoming` y `one-per-decade`. Cada una
SHALL producir como máximo `COLLECTION_SIZE` álbumes, todos con carátula resuelta, y SHALL omitirse (sin crear
ni modificar listas) si no reúne `MIN_ALBUMS_FOR_SECTION`. Con las seis disponibles, el riel SHALL mostrar
seis tarjetas. Las plantillas de comunidad `top-rated-quarter` y `popular-month` (que reemplaza a `most-reviewed-month`)
SHALL seguir disponibles y, al crearse, SHALL ubicarse por delante de las más débiles dentro del tope del riel.

#### Scenario: Seis tarjetas el día 0

- **WHEN** hay géneros, premios y calendario cargados y se ejecuta la generación
- **THEN** existen seis colecciones vigentes y el riel de `/explore` muestra seis tarjetas

#### Scenario: Plantilla de comunidad sin actividad

- **WHEN** no hay valoraciones ni gestos de la comunidad suficientes
- **THEN** `top-rated-quarter` y `popular-month` no crean colección y el riel conserva las seis del día 0

#### Scenario: La comunidad toma el relevo

- **WHEN** `top-rated-quarter` reúne el mínimo de álbumes valorados
- **THEN** su colección aparece por delante de las más débiles y el riel sigue mostrando como máximo seis
