## MODIFIED Requirements

### Requirement: Detalle localizado de álbum

La aplicación SHALL exponer una vista pública en `/{locale}/album/{slug-id}` (segmento definido por la capability `catalog-slugs`, con el artista principal y el título en el slug) para los locales soportados y SHALL mostrar la carátula, la edición seleccionada y el tracklist del `release_group` identificado por el id propio contenido en el segmento. Una dirección con un slug desactualizado o con el UUID hexadecimal del formato anterior SHALL redirigir con un 308 a la dirección canónica del mismo álbum, conservando la pestaña y el query.

#### Scenario: Álbum válido en español

- **WHEN** una persona visita `/es/album/<segmento-válido>`
- **THEN** la aplicación muestra la información musical del álbum y las etiquetas de interfaz en español

#### Scenario: Álbum válido en inglés

- **WHEN** una persona visita `/en/album/<segmento-válido>`
- **THEN** la aplicación muestra la misma información musical y las etiquetas de interfaz en inglés

#### Scenario: Dirección del formato anterior

- **WHEN** una persona visita `/es/album/<uuid-hexadecimal>/credits?view=songs`
- **THEN** la aplicación responde con un 308 a `/es/album/<slug>-<id>/credits?view=songs` del mismo álbum

### Requirement: Enlaces de tracks a canciones

Cada track del detalle de álbum SHALL enlazar su `recordingId` a `/{locale}/song/{slug-id}` con el segmento canónico de esa grabación (artista principal de la grabación y título) y SHALL conservar créditos, duración y posición visibles.

#### Scenario: Track navegable

- **WHEN** una persona selecciona un track del álbum
- **THEN** la navegación llega al detalle de la grabación con el mismo locale, el id correcto y sin pasar por ninguna redirección
