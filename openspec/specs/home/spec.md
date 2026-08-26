# Home Page

## Purpose

Página de Inicio de la aplicación, diferenciada según haya sesión activa o no.
Muestra actividad reciente de la comunidad, listas públicas, y contenido personalizado
para usuarios autenticados.

## Requirements

### Requirement: Contenido de Inicio diferenciado por sesión

El sistema SHALL componer el contenido de `/[locale]` según haya una sesión activa o no.
Sin sesión, la página SHALL mostrar la propuesta de valor (tagline), el buscador y una
llamada a la acción para registrarse o iniciar sesión, y SHALL NOT mostrar accesos rápidos
de usuario ni el preview de feed de seguidos. Con sesión activa, la página SHALL mostrar
accesos rápidos a diario, favoritos, listas y buscador, además de un preview del feed de
seguidos o, si el usuario no sigue a nadie, un bloque de onboarding en su lugar.

#### Scenario: Visitante sin sesión
- **WHEN** un visitante sin sesión abre `/[locale]`
- **THEN** ve tagline, buscador y llamada a la acción para registrarse o iniciar sesión, y
  no ve accesos rápidos de usuario ni preview de feed

#### Scenario: Usuario con sesión y al menos un seguido
- **WHEN** un usuario autenticado que sigue a al menos otra persona con relación aceptada
  abre `/[locale]`
- **THEN** ve accesos rápidos a diario, favoritos y listas, y un preview del feed de
  seguidos con link a `/me/feed`

#### Scenario: Usuario con sesión sin seguidos
- **WHEN** un usuario autenticado que no sigue a nadie abre `/[locale]`
- **THEN** en el lugar del preview de feed ve un bloque de onboarding que lo invita a
  buscar gente o explorar listas públicas, no un feed vacío

### Requirement: Actividad reciente de la comunidad

El sistema SHALL mostrar en Inicio, para cualquier visitante con o sin sesión, un bloque
con los ratings y comentarios públicos más recientes de usuarios con perfil público,
independientemente de si el visitante los sigue. El bloque SHALL excluir actividad de
autores con perfil privado. Si hay sesión activa, SHALL excluir además actividad de
autores con quienes exista un bloqueo en cualquier dirección. El bloque SHALL NOT incluir
escuchas, favoritos ni eventos de lista, y SHALL NOT paginar — muestra un número fijo de
entradas.

#### Scenario: Actividad de perfiles públicos visible para cualquiera
- **WHEN** existen ratings o comentarios recientes de usuarios con perfil público
- **THEN** el bloque de actividad de la comunidad los muestra tanto a un visitante sin
  sesión como a uno con sesión que no los sigue

#### Scenario: Perfil privado excluido
- **WHEN** un usuario con perfil privado publica un rating o comentario
- **THEN** esa entrada no aparece en el bloque de actividad de la comunidad de ningún
  visitante, siga o no a ese usuario

#### Scenario: Bloqueo excluye actividad para el usuario logueado
- **WHEN** un usuario autenticado tiene un bloqueo en cualquier dirección con el autor de
  un rating o comentario público reciente
- **THEN** esa entrada no aparece en su bloque de actividad de la comunidad

#### Scenario: Sin actividad reciente
- **WHEN** no hay ratings ni comentarios recientes de perfiles públicos
- **THEN** el bloque de actividad de la comunidad no se muestra en la página

### Requirement: Listas públicas recientes

El sistema SHALL mostrar en Inicio, para cualquier visitante con o sin sesión, un bloque
con las listas más recientes cuya audiencia sea pública y cuyo propietario tenga perfil
público, sin importar si el visitante sigue a ese propietario. Si hay sesión activa, SHALL
excluir listas de propietarios con quienes exista un bloqueo en cualquier dirección. El
bloque SHALL NOT paginar — muestra un número fijo de listas.

#### Scenario: Lista pública de perfil público visible para cualquiera
- **WHEN** un usuario con perfil público crea o actualiza una lista con audiencia pública
- **THEN** esa lista aparece en el bloque de listas públicas recientes tanto para un
  visitante sin sesión como para uno con sesión que no lo sigue

#### Scenario: Lista de perfil privado excluida
- **WHEN** un usuario con perfil privado crea una lista con audiencia pública
- **THEN** esa lista no aparece en el bloque de listas públicas recientes de ningún
  visitante

#### Scenario: Lista no pública excluida
- **WHEN** un usuario con perfil público crea una lista con audiencia `private` o
  `followers`
- **THEN** esa lista no aparece en el bloque de listas públicas recientes

#### Scenario: Bloqueo excluye listas para el usuario logueado
- **WHEN** un usuario autenticado tiene un bloqueo en cualquier dirección con el
  propietario de una lista pública reciente
- **THEN** esa lista no aparece en su bloque de listas públicas recientes

#### Scenario: Sin listas públicas recientes
- **WHEN** no hay listas públicas recientes de perfiles públicos
- **THEN** el bloque de listas públicas recientes no se muestra en la página
