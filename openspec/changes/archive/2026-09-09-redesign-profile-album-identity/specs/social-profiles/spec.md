## MODIFIED Requirements

### Requirement: Composición del perfil por nivel de acceso

El perfil SHALL componerse desde un único árbol de componentes con tres niveles de acceso
determinados por la relación del visitante: no autorizado, autorizado (público o seguidor
aprobado) y dueño. La identidad extendida SHALL renderizarse en los tres niveles. El aviso
de perfil privado y su llamada a la acción de seguir SHALL renderizarse solo en el nivel no
autorizado sobre un perfil privado. La huella, la sección "Álbumes favoritos", los
destacados, el himno y los estantes de contenido SHALL renderizarse solo en los niveles
autorizado y dueño.

#### Scenario: Perfil privado sin autorización

- **WHEN** se compone la vista de un perfil privado para un visitante sin autorización
- **THEN** se muestran la identidad extendida, el aviso de perfil privado y la acción de
  seguir o solicitar, y nada más

#### Scenario: Estante de contenido vacío

- **WHEN** un visitante autorizado abre un perfil cuyo diario, favoritos, listas o
  colección no tienen elementos visibles
- **THEN** ese estante no se muestra y el resto del perfil se compone sin espacios vacíos

#### Scenario: Álbumes favoritos en el nivel autorizado

- **WHEN** un visitante autorizado abre un perfil cuyo dueño tiene álbumes favoritos
  fijados visibles para él
- **THEN** ve la sección "Álbumes favoritos"; un visitante no autorizado de un perfil
  privado no la ve

#### Scenario: Estado bloqueado

- **WHEN** el visitante y el dueño del perfil tienen una relación de bloqueo
- **THEN** el perfil muestra el estado de bloqueo y su acción correspondiente, sin huella,
  álbumes favoritos, destacados ni estantes
