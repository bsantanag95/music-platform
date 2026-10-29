# follow-requests-inbox Specification

## Purpose
Define la bandeja `/me/follow-requests`, donde el dueño de un perfil privado responde a quienes piden seguirlo: el orden
y la paginación de las solicitudes recibidas, aprobar (con la opción de seguir de vuelta) y rechazar (con Deshacer, sin
efecto en el servidor hasta que vence el aviso), y lo que muestra sin solicitudes según la privacidad del perfil.

## Requirements
### Requirement: Bandeja de solicitudes recibidas

La bandeja `/me/follow-requests` SHALL listar las solicitudes de seguimiento pendientes dirigidas al usuario, de
cuentas activas, de la más reciente a la más antigua, con el avatar, el nombre, el @usuario y cuánto hace que llegó
cada una. SHALL mostrar todas: las primeras 50 al cargar y las siguientes con "Mostrar más", pedidas por cursor. La
cabecera SHALL decir cuántas hay pendientes y la pestaña del navegador SHALL nombrar la página.

#### Scenario: Orden por fecha

- **WHEN** el usuario tiene una solicitud de hace 3 semanas y otra de ayer
- **THEN** la de ayer aparece primero y cada fila dice cuánto hace que llegó

#### Scenario: Más de 50 solicitudes

- **WHEN** el usuario tiene 60 solicitudes pendientes
- **THEN** ve 50 y "Mostrar 10 más", que trae las restantes sin repetir ni saltar ninguna

### Requirement: Aprobar y rechazar desde la bandeja

Rechazar SHALL quitar la fila y ofrecer Deshacer durante unos segundos; el rechazo SHALL enviarse solo al vencer el
aviso, al hacer otro rechazo o al salir de la vista, y Deshacer SHALL devolver la fila sin que la solicitud haya
cambiado. Aprobar SHALL dejar la fila indicando que esa persona ahora lo sigue y, si el usuario no la sigue, ofrecer
"Seguir de vuelta"; si ya la sigue o le pidió seguirla, SHALL decirlo.

#### Scenario: Rechazar y deshacer

- **WHEN** el usuario rechaza una solicitud y pulsa Deshacer
- **THEN** la fila vuelve a su lugar y la solicitud sigue pendiente

#### Scenario: Aprobar y seguir de vuelta

- **WHEN** el usuario aprueba la solicitud de alguien a quien no sigue
- **THEN** la fila dice "Aprobada · ahora te sigue" y ofrece "Seguir de vuelta"

### Requirement: Bandeja vacía según la privacidad

Sin solicitudes pendientes, la bandeja SHALL explicar el motivo según la privacidad del perfil: con perfil público,
que cualquiera lo sigue sin pedirlo y un enlace para cambiar la privacidad; con perfil privado, que las solicitudes
aparecerán ahí y un enlace a sus Seguidores.

#### Scenario: Perfil público

- **WHEN** un usuario con perfil público abre su bandeja
- **THEN** ve "Tu perfil es público", por qué no le llegan solicitudes y el enlace para cambiar la privacidad

