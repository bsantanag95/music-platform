## MODIFIED Requirements

### Requirement: Indicadores de afinidad en "Exploración"

Cuando el bloque de afinidad ya calculado (ver "Coincidencias entre visitante y dueño")
incluye artistas que ambos siguen, la sección de artistas seguidos del perfil («Artistas
seguidos», antes «Exploración», en la franja de identidad) SHALL indicar, sobre cada artista
seguido por el dueño que el visitante también sigue, una insignia discreta que señale la
coincidencia. La insignia SHALL reutilizar el mismo cálculo del bloque de afinidad, sin una
consulta adicional independiente, y SHALL respetar las mismas condiciones que el resto del
bloque (visitante autenticado que no es el dueño, sin bloqueo entre ambos).

#### Scenario: Artista en común marcado en Exploración

- **WHEN** un visitante autenticado que sigue a un artista abre el perfil de otra persona
  que también sigue a ese artista
- **THEN** ese artista, en «Artistas seguidos» del dueño, muestra la insignia de coincidencia

#### Scenario: Sin sesión, sin insignia

- **WHEN** un visitante sin sesión abre «Artistas seguidos» de un perfil
- **THEN** ningún artista muestra la insignia de coincidencia

#### Scenario: Dueño viendo su propio perfil

- **WHEN** el dueño ve sus propios «Artistas seguidos»
- **THEN** ningún artista muestra la insignia de coincidencia

#### Scenario: Relación de bloqueo

- **WHEN** existe una relación de bloqueo entre el visitante y el dueño
- **THEN** ningún artista de «Artistas seguidos» muestra la insignia de coincidencia
