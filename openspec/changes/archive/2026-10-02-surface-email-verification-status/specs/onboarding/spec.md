## ADDED Requirements

### Requirement: Aviso no bloqueante de verificación en la bienvenida

La ruta `/[locale]/welcome` SHALL mostrar, antes de las dos puertas, un aviso destacado cuando el email de la persona autenticada no esté verificado. El aviso SHALL explicar que puede continuar usando la cuenta, SHALL ofrecer el reenvío existente y SHALL NOT impedir completar o saltar cualquiera de las puertas.

#### Scenario: Usuario nuevo sin verificar llega a bienvenida

- **WHEN** una persona autenticada con onboarding pendiente y email sin verificar llega a `/welcome`
- **THEN** ve el aviso de verificación antes de las dos puertas y puede interactuar con ambas

#### Scenario: Usuario continúa sin verificar

- **WHEN** una persona sin verificar completa o salta el onboarding sin verificar el email
- **THEN** el onboarding termina con normalidad y la persona llega a Inicio
