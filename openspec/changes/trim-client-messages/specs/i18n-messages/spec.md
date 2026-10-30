## ADDED Requirements

### Requirement: El cliente recibe solo los textos que usan sus componentes

El cliente SHALL recibir, en cada ruta, solo las claves de mensajes que usan los componentes cliente de esa ruta, y
nunca el catálogo completo. El layout raíz SHALL entregar únicamente lo que piden sus propios archivos (cabecera, menú
de usuario, pie, error y no encontrado). Cada página o layout cuyos componentes cliente pidan más SHALL declarar su
proveedor con `export default withClientMessages("<archivo de ruta>", Ruta)`, que entrega solo lo que no entregan los
proveedores superiores y se fusiona sobre ellos en el cliente. Cuando una clave no se pueda acotar estáticamente, el
proveedor SHALL entregar su prefijo estático o el namespace entero.

#### Scenario: Una página recibe solo sus textos

- **WHEN** se abre `/es/me/feed`
- **THEN** la respuesta lleva los textos del layout raíz y los de los componentes cliente del feed, y no los de otras
  áreas (por ejemplo los de la pantalla de perfil de ajustes)

#### Scenario: Ninguna clave falta en el cliente

- **WHEN** un componente cliente de una ruta llama a `t("clave")` con un namespace de `useTranslations`
- **THEN** esa clave está en los textos que recibe el cliente en esa ruta, en es y en en

#### Scenario: Clave dinámica

- **WHEN** un componente llama a `` t(`kinds.${kind}`) ``
- **THEN** el cliente recibe todo el subárbol `kinds` de ese namespace

### Requirement: El reparto de textos se verifica en CI

El reparto de textos por ruta SHALL generarse a partir del código (`pnpm run i18n:client-messages` escribe
`src/i18n/client-messages.json`) y una prueba SHALL fallar si el archivo no coincide con el código, si una ruta pide
textos que el layout raíz no entrega sin declarar su proveedor, si un proveedor no coincide con su archivo de ruta o si
no aporta textos.

#### Scenario: Clave nueva sin regenerar

- **WHEN** un componente cliente empieza a usar una clave nueva y no se regenera `client-messages.json`
- **THEN** la prueba de textos del cliente falla y pide correr `pnpm run i18n:client-messages`

#### Scenario: Página nueva con textos propios

- **WHEN** se agrega una página cuyos componentes cliente usan textos que el layout raíz no entrega, sin
  `withClientMessages`
- **THEN** la prueba falla nombrando el archivo de ruta
