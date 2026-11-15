## ADDED Requirements

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
