## MODIFIED Requirements

### Requirement: Géneros que me mueven

El sistema SHALL permitir que una persona elija hasta 5 géneros de la taxonomía de géneros: cualquier género de estilo visible,
identificado por su slug. El campo SHALL ser opcional, vaciable y sin repetidos; el sistema SHALL validar el formato del slug
y que exista como género de estilo visible, y SHALL rechazar un valor que no cumpla o un sexto género. No SHALL existir
texto libre. El nombre de cada género SHALL mostrarse según el idioma, con las reglas de nombres de la taxonomía. Un slug
guardado que ya no es un estilo visible (género retirado u oculto) SHALL ignorarse al mostrar, sin modificar lo guardado.
Los valores guardados con las claves anteriores a la taxonomía migraron sin inventar datos: `soul-funk` pasa a `soul` y
`funk`, `indie` pasa a `indie-rock` e `indie-pop`.

#### Scenario: Elegir géneros

- **WHEN** la persona guarda `post-punk`, `jazz` y `shoegaze`
- **THEN** la ficha de la Placa muestra los tres géneros con su nombre localizado

#### Scenario: Sexto género

- **WHEN** un cliente envía seis géneros
- **THEN** la API responde con un error de validación y los géneros anteriores no cambian

#### Scenario: Género fuera de la lista

- **WHEN** un cliente envía un slug que no es un género de estilo de la taxonomía
- **THEN** la API responde con un error de validación

#### Scenario: Clave anterior migrada

- **WHEN** una persona tenía guardados `soul-funk` y `rock` antes de la migración
- **THEN** después de la migración tiene `soul`, `funk` y `rock`

#### Scenario: Clave retirada

- **WHEN** un cliente envía `soul-funk` después de la migración
- **THEN** la API responde con un error de validación

#### Scenario: Género fuera de las sugerencias iniciales

- **WHEN** la persona guarda `cumbia-villera`, que no estaba entre los 22 géneros anteriores
- **THEN** la API lo acepta y la ficha de la Placa lo muestra con su nombre localizado

#### Scenario: Género retirado de la taxonomía

- **WHEN** un género guardado pasa a oculto
- **THEN** la ficha no lo muestra y lo guardado no cambia
