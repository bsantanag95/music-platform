## ADDED Requirements

### Requirement: Aviso persistente de email pendiente en Inicio autenticado

Inicio SHALL mostrar un aviso compacto y no bloqueante a las personas autenticadas cuyo `email_verified_at` sea nulo, con una acción para reenviar el enlace de verificación. El aviso SHALL desaparecer cuando el email esté verificado y SHALL NOT interferir con el saludo, los accesos rápidos, el onboarding social ni el contenido de Inicio.

#### Scenario: Usuario sin verificar abre Inicio

- **WHEN** una persona autenticada cuyo email no está verificado abre Inicio
- **THEN** ve el aviso de email pendiente y puede usar el resto de la página y la acción de reenvío

#### Scenario: Usuario verificado abre Inicio

- **WHEN** una persona autenticada cuyo email está verificado abre Inicio
- **THEN** no ve el aviso de email pendiente
