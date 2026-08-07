## MODIFIED Requirements

### Requirement: Perfil localizado de artista

La aplicación SHALL exponer un perfil público en `/{locale}/artist/{id}` para los locales
soportados y SHALL mostrar el nombre del artista, su tipo traducido, su biografía cuando exista,
su discografía disponible y breadcrumbs localizados dentro del encabezado global del catálogo.

#### Scenario: Artista válido en español

- **WHEN** una persona visita `/es/artist/<id-válido>`
- **THEN** la aplicación muestra el nombre y los datos musicales del artista, las etiquetas de
  interfaz aparecen en español y el breadcrumb enlaza al inicio

#### Scenario: Artista válido en inglés

- **WHEN** una persona visita `/en/artist/<id-válido>`
- **THEN** la aplicación muestra el mismo contenido musical, las etiquetas de interfaz aparecen
  en inglés y el breadcrumb enlaza al inicio

#### Scenario: Artista inexistente

- **WHEN** una persona visita un id que no corresponde a ningún artista
- **THEN** la aplicación responde con un 404 amigable y localizado, sin mostrar el mensaje crudo
  del backend
