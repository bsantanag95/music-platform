## ADDED Requirements

### Requirement: Índice y cambios sin guardar en Perfil

La pantalla Perfil SHALL ofrecer un índice de sus secciones que permanezca a la vista al desplazarse, marque la
sección visible y lleve a cada una. Cada sección con un editor SHALL indicar mientras tenga cambios sin guardar, y el
índice SHALL marcar esas secciones. Si hay cambios sin guardar, salir de la pantalla por un enlace de la aplicación o
cerrando o recargando la pestaña SHALL pedir confirmación; confirmar descarta los cambios y continúa, cancelar vuelve
a la pantalla con los cambios intactos.

#### Scenario: Ir a una sección

- **WHEN** el dueño elige "Enlaces" en el índice de Perfil
- **THEN** la pantalla se desplaza a la sección Enlaces y el índice la marca

#### Scenario: Cambios sin guardar

- **WHEN** el dueño edita su bio sin guardar
- **THEN** la sección "Tu identidad" dice que tiene cambios sin guardar y el índice la marca

#### Scenario: Salir con cambios

- **WHEN** el dueño tiene cambios sin guardar y elige "Cuenta y seguridad" en el menú lateral
- **THEN** se le pide confirmar; si cancela, sigue en Perfil con lo escrito, y si confirma, llega a Cuenta

### Requirement: Sesiones plegadas en Cuenta

La pantalla Cuenta y seguridad SHALL mostrar la sesión actual y las 2 más recientes, con una acción para ver el resto,
y SHALL ofrecer cerrar todas las demás sesiones conservando la actual cuando haya al menos otra.

#### Scenario: Muchas sesiones

- **WHEN** el dueño tiene 21 sesiones abiertas y abre Cuenta y seguridad
- **THEN** ve la sesión actual, las 2 más recientes y "Ver las 18 más"

#### Scenario: Cerrar las demás

- **WHEN** el dueño elige "Cerrar las demás"
- **THEN** se cierran todas sus sesiones salvo la actual, que sigue abierta, y la lista muestra solo esta
