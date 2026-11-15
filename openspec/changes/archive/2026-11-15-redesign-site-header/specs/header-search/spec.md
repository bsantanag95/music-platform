## ADDED Requirements

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
