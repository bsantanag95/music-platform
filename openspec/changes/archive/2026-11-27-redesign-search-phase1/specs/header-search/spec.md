## MODIFIED Requirements

### Requirement: Búsqueda persistente en el Header

El sistema SHALL exponer un campo de búsqueda compacto en el Header, visible en toda la
aplicación para cualquier visitante, con o sin sesión activa, con el selector de tipo y las
sugerencias locales de las capacidades `search-scopes` y `search-typeahead`. La excepción es la
página de resultados `/search`, que tiene su propio campo con la consulta en curso. Allí, desde
`lg`, el campo del Header SHALL ocultarse sin cambiar la distribución del Header y sin recibir
foco. Por debajo de `lg`, el control de búsqueda del Header SHALL seguir disponible. El selector del
Header SHALL arrancar siempre en Artistas. Al enviar una consulta con texto no vacío tras
normalizar sin una sugerencia activa, el Header SHALL navegar **siempre** a
`/search?type=<tipo>&q=<consulta>` y SHALL NOT resolver por sí mismo la búsqueda: la redirección
por coincidencia exacta única, cuando corresponde, la decide la página `/search`. Elegir una
sugerencia SHALL navegar directamente a la entidad sugerida. Tras navegar, el campo del Header
SHALL vaciarse y su tipo SHALL volver a Artistas.

#### Scenario: Búsqueda enviada desde el Header
- **WHEN** una persona escribe un texto con el tipo Álbumes y envía el formulario del Header
- **THEN** la aplicación navega a `/search?type=album&q=<consulta>` con el texto normalizado

#### Scenario: El Header no resuelve a un artista
- **WHEN** una persona envía desde el Header el nombre exacto de un artista que existe, sin elegir
  una sugerencia
- **THEN** la aplicación navega a `/search?type=artist&q=<consulta>`, y es la página de
  resultados la que redirige al perfil si ese artista es la única coincidencia exacta o lista los
  homónimos si no lo es

#### Scenario: Disponible en cualquier página
- **WHEN** una persona navega a cualquier página de la aplicación distinta de `/search`, con o sin
  sesión activa
- **THEN** el campo de búsqueda del Header está presente, con su selector de tipo, y disponible
  para usarse

#### Scenario: Un solo buscador en la página de resultados
- **WHEN** una persona abre `/search?type=album&q=the wall` en 1440 px
- **THEN** el único campo de búsqueda visible es el de la página, con `the wall` y Álbumes; el
  Header conserva su logo, navegación y cuenta en el mismo lugar

#### Scenario: Página de resultados en un teléfono
- **WHEN** una persona abre `/search?type=album&q=the wall` en 390 px
- **THEN** el control de búsqueda del Header sigue en la barra y abre su fila como en cualquier
  otra página

#### Scenario: Entrada vacía
- **WHEN** una persona envía el formulario del Header sin texto o únicamente con espacios
- **THEN** la aplicación no realiza ninguna solicitud ni navegación

#### Scenario: Sugerencia elegida desde el Header
- **WHEN** una persona escribe `sabr` en el Header y elige la sugerencia Sabrina Carpenter
- **THEN** la aplicación abre `/artist/<id>` de Sabrina Carpenter directamente

#### Scenario: El Header vuelve a Artistas
- **WHEN** una persona busca desde el Header con el tipo Canciones y la navegación termina
- **THEN** el campo del Header queda vacío y su selector muestra Artistas

### Requirement: Atajo de teclado para la búsqueda del Header

Al pulsar `/` cuando el foco no está en un campo editable ni en un diálogo abierto, el
sistema SHALL llevar el foco al campo de búsqueda del Header en escritorio y, por debajo del
punto de corte `lg`, SHALL abrir la fila de búsqueda con el foco en el campo. En `/search`
desde `lg`, donde el campo del Header está oculto, el atajo SHALL llevar el foco al campo de la
página. El Header SHALL mostrar la pista del atajo dentro del campo en escritorio. El atajo SHALL
NOT actuar si se pulsa con Ctrl, Alt o Meta, ni mientras se escribe en otro campo.

#### Scenario: Enfocar con barra
- **WHEN** una persona en escritorio pulsa `/` mientras lee una página de álbum
- **THEN** el foco pasa al campo de búsqueda del Header y no se escribe la barra en él

#### Scenario: Enfocar en la página de resultados
- **WHEN** una persona en escritorio pulsa `/` mientras lee `/search?type=artist&q=pink`
- **THEN** el foco pasa al campo de la página, que conserva `pink`, y no se escribe la barra

#### Scenario: Escribiendo en otro campo
- **WHEN** una persona escribe `AC/DC` en el campo de una reseña
- **THEN** la barra se escribe en la reseña y el foco no se mueve al Header
