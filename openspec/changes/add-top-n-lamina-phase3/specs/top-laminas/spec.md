## ADDED Requirements

### Requirement: Arma la tuya
La página pública de una Lámina SHALL ofrecer el llamado **"Arma la tuya"** a quien no es su dueño, sin ocultar ni recortar la Lámina. Con sesión SHALL llevar a
`/me/laminas?desde=<id>`. Sin sesión SHALL llevar al registro, con un enlace al login, conservando la intención como `lamina=<id>`. Después de registrarse o
de iniciar sesión, con contraseña o con Google, la persona SHALL llegar a `/<locale>/me/laminas?desde=<id>`. La intención SHALL ser solo un identificador
de Lámina validado: un valor que no lo sea SHALL descartarse y el destino SHALL armarse en el código, nunca a partir de una URL del cliente.

#### Scenario: Visitante anónimo
- **WHEN** una persona sin sesión abre una Lámina pública
- **THEN** ve la Lámina entera y el llamado que lleva al registro

#### Scenario: Visitante con sesión
- **WHEN** una persona con sesión abre la Lámina de otra
- **THEN** el llamado lleva a `/me/laminas?desde=<id>`

#### Scenario: Dueño
- **WHEN** el dueño abre su Lámina
- **THEN** no ve el llamado

#### Scenario: Registro con la intención
- **WHEN** una persona se registra con contraseña desde `/auth/register?lamina=<id>`
- **THEN** llega a `/<locale>/me/laminas?desde=<id>`, no a `/welcome`

#### Scenario: Pasar del registro al login
- **WHEN** una persona con `lamina=<id>` va del registro al login
- **THEN** la intención se conserva

#### Scenario: Valor que no es un identificador
- **WHEN** una persona abre `/auth/register?lamina=https://otro.example`
- **THEN** el valor se descarta y el alta sigue su camino normal

#### Scenario: Con sesión en el registro
- **WHEN** una persona con sesión abre `/auth/register?lamina=<id>`
- **THEN** llega a `/me/laminas?desde=<id>`

### Requirement: Formulario inspirado en otra Lámina
`/me/laminas?desde=<id>` SHALL preseleccionar el formato y el tipo de ítem de esa Lámina, ofrecer su título como sugerencia para tocar y enlazar de vuelta a
ella. SHALL NOT copiar sus ítems ni sus notas, y SHALL NOT escribir el título en el campo. La lectura SHALL aplicar las reglas de la página pública: si la
persona no puede ver esa Lámina, si no existe o si es propia, el formulario SHALL quedar como siempre, sin error.

#### Scenario: Llegar desde una Lámina
- **WHEN** una persona abre `/me/laminas?desde=<id>` de un Top 10 de canciones titulado "Mis 10 de 2026"
- **THEN** el formulario tiene Top 10 y canciones elegidos, el título vacío y "Mis 10 de 2026" como sugerencia

#### Scenario: Usar el título sugerido
- **WHEN** toca esa sugerencia
- **THEN** el título queda en el campo y lo puede editar

#### Scenario: Sin ítems ajenos
- **WHEN** crea la Lámina
- **THEN** nace sin los ítems de la otra persona

#### Scenario: Lámina que ya no se ve
- **WHEN** la Lámina de `desde` es privada, está oculta por moderación o no existe
- **THEN** el formulario se muestra como siempre y no revela nada de ella

#### Scenario: Lámina propia
- **WHEN** una persona abre `desde` con una Lámina suya
- **THEN** el formulario se muestra como siempre
