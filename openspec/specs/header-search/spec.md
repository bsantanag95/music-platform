# header-search

## Purpose

Búsqueda de catálogo compacta y persistente desde el Header, disponible en toda la
aplicación para cualquier sesión.
## Requirements
### Requirement: Búsqueda persistente en el Header

El sistema SHALL exponer un campo de búsqueda compacto en el Header, visible en toda la
aplicación para cualquier visitante, con o sin sesión activa, con el selector de tipo y las
sugerencias locales de las capacidades `search-scopes` y `search-typeahead`. El selector del
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
- **WHEN** una persona navega a cualquier página de la aplicación, con o sin sesión activa
- **THEN** el campo de búsqueda del Header está presente, con su selector de tipo, y disponible
  para usarse

#### Scenario: Entrada vacía
- **WHEN** una persona envía el formulario del Header sin texto o únicamente con espacios
- **THEN** la aplicación no realiza ninguna solicitud ni navegación

#### Scenario: Sugerencia elegida desde el Header
- **WHEN** una persona escribe `sabr` en el Header y elige la sugerencia Sabrina Carpenter
- **THEN** la aplicación abre `/artist/<id>` de Sabrina Carpenter directamente

#### Scenario: El Header vuelve a Artistas
- **WHEN** una persona busca desde el Header con el tipo Canciones y la navegación termina
- **THEN** el campo del Header queda vacío y su selector muestra Artistas

### Requirement: Búsqueda del Header en pantallas angostas

En los anchos en que la navegación del Header se agrupa en un menú desplegable, el sistema
SHALL mostrar en la barra del Header, fuera de ese menú, un control propio que abra la
búsqueda del Header, y SHALL NOT ubicar la búsqueda dentro del menú. Al abrirse, la
búsqueda SHALL ocupar una fila bajo la barra con el mismo selector de tipo, sugerencias y
navegación que en pantallas anchas, y SHALL recibir el foco. La búsqueda abierta SHALL
cerrarse con Escape, con el mismo control o al navegar, devolviendo el foco al control. El
control SHALL tener un nombre accesible y un área táctil de al menos 44 × 44 px. Abrir la
búsqueda SHALL cerrar el menú si estaba abierto, y viceversa.

#### Scenario: Abrir la búsqueda en un teléfono
- **WHEN** una persona, con o sin sesión, toca el control de búsqueda del Header en una
  pantalla de 390 px de ancho
- **THEN** aparece bajo la barra el campo de búsqueda con su selector de tipo, con el foco
  en el campo, sin abrir el menú

#### Scenario: El menú ya no contiene la búsqueda
- **WHEN** una persona abre el menú del Header en una pantalla angosta
- **THEN** el menú muestra la navegación y las acciones de cuenta, pero no un campo de
  búsqueda

#### Scenario: Cerrar con Escape
- **WHEN** la búsqueda del Header está abierta en una pantalla angosta y la persona pulsa
  Escape
- **THEN** la fila de búsqueda se cierra y el foco vuelve al control de búsqueda

#### Scenario: Búsqueda enviada en pantalla angosta
- **WHEN** una persona envía una consulta desde la búsqueda abierta en una pantalla angosta
- **THEN** la aplicación navega a `/search?type=<tipo>&q=<consulta>` y la fila de búsqueda
  se cierra

### Requirement: Buscador del Header a todo el ancho disponible

En escritorio, el campo de búsqueda del Header SHALL ocupar el espacio libre entre la
navegación y la zona de cuenta, con un ancho mínimo que deje legible el texto de ejemplo y un
ancho máximo de lectura, en lugar de un ancho fijo que crece al recibir el foco. Su
comportamiento (selector de tipo, sugerencias, navegación y reinicio a Artistas) SHALL NOT
cambiar.

#### Scenario: Buscador ancho con sesión
- **WHEN** un usuario con sesión abre una página en una pantalla de 1280 px
- **THEN** el buscador del Header es más ancho que cada enlace de la navegación y la fila del
  Header no desborda ni oculta el menú de usuario

### Requirement: Atajo de teclado para la búsqueda del Header

Al pulsar `/` cuando el foco no está en un campo editable ni en un diálogo abierto, el
sistema SHALL llevar el foco al campo de búsqueda del Header en escritorio y, por debajo del
punto de corte `lg`, SHALL abrir la fila de búsqueda con el foco en el campo. El Header SHALL
mostrar la pista del atajo dentro del campo en escritorio. El atajo SHALL NOT actuar si se
pulsa con Ctrl, Alt o Meta, ni mientras se escribe en otro campo.

#### Scenario: Enfocar con barra
- **WHEN** una persona en escritorio pulsa `/` mientras lee una página de álbum
- **THEN** el foco pasa al campo de búsqueda del Header y no se escribe la barra en él

#### Scenario: Escribiendo en otro campo
- **WHEN** una persona escribe `AC/DC` en el campo de una reseña
- **THEN** la barra se escribe en la reseña y el foco no se mueve al Header

