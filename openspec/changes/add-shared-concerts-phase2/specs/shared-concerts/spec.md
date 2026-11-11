## MODIFIED Requirements

### Requirement: Página del concierto

Cada concierto confirmado SHALL tener una página (`/{locale}/concert/{id}`) con su nombre, fecha, recinto, ciudad y país,
la marca Festival, el cartel (principales primero, luego teloneros e invitados; enlazados al artista si está en el
catálogo, como texto si no), cuántas personas estuvieron, la lista de las que el visitante puede ver y "Estuve ahí". Un
concierto inexistente, oculto o cancelado SHALL responder 404; uno por confirmar SHALL responder 404 a quien no tiene
sesión (capability `community-concerts`). Un concierto fusionado SHALL redirigir al concierto en el que se fusionó.

#### Scenario: Cartel de un festival

- **WHEN** una persona abre "Vive Rock 2023"
- **THEN** ve a Chancho en Piedra, Kuervos del Sur, Pettinellis y Saiko como principales y a El Cruce como telonero, enlazados los que están en el catálogo

#### Scenario: Concierto fusionado

- **WHEN** una persona abre la dirección de un concierto que la moderación fusionó en otro
- **THEN** la página redirige al concierto destino

### Requirement: Estuve ahí

Un usuario autenticado SHALL poder decir "Estuve ahí" en un concierto confirmado o por confirmar (capability
`community-concerts`), no oculto, no cancelado y pasado; en uno por confirmar la asistencia SHALL contar para su
confirmación. Si ya está
enlazado, la acción SHALL ser idempotente. Si tiene un registro personal sin enlazar del mismo artista y la misma fecha
exacta, SHALL enlazarlo en lugar de crear otro. Si no, SHALL crear un registro personal enlazado con el artista de
contexto (o el primer principal que esté en el catálogo), la fecha, el recinto, la ciudad y el país del concierto, y la
audiencia por defecto del usuario. Los datos copiados SHALL ser solo valores iniciales: actualizar el concierto SHALL NOT
modificar el registro personal. Quitar "Estuve ahí" SHALL desenlazar y SHALL borrar el registro solo si lo creó la acción
y la persona no lo editó.

#### Scenario: Sumarse

- **WHEN** una persona sin registros pulsa "Estuve ahí" en un concierto de 2023
- **THEN** se crea su registro enlazado con la fecha y el lugar del concierto y la acción pasa a "Estuviste"

#### Scenario: Ya tenía un registro

- **WHEN** la persona ya registró a mano el mismo artista en la misma fecha
- **THEN** ese registro se enlaza al concierto y no se crea otro

#### Scenario: Concierto futuro o cancelado

- **WHEN** alguien intenta "Estuve ahí" en un concierto futuro o cancelado
- **THEN** la API responde `400` con `VALIDATION_ERROR` y no se crea nada

#### Scenario: Quitar sin perder lo escrito

- **WHEN** la persona agregó una nota a su registro y después quita "Estuve ahí"
- **THEN** el registro queda, sin enlace al concierto
