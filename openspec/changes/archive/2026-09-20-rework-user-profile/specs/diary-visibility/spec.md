## ADDED Requirements

### Requirement: Las entradas destacadas anulan la matriz de visibilidad

Una entrada de diario marcada como destacada (ver capacidad `listen-diary`, "Destacar una
entrada del diario") SHALL ser visible para cualquier visitante con acceso al perfil del
dueño, sin aplicar la matriz de visibilidad por audiencia y relación de seguimiento
(Requirement "Visibilidad del diario ajeno") que rige el resto de las entradas. Un bloqueo
en cualquier dirección entre visitante y dueño SHALL seguir ocultando toda entrada,
destacada o no.

#### Scenario: Entrada destacada visible para un visitante sin relación

- **WHEN** un visitante sin relación de seguimiento abre el perfil público de un usuario
  con una entrada de diario destacada
- **THEN** ve esa entrada, aunque su audiencia subyacente sea `followers` o `private`

#### Scenario: El bloqueo sigue ocultando entradas destacadas

- **WHEN** existe un bloqueo entre el visitante y el dueño
- **THEN** el visitante no ve ninguna entrada del dueño, incluidas las destacadas

#### Scenario: Perfil privado sin relación aprobada

- **WHEN** un visitante sin relación aprobada abre un perfil privado con una entrada
  destacada
- **THEN** no ve esa entrada: la excepción de las destacadas aplica sobre la matriz de
  audiencia, no sobre el requisito de acceso al perfil privado
