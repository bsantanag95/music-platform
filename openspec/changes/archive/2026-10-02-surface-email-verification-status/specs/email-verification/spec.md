## ADDED Requirements

### Requirement: Aviso de verificación en las superficies autenticadas

El sistema SHALL mostrar un aviso no bloqueante con acción de reenvío a la persona autenticada cuyo `email_verified_at` sea nulo en `/welcome`, Inicio autenticado y todas las pantallas de Ajustes. SHALL ocultar el aviso cuando el email esté verificado. El aviso SHALL reutilizar el reenvío autenticado existente y no SHALL exponer detalles internos del transporte de email.

#### Scenario: Usuario sin verificar abre las superficies acordadas

- **WHEN** una persona autenticada cuyo email no está verificado abre `/welcome`, Inicio o cualquier pantalla de Ajustes
- **THEN** ve un aviso con su estado pendiente y una acción para reenviar el enlace de verificación

#### Scenario: Usuario verificado abre las superficies acordadas

- **WHEN** una persona autenticada cuyo email está verificado abre `/welcome`, Inicio o Ajustes
- **THEN** no ve el aviso de verificación pendiente

#### Scenario: Aviso actualizado después de verificar

- **WHEN** la persona verifica su email y vuelve a Inicio o navega a otra de las superficies acordadas
- **THEN** el siguiente render refleja el estado verificado y oculta el aviso
