## ADDED Requirements

### Requirement: Registro enlazado a un concierto compartido

Un registro personal SHALL poder estar enlazado a un concierto compartido (capability `shared-concerts`), a lo sumo uno
por persona y concierto, con la regla en la base. Borrar el concierto SHALL dejar el registro sin enlace, no borrarlo.
Mis conciertos y la página de conciertos de un perfil SHALL mostrar en un registro enlazado un enlace a la página del
concierto. Editar un registro enlazado SHALL NOT cambiar el concierto, y los datos del registro SHALL seguir siendo de la
persona.

#### Scenario: Enlace visible

- **WHEN** una persona dijo "Estuve ahí" en un concierto
- **THEN** en Mis conciertos su registro enlaza a la página del concierto

#### Scenario: Concierto borrado

- **WHEN** se borra un concierto compartido con registros enlazados
- **THEN** los registros siguen existiendo sin enlace

#### Scenario: Dos veces en el mismo concierto

- **WHEN** se intenta enlazar un segundo registro de la misma persona al mismo concierto
- **THEN** la base lo rechaza
