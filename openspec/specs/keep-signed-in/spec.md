# keep-signed-in Specification

## Purpose
Permitir elegir al iniciar sesión si la sesión se mantiene en el dispositivo (renovada con el uso) o dura solo la visita, con la duración, la renovación y los atributos de cookie de cada tipo.

## Requirements
### Requirement: Elegir mantener la sesión al iniciar sesión

El formulario de inicio de sesión SHALL ofrecer una casilla localizada "Mantener la sesión iniciada
en este dispositivo", **marcada por defecto**. `POST /api/auth/login` SHALL aceptar un campo
`remember` booleano y opcional; cuando falte SHALL tratarse como `true`, y cuando no sea booleano SHALL
responder `VALIDATION_ERROR` (400) sin evaluar las credenciales. La casilla SHALL ser accesible por
teclado y estar asociada a su etiqueta.

#### Scenario: Casilla marcada por defecto

- **WHEN** una persona abre la página de inicio de sesión
- **THEN** ve la casilla "Mantener la sesión iniciada en este dispositivo" marcada

#### Scenario: Iniciar sesión con la casilla marcada

- **WHEN** la persona envía credenciales válidas con `remember: true`
- **THEN** se crea una sesión mantenida

#### Scenario: Iniciar sesión sin la casilla

- **WHEN** la persona desmarca la casilla y envía credenciales válidas
- **THEN** se crea una sesión no mantenida

#### Scenario: Cliente que no envía el campo

- **WHEN** un cliente envía credenciales válidas sin el campo `remember`
- **THEN** se crea una sesión mantenida, como antes de esta capacidad

#### Scenario: Valor no booleano

- **WHEN** un cliente envía `remember: "si"`
- **THEN** la API responde `VALIDATION_ERROR` y no se crea ninguna sesión

### Requirement: Sesión mantenida con renovación por uso

Una sesión mantenida SHALL durar 30 días desde su última actividad: mientras la persona la use, el
sistema SHALL extender `expires_at` a 30 días desde ese momento, escribiendo como mucho una vez cada
10 minutos por sesión (la misma escritura que registra la última actividad). Su cookie `music_session`
SHALL ser `httpOnly`, `secure`, `sameSite=lax` y llevar `maxAge` de 400 días; la validez de la sesión
SHALL decidirla siempre el servidor mediante `expires_at`, de modo que una cookie sin sesión vigente
no autentica. La renovación SHALL NOT modificar `created_at`.

#### Scenario: Uso frecuente

- **WHEN** una persona con sesión mantenida entra cada semana durante dos meses
- **THEN** no se le pide iniciar sesión de nuevo en ese período

#### Scenario: Inactividad

- **WHEN** una persona con sesión mantenida no usa la plataforma durante 31 días
- **THEN** la sesión deja de ser válida y se le pide iniciar sesión

#### Scenario: Renovación sin escrituras excesivas

- **WHEN** una sesión mantenida hace 20 peticiones en 5 minutos
- **THEN** su `expires_at` se actualiza como mucho una vez

#### Scenario: Cookie sin sesión vigente

- **WHEN** llega una petición con la cookie de una sesión cuya fila expiró o fue cerrada
- **THEN** no hay sesión válida, aunque la cookie siga en el navegador

#### Scenario: La renovación no cuenta como autenticación reciente

- **WHEN** una sesión mantenida iniciada hace 2 días se renueva por uso
- **THEN** para una acción sensible sigue contando como iniciada hace 2 días

### Requirement: Sesión no mantenida limitada al navegador y a 24 horas

Una sesión no mantenida SHALL usar una cookie de sesión (sin `maxAge`, que el navegador descarta al
cerrarse) con los mismos atributos `httpOnly`, `secure` y `sameSite=lax`, y SHALL caducar en el
servidor 24 horas después de iniciada, sin renovarse con el uso.

#### Scenario: Cookie de sesión

- **WHEN** la persona inicia sesión sin la casilla
- **THEN** la cookie `music_session` se establece sin `maxAge` ni `expires`

#### Scenario: Navegador que restaura la cookie

- **WHEN** el navegador restaura la cookie de una sesión no mantenida 25 horas después de iniciada
- **THEN** la sesión no es válida y se le pide iniciar sesión

#### Scenario: Sin renovación

- **WHEN** una persona usa una sesión no mantenida de forma continua durante 24 horas
- **THEN** la sesión caduca a las 24 horas de iniciada

### Requirement: La elección se conserva y las sesiones existentes siguen vigentes

La elección SHALL guardarse en la sesión (`session.remember`). Las sesiones anteriores a esta
capacidad SHALL seguir siendo válidas y tratarse como mantenidas. El registro de una cuenta SHALL
crear una sesión mantenida. Rotar la sesión sin una elección nueva (confirmar la identidad con Google
con la intención `reauth`) SHALL conservar la elección de la sesión que reemplaza, y SHALL crear una
sesión mantenida cuando no existía ninguna.

#### Scenario: Sesión anterior

- **WHEN** existe una sesión creada antes de esta capacidad, con su cookie de 30 días
- **THEN** sigue siendo válida y, desde ese momento, se renueva con el uso

#### Scenario: Registro

- **WHEN** una persona crea una cuenta
- **THEN** se crea una sesión mantenida

#### Scenario: Reautenticar desde una sesión no mantenida

- **WHEN** una persona con sesión no mantenida confirma su identidad con Google
- **THEN** la sesión rotada sigue siendo no mantenida, con su caducidad de 24 horas contada desde la rotación

#### Scenario: Reautenticar desde una sesión mantenida

- **WHEN** una persona con sesión mantenida confirma su identidad con Google
- **THEN** la sesión rotada sigue siendo mantenida

