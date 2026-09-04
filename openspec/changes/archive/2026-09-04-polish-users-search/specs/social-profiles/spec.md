## MODIFIED Requirements

### Requirement: Búsqueda de usuarios

El sistema SHALL permitir buscar usuarios por username o nombre visible desde una superficie dedicada en `/users`, separada de la búsqueda del catálogo musical en `/search`. La búsqueda SHALL mostrar tanto perfiles públicos como privados y SHALL omitir email, password hash, tokens, actividades privadas y datos internos. La interfaz SHALL identificar la superficie con la terminología localizada de Usuarios, SHALL conservar el estado de relación y la acción social correspondiente cuando aplique, SHALL comunicar el término y los resultados cargados, y SHALL permitir continuar la búsqueda cuando existan más páginas.

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

#### Scenario: Término persistido en la URL

- **WHEN** una persona realiza una búsqueda válida en `/users`
- **THEN** la URL conserva el término en el parámetro `q` y la pantalla mantiene la búsqueda social y sus resultados

#### Scenario: Restaurar una búsqueda compartida

- **WHEN** una persona abre `/users?q=ana`
- **THEN** el campo se inicializa con `ana` y la pantalla ejecuta la búsqueda correspondiente sin navegar a `/search`

#### Scenario: Carga incremental de resultados

- **WHEN** la respuesta de búsqueda indica `hasNext=true`
- **THEN** la UI muestra una acción localizada para cargar la siguiente página y agrega sus usuarios a los resultados existentes sin reemplazarlos

#### Scenario: Carga sin bloquear resultados existentes

- **WHEN** una persona solicita otra página de resultados
- **THEN** las tarjetas ya cargadas permanecen visibles, la acción queda ocupada y no se envían requests duplicadas

#### Scenario: Error recuperable de búsqueda

- **WHEN** falla la request inicial o una request de paginación
- **THEN** la UI muestra un error localizado sin ocultar el formulario ni los resultados ya cargados y permite reintentar

#### Scenario: Estado accesible de carga

- **WHEN** la búsqueda inicial está en curso
- **THEN** la zona de resultados comunica que está ocupada y muestra una indicación visual de carga sin anunciar contenido redundante
