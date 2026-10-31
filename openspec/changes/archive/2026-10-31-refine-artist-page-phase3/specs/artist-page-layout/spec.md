## ADDED Requirements

### Requirement: Pestaña Premios en la barra

La barra de pestañas del artista SHALL incluir **Premios** después de Biografía cuando el artista tiene alguna
nominación (capability `artist-awards-tab`), con su propia URL y el mismo comportamiento que las demás pestañas.

#### Scenario: Orden de las pestañas

- **WHEN** una persona abre un grupo con integrantes, biografía y premios
- **THEN** las pestañas son Discografía · Integrantes · Biografía · Premios
