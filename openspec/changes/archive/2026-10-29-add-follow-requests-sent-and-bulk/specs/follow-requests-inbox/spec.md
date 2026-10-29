## ADDED Requirements

### Requirement: Solicitudes enviadas

La bandeja SHALL tener dos pestañas, Recibidas y Enviadas, cada una con su cifra. Enviadas SHALL listar las solicitudes
de seguimiento pendientes que el usuario envió a cuentas activas, de la más reciente a la más antigua y con "Mostrar
más", diciendo cuánto hace que se envió cada una. Cancelar una SHALL quitar la fila y ofrecer Deshacer; la cancelación
SHALL enviarse solo al vencer el aviso, con otra cancelación o al salir de la vista, de modo que deshacer no vuelva a
notificar a la otra persona.

#### Scenario: Revisar las enviadas

- **WHEN** el usuario pidió seguir a dos cuentas privadas que aún no respondieron y abre la pestaña Enviadas
- **THEN** ve las dos, la más reciente primero, cada una con "Cancelar solicitud"

#### Scenario: Cancelar y deshacer

- **WHEN** el usuario cancela una solicitud enviada y pulsa Deshacer
- **THEN** la fila vuelve y la solicitud sigue pendiente sin que la otra persona reciba un aviso nuevo

### Requirement: Aprobar todas

Con al menos 3 solicitudes recibidas pendientes, la bandeja SHALL ofrecer aprobarlas todas, previa confirmación. Al
confirmar SHALL aprobar todas las pendientes de cuentas activas sin bloqueo, también las que no estaban cargadas, y
avisar a cada persona como al aprobarla de a una.

#### Scenario: Aprobar todas

- **WHEN** el usuario tiene 60 solicitudes pendientes, confirma "Aprobar todas"
- **THEN** las 60 personas pasan a seguirlo y cada una recibe el aviso de solicitud aceptada

#### Scenario: Pocas solicitudes

- **WHEN** el usuario tiene 2 solicitudes pendientes
- **THEN** la bandeja no ofrece "Aprobar todas"

### Requirement: Bloquear desde la bandeja

Cada solicitud recibida pendiente SHALL ofrecer, en un menú de acciones nombrado con la persona, ver su perfil y
bloquearla. Bloquear SHALL pedir confirmación y SHALL quitar la solicitud de la bandeja.

#### Scenario: Bloquear a quien pide seguir

- **WHEN** el usuario elige "Bloquear…" en una solicitud y confirma
- **THEN** la solicitud desaparece y esa persona queda bloqueada
