## ADDED Requirements

### Requirement: Header reducido en pantallas de foco

En las pantallas de foco (hoy, `/welcome`) el Header SHALL mostrar solo el logo enlazado a Inicio y el selector de idioma, que conserva la ruta al cambiar de idioma. En el resto de las rutas el Header SHALL conservar su estructura completa.

#### Scenario: Header de una pantalla de foco

- **WHEN** se muestra el Header en `/welcome`, con o sin sesión
- **THEN** contiene el logo y el selector de idioma, y no contiene el buscador, la navegación general, las acciones rápidas ni el menú de usuario

#### Scenario: Header del resto del sitio

- **WHEN** se muestra el Header en cualquier otra ruta
- **THEN** conserva el buscador, la navegación general y la zona de usuario
