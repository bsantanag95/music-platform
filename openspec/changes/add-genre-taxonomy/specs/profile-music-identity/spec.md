## MODIFIED Requirements

### Requirement: Géneros que me mueven

El sistema SHALL permitir que una persona elija hasta 5 géneros de una lista cerrada de claves de
la taxonomía de géneros: `rock`, `punk`, `post-punk`, `indie-rock`, `indie-pop`, `shoegaze`,
`metal`, `hip-hop`, `electronic`, `ambient`, `jazz`, `soul`, `funk`, `folk`, `blues`,
`classical`, `pop`, `latin`, `reggae`, `experimental`, `country` y `bossa-nova`. Cada clave SHALL
existir en la taxonomía como género de estilo y su nombre SHALL mostrarse según el idioma, con las
reglas de nombres de la taxonomía. El campo SHALL ser opcional, vaciable y sin repetidos; el
sistema SHALL rechazar un valor fuera de la lista o un sexto género. No SHALL existir texto libre.
Los valores guardados con las claves anteriores SHALL migrarse sin inventar datos: `soul-funk`
pasa a `soul` y `funk`, `indie` pasa a `indie-rock` e `indie-pop`, y el resto conserva su clave;
si el resultado supera 5 géneros, la migración SHALL abortar en lugar de recortar la elección.

#### Scenario: Elegir géneros

- **WHEN** la persona guarda `post-punk`, `jazz` y `shoegaze`
- **THEN** la ficha de la Placa muestra los tres géneros con su nombre localizado

#### Scenario: Sexto género

- **WHEN** un cliente envía seis géneros
- **THEN** la API responde con un error de validación y los géneros anteriores no cambian

#### Scenario: Género fuera de la lista

- **WHEN** un cliente envía un género que no está en la lista
- **THEN** la API responde con un error de validación

#### Scenario: Clave anterior migrada

- **WHEN** una persona tenía guardados `soul-funk` y `rock` antes de la migración
- **THEN** después de la migración tiene `soul`, `funk` y `rock`

#### Scenario: Clave retirada

- **WHEN** un cliente envía `soul-funk` después de la migración
- **THEN** la API responde con un error de validación
