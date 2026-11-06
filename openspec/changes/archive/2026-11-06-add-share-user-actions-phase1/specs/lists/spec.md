## ADDED Requirements

### Requirement: Una lista oculta no se lee desde la vista ajena
La vista de lectura de una lista ajena SHALL responder `404` si la lista está oculta por moderación, aunque su audiencia
la permita. El dueño SHALL seguir viendo y gestionando su lista oculta.

#### Scenario: Visitante con la dirección directa
- **WHEN** un visitante abre la dirección de una lista pública oculta por moderación
- **THEN** la respuesta es `404`

#### Scenario: Dueño de una lista oculta
- **WHEN** el dueño abre su lista oculta en `/me/lists/<id>`
- **THEN** la ve y la puede gestionar
