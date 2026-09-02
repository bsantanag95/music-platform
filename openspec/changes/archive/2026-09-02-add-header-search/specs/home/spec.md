## MODIFIED Requirements

### Requirement: Contenido de Inicio diferenciado por sesión

El sistema SHALL componer el contenido de `/[locale]` según haya una sesión activa o no.
Sin sesión, la página SHALL mostrar la propuesta de valor (tagline), el buscador y una
llamada a la acción para registrarse o iniciar sesión, y SHALL NOT mostrar accesos rápidos
de usuario ni el preview de feed de seguidos. Con sesión activa, la página SHALL mostrar
accesos rápidos a diario, favoritos, listas y buscador, además de un preview del feed de
seguidos o, si el usuario no sigue a nadie, un bloque de onboarding en su lugar, y SHALL NOT
mostrar el buscador del hero (esa entrada queda cubierta por la búsqueda persistente del
Header y por el acceso rápido "buscar").

#### Scenario: Visitante sin sesión
- **WHEN** un visitante sin sesión abre `/[locale]`
- **THEN** ve tagline, buscador y llamada a la acción para registrarse o iniciar sesión, y
  no ve accesos rápidos de usuario ni preview de feed

#### Scenario: Usuario con sesión y al menos un seguido
- **WHEN** un usuario autenticado que sigue a al menos otra persona con relación aceptada
  abre `/[locale]`
- **THEN** ve accesos rápidos a diario, favoritos y listas, y un preview del feed de
  seguidos con link a `/me/feed`, y no ve el buscador del hero

#### Scenario: Usuario con sesión sin seguidos
- **WHEN** un usuario autenticado que no sigue a nadie abre `/[locale]`
- **THEN** en el lugar del preview de feed ve un bloque de onboarding que lo invita a
  buscar gente o explorar listas públicas, no un feed vacío, y no ve el buscador del hero
