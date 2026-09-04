## MODIFIED Requirements

### Requirement: Búsqueda de usuarios

El sistema SHALL permitir buscar usuarios por username o nombre visible desde una superficie dedicada en `/users`, separada de la búsqueda del catálogo musical en `/search`. La búsqueda SHALL mostrar tanto perfiles públicos como privados y SHALL omitir email, password hash, tokens, actividades privadas y datos internos. La interfaz SHALL identificar la superficie con la terminología localizada de Usuarios y SHALL conservar el estado de relación y la acción social correspondiente cuando aplique.

#### Scenario: Encontrar perfil privado

- **WHEN** una persona busca el username de un perfil privado
- **THEN** el resultado muestra el nombre identificable y una acción `Seguir`, sin mostrar sus actividades

#### Scenario: Búsqueda sin coincidencias

- **WHEN** una búsqueda no encuentra usuarios
- **THEN** la UI muestra un estado vacío localizado y no un error técnico

#### Scenario: Búsqueda desde la superficie social

- **WHEN** una persona accede a `/users` desde un enlace contextual de Home o desde Footer
- **THEN** ve un formulario de búsqueda social y sus resultados debajo del formulario, sin ser redirigida a `/search`

#### Scenario: Separación del buscador musical

- **WHEN** una persona utiliza el buscador musical del Header
- **THEN** la navegación continúa dirigiendo a `/search` y no mezcla resultados de usuarios

#### Scenario: Navegación de usuarios fuera del Header

- **WHEN** se renderiza el Header global
- **THEN** no se muestra un enlace fijo a `/users` dentro de la navegación principal

#### Scenario: Presentación responsive de resultados

- **WHEN** se muestran resultados de usuarios en un viewport móvil o de escritorio
- **THEN** las tarjetas permanecen legibles, accesibles y no generan overflow horizontal
