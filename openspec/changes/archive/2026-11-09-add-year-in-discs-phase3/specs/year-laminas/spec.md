## ADDED Requirements

### Requirement: Arma la tuya en un año
El año de otra persona SHALL ofrecer "Arma la tuya" a quien no es su dueño. Con sesión SHALL llevar a `/users/<yo>/year/<año>` del mismo año. Sin sesión SHALL
llevar al registro, con enlace al login, con la intención `anio=<año>`; después de registrarse o de iniciar sesión, con contraseña o con Google, la persona SHALL
llegar a su año de ese mismo año. El destino SHALL armarse en el código con el usuario autenticado; un valor que no sea un año entre 2000 y 2100 SHALL
descartarse. Si llegan varias intenciones, SHALL mandar la de Lámina y después la de discografía.

#### Scenario: Visitante anónimo
- **WHEN** una persona sin sesión abre el 2026 compartido de otra
- **THEN** ve el llamado que lleva al registro con `anio=2026`

#### Scenario: Registro con la intención
- **WHEN** una persona se registra desde `/auth/register?anio=2026`
- **THEN** llega a `/<locale>/users/<su-usuario>/year/2026`, no a `/welcome`

#### Scenario: Valor inválido
- **WHEN** una persona abre el registro con `anio=1850` o `anio=abc`
- **THEN** la intención se descarta y el registro sigue su curso normal

#### Scenario: Dueño
- **WHEN** el dueño abre su año
- **THEN** no ve el llamado

### Requirement: Año propio sin escuchas
El dueño que abre un año entre 2000 y el año en curso sin escuchas en ese año SHALL ver su página con un estado vacío que explica que el año sale de su
diario y enlaza a registrar una escucha, sin compartir ni Top 5. Para cualquier otra persona SHALL seguir respondiendo 404, igual que un año futuro.

#### Scenario: Recién registrada
- **WHEN** una persona sin escuchas llega a su 2025 desde "Arma la tuya"
- **THEN** ve el estado vacío con el enlace al diario

#### Scenario: Otra persona
- **WHEN** alguien abre el 2025 sin escuchas de otra persona
- **THEN** recibe 404
