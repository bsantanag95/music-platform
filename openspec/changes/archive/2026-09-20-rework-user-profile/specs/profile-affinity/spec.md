## ADDED Requirements

### Requirement: Indicadores de afinidad en "Exploración"

Cuando el bloque de afinidad ya calculado (ver "Coincidencias entre visitante y dueño")
incluye artistas que ambos siguen, la sección "Exploración" del perfil SHALL indicar, sobre
cada artista seguido por el dueño que el visitante también sigue, una insignia discreta que
señale la coincidencia. La insignia SHALL reutilizar el mismo cálculo del bloque de
afinidad, sin una consulta adicional independiente, y SHALL respetar las mismas condiciones
que el resto del bloque (visitante autenticado que no es el dueño, sin bloqueo entre ambos).

#### Scenario: Artista en común marcado en Exploración

- **WHEN** un visitante autenticado que sigue a un artista abre el perfil de otra persona
  que también sigue a ese artista
- **THEN** la tarjeta de ese artista en la sección "Exploración" del dueño muestra la
  insignia de coincidencia

#### Scenario: Sin sesión, sin insignia

- **WHEN** un visitante sin sesión abre la sección "Exploración" de un perfil
- **THEN** ninguna tarjeta de artista muestra la insignia de coincidencia

#### Scenario: Dueño viendo su propio perfil

- **WHEN** el dueño ve su propia sección "Exploración"
- **THEN** ninguna tarjeta muestra la insignia de coincidencia

#### Scenario: Relación de bloqueo

- **WHEN** existe una relación de bloqueo entre el visitante y el dueño
- **THEN** ninguna tarjeta de "Exploración" muestra la insignia de coincidencia
