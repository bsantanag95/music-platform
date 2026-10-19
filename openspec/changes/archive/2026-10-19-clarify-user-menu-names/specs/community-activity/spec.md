## MODIFIED Requirements

### Requirement: Acceso desde la navegación global

El sistema SHALL exponer un enlace a `/activity` en la barra general del Header, junto al
buscador, Explorar y Listas, **con y sin sesión**. El enlace SHALL usar la etiqueta
localizada "Comunidad" ("Community" en inglés), y no "Actividad", que nombra el feed de
seguidos del menú de usuario. El enlace SHALL apuntar a la superficie pública `/activity`,
no a `/me/feed`, y el título de la página `/activity` SHALL usar la misma etiqueta. En el
panel móvil del Header el enlace SHALL vivir en el bloque de barra general.

#### Scenario: Enlace visible para cualquiera

- **WHEN** se renderiza el Header, con o sin sesión
- **THEN** la barra general muestra un enlace "Comunidad" hacia `/activity`

#### Scenario: El enlace no lleva al feed personal

- **WHEN** una persona activa el enlace "Comunidad" del Header
- **THEN** llega a `/activity` y no a `/me/feed`

#### Scenario: Título de la página

- **WHEN** una persona abre `/activity`
- **THEN** el título de la página dice "Comunidad"
