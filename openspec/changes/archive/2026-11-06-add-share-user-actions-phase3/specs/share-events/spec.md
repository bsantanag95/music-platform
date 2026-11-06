## MODIFIED Requirements

### Requirement: Validación de los valores
El tipo de objeto, el canal y el formato SHALL validarse contra listas cerradas, tanto en el endpoint
como con `CHECK` en la base. Un valor fuera de lista SHALL rechazarse con `VALIDATION_ERROR`. La
referencia SHALL ser una cadena de 1 a 200 caracteres. Los tipos `review`, `comment`, `list`, `camino`,
`user_collection`, `fingerprint`, `rating` y `listen` SHALL estar entre los valores aceptados.

#### Scenario: Canal desconocido
- **WHEN** se envía un evento con canal `myspace`
- **THEN** la respuesta es `400` con `VALIDATION_ERROR` y no se guarda nada

#### Scenario: Tipo nuevo
- **WHEN** se envía un evento de tipo `comment` con canal `copy`
- **THEN** la respuesta es `204` y el evento se guarda

#### Scenario: Formato Historia
- **WHEN** se envía un evento con formato `story`
- **THEN** la respuesta es `204` y el evento se guarda
