## ADDED Requirements

### Requirement: Lámina en el feed
Una Lámina nueva con al menos un ítem SHALL entrar al feed de sus seguidores como una lista nueva, con su audiencia y las mismas exclusiones: privada,
oculta por moderación o de alguien bloqueado no SHALL aparecer. La entrada SHALL enlazar a la página de la Lámina.

#### Scenario: Lámina pública
- **WHEN** una persona publica un Top 5 con ítems
- **THEN** sus seguidores ven la entrada en el feed

#### Scenario: Lámina privada
- **WHEN** una persona crea una Lámina privada
- **THEN** no entra al feed
