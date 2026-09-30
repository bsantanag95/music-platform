## MODIFIED Requirements

### Requirement: Perfil localizado de artista
La aplicación SHALL exponer un perfil público en `/{locale}/artist/{slug-id}` (segmento definido por la capability `catalog-slugs`) para los locales soportados y SHALL mostrar la cabecera del artista (foto, identidad, ficha y resumen de la biografía cuando existan, según la capability `artist-header`), su discografía disponible y breadcrumbs localizados dentro del encabezado global del catálogo. Una dirección con un slug desactualizado o con el UUID hexadecimal del formato anterior SHALL redirigir con un 308 a la dirección canónica del mismo artista.

#### Scenario: Artista válido en español
- **WHEN** una persona visita `/es/artist/<segmento-válido>`
- **THEN** la aplicación muestra el nombre y los datos musicales del artista, las etiquetas de interfaz aparecen en español y el breadcrumb enlaza al inicio

#### Scenario: Artista válido en inglés
- **WHEN** una persona visita `/en/artist/<segmento-válido>`
- **THEN** la aplicación muestra el mismo contenido musical, las etiquetas de interfaz aparecen en inglés y el breadcrumb enlaza al inicio

#### Scenario: Artista inexistente
- **WHEN** una persona visita un id que no corresponde a ningún artista
- **THEN** la aplicación responde con un 404 amigable y localizado, sin mostrar el mensaje crudo del backend

#### Scenario: Dirección del formato anterior
- **WHEN** una persona visita `/es/artist/<uuid-hexadecimal>`
- **THEN** la aplicación responde con un 308 a `/es/artist/<slug>-<id>` del mismo artista, conservando la pestaña y el query

#### Scenario: Slug desactualizado
- **WHEN** una persona visita `/es/artist/<slug-viejo>-<id>` tras un renombre del artista
- **THEN** la aplicación responde con un 308 a la dirección con el slug vigente
