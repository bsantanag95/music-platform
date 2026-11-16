## MODIFIED Requirements

### Requirement: Estante "Caminos" en el perfil de un usuario
El sistema SHALL mostrar, en el perfil de un usuario (`/users/[username]`), un estante "Caminos"
con los Caminos propios visibles para quien mira — no archivados, filtrados por la misma matriz
de audiencia que el resto del perfil —, dentro de la sección "Listas", junto a
las listas (ver `social-profiles`, "Cuerpo del perfil en filas"): filas compactas acotadas con
un enlace "+N" hacia una página dedicada `/users/[username]/caminos` cuando hay más Caminos de
los que caben, y colapsado (sin
renderizarse) para un visitante cuando no hay ninguno visible, mostrando en cambio un estante
vacío invitando a crear uno cuando quien mira es el propio dueño. Cada tarjeta SHALL ofrecer la
acción de tracking (Requirement "Trackear el progreso propio sobre una lista ajena" de
`list-saves`) excepto en el propio perfil del dueño, donde SHALL NOT ofrecerse — no es posible
trackear el propio Camino —, y a un visitante sin sesión, al que tampoco SHALL ofrecerse.

#### Scenario: Visitante ve los Caminos públicos de un perfil
- **WHEN** un visitante abre el perfil de un usuario con Caminos visibles para él
- **THEN** ve esos Caminos en "Listas", cada uno con la acción de tracking

#### Scenario: Estante ausente para un visitante sin Caminos visibles
- **WHEN** un visitante abre el perfil de un usuario sin ningún Camino visible para él
- **THEN** el estante "Caminos" no se renderiza

#### Scenario: Estante vacío para el propio dueño
- **WHEN** el propio dueño sin Caminos abre su perfil
- **THEN** ve el estante "Caminos" vacío, invitando a crear uno

#### Scenario: Sin acción de tracking en el propio perfil
- **WHEN** el propio dueño ve el estante "Caminos" de su perfil
- **THEN** ninguna tarjeta ofrece la acción de tracking

#### Scenario: Página dedicada cuando hay más de los que caben en el estante
- **WHEN** un perfil tiene más Caminos visibles que el tope del estante
- **THEN** el estante cierra con un enlace "+N" que lleva a `/users/[username]/caminos`, el
  listado completo paginado

#### Scenario: Sin acción de tracking para un visitante sin sesión
- **WHEN** un visitante sin sesión ve los Caminos de un perfil público
- **THEN** ninguno ofrece la acción de tracking
