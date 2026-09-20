## ADDED Requirements

### Requirement: Fijar una valoración como destacada

El sistema SHALL permitir a un usuario autenticado destacar hasta un máximo de **6**
valoraciones propias (de artista, álbum o canción) para su perfil. Destacar SHALL requerir
que la valoración ya exista. Una valoración destacada SHALL ser visible con audiencia
efectiva `public`, sin importar que las valoraciones no tengan audiencia propia (ver
`taste-fingerprint`, "Huella de gusto filtrada por audiencia"). Quitar el destacado SHALL
devolver la valoración a la regla general de visibilidad (solo el dueño y sus seguidores en
relación aceptada). Destacar y quitar el destacado SHALL ser operaciones idempotentes.

#### Scenario: Fijar una valoración propia

- **WHEN** el dueño destaca una valoración propia de un álbum
- **THEN** esa valoración queda visible para cualquier visitante del perfil, incluido uno
  sin relación de seguimiento con el dueño

#### Scenario: Quitar el destacado de una valoración

- **WHEN** el dueño quita el destacado de una valoración que tenía marcada
- **THEN** esa valoración vuelve a ser visible únicamente para el dueño y sus seguidores en
  relación aceptada

#### Scenario: Exceder el máximo

- **WHEN** el dueño intenta destacar una séptima valoración
- **THEN** la API responde `400` con código `VALIDATION_ERROR` y el conjunto de valoraciones
  destacadas no cambia

#### Scenario: Destacar una valoración inexistente o ajena

- **WHEN** el dueño intenta destacar una valoración que no existe o no le pertenece
- **THEN** la API responde `404` con un código de error propio y no destaca nada

#### Scenario: Destacar de forma idempotente

- **WHEN** el dueño destaca una valoración que ya estaba destacada
- **THEN** la operación responde sin error y no duplica el estado

### Requirement: Sección "Valoraciones destacadas" del perfil

El perfil SHALL exponer una sección "Valoraciones destacadas" con las valoraciones que el
dueño destacó, en el orden en que las destacó, visible para cualquier visitante con acceso
al perfil sin importar su relación con el dueño. La sección SHALL NOT renderizarse cuando el
dueño no tiene ninguna valoración destacada.

#### Scenario: Perfil con valoraciones destacadas

- **WHEN** un visitante sin relación de seguimiento abre el perfil accesible de un usuario
  con valoraciones destacadas
- **THEN** ve la sección "Valoraciones destacadas" con esas valoraciones, aunque no vería el
  resto de las valoraciones del dueño

#### Scenario: Sin valoraciones destacadas

- **WHEN** el dueño no tiene ninguna valoración destacada
- **THEN** la sección "Valoraciones destacadas" no aparece en el perfil
