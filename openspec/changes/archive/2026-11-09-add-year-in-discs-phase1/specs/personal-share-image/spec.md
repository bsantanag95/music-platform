## ADDED Requirements

### Requirement: Año propio
El año en discos SHALL ser un objeto propio con referencia `<userId>.<año>`: su dueño SHALL recibir el estado para compartirlo y la imagen privada mientras
no esté marcado, el gesto SHALL crear la marca del año con la zona horaria del dueño y avisar antes qué se verá, y dejar de compartir SHALL borrarla.

#### Scenario: Año sin marca
- **WHEN** el dueño, con el perfil público, pide el estado de su año 2026 sin marca
- **THEN** la respuesta es `needs_gesture`, con la imagen personal y el aviso de qué se verá

#### Scenario: Dejar de compartir
- **WHEN** el dueño deja de compartir su año
- **THEN** la marca se borra y un anónimo ya no lo ve
