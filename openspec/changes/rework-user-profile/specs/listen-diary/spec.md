## ADDED Requirements

### Requirement: Destacar una entrada del diario

El sistema SHALL permitir al propietario destacar hasta un máximo de **6** entradas propias
de diario. Una entrada destacada SHALL ser visible para cualquier visitante con acceso al
perfil del dueño, sin importar la audiencia (`private`, `followers` o `public`) que tenga
asignada. Destacar y quitar el destacado SHALL ser operaciones idempotentes. Destacar una
entrada SHALL NOT modificar su audiencia subyacente: al quitar el destacado, la entrada
vuelve a regirse únicamente por su audiencia y por la matriz de visibilidad general (ver
`diary-visibility`).

#### Scenario: Destacar hace visible una entrada más allá de su audiencia

- **WHEN** el propietario destaca una entrada de diario cuya audiencia es `followers`
- **THEN** un visitante sin relación de seguimiento aprobada puede ver esa entrada en la
  sección de destacados del perfil

#### Scenario: Quitar el destacado restaura la regla de audiencia

- **WHEN** el propietario quita el destacado de una entrada cuya audiencia es `followers`
- **THEN** un visitante sin relación de seguimiento aprobada deja de ver esa entrada

#### Scenario: Exceder el máximo de destacadas

- **WHEN** el propietario intenta destacar una séptima entrada
- **THEN** la API responde `400` con código `VALIDATION_ERROR` y el conjunto de destacadas
  no cambia

#### Scenario: Destacar de forma idempotente

- **WHEN** el propietario destaca una entrada que ya estaba destacada
- **THEN** la operación responde sin error y no duplica el estado

#### Scenario: Destacar una entrada ajena

- **WHEN** una request intenta destacar una entrada de diario que no pertenece a quien la
  envía
- **THEN** la API responde `404` con código `LISTEN_ENTRY_NOT_FOUND` y no destaca nada
