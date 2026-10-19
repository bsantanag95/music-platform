## MODIFIED Requirements

### Requirement: Recorrido en el panel

La fila del recorrido SHALL llamarse "Tu progreso" ("Your progress" en inglés) y SHALL mostrar,
si el usuario tiene un recorrido en curso de ese artista, una barra de progreso discreta sin
fracción numérica y un enlace a su página de gestión; si el recorrido está archivado o
completo, su estado y el mismo enlace; y si no tiene recorrido, la acción "Completar
discografía", que abre el modal de inicio existente. La fila SHALL NOT ofrecer edición,
archivado ni borrado, y SHALL NOT usar la palabra "Recorrido" en su rótulo ni en su acción.

#### Scenario: Recorrido en curso

- **WHEN** un usuario con un recorrido en curso abre el artista
- **THEN** la fila "Tu progreso" muestra la barra discreta y el enlace a la gestión, sin cifras

#### Scenario: Sin recorrido

- **WHEN** un usuario sin recorrido de ese artista pulsa "Completar discografía"
- **THEN** se abre el modal de inicio del recorrido
