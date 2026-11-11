## ADDED Requirements

### Requirement: Pestaña Conciertos en la barra

La barra de pestañas del artista SHALL incluir **Conciertos** como última pestaña (después de Biografía y Premios) cuando
el artista es un grupo o una persona (capability `shared-concerts`), con su propia URL y el mismo comportamiento que las
demás pestañas. Mostrar la barra SHALL NOT consultar MusicBrainz.

#### Scenario: Orden de las pestañas

- **WHEN** una persona abre un grupo con integrantes, biografía y premios
- **THEN** las pestañas son Discografía · Integrantes · Biografía · Premios · Conciertos

#### Scenario: Artista de tipo varios

- **WHEN** una persona abre "Various Artists"
- **THEN** la barra no muestra Conciertos
