## ADDED Requirements

### Requirement: Un Camino oculto no se lee desde la vista ajena
La vista de lectura de un Camino ajeno SHALL responder `404` si el Camino está oculto por moderación, aunque su audiencia
lo permita. El dueño SHALL seguir viendo y gestionando su Camino oculto.

#### Scenario: Visitante con la dirección directa
- **WHEN** un visitante abre la dirección de un Camino público oculto por moderación
- **THEN** la respuesta es `404`

#### Scenario: Dueño de un Camino oculto
- **WHEN** el dueño abre su Camino oculto en `/me/caminos/<id>`
- **THEN** lo ve y lo puede gestionar
