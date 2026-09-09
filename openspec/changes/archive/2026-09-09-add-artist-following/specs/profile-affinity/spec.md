## MODIFIED Requirements

### Requirement: Coincidencias entre visitante y dueño

El sistema SHALL calcular, para un visitante autenticado que no es el dueño y que puede
acceder al contenido del perfil, un bloque de coincidencias con el dueño: favoritos en
común, entidades que ambos valoran con 4 estrellas o más, **artistas que ambos siguen**, y
seguidores en común. El cálculo SHALL respetar el bloqueo y la audiencia de cada elemento,
y SHALL hacerse bajo demanda. El bloque SHALL ocultarse solo cuando **todos** esos términos
están vacíos.

#### Scenario: Favoritos y valoraciones en común

- **WHEN** un visitante autenticado abre el perfil accesible de otra persona con la que
  comparte 3 favoritos y 2 entidades valoradas con 4+ estrellas
- **THEN** el bloque de afinidad muestra esos favoritos y esas valoraciones en común

#### Scenario: Artistas que ambos siguen

- **WHEN** el visitante y el dueño siguen a los mismos 2 artistas
- **THEN** el bloque de afinidad muestra esos artistas como coincidencia

#### Scenario: Seguidores en común

- **WHEN** el visitante y el dueño tienen 4 seguidores en común
- **THEN** el bloque de afinidad indica la cantidad de seguidores en común

#### Scenario: Sin coincidencias

- **WHEN** un visitante autenticado abre un perfil accesible con el que no comparte
  favoritos, valoraciones altas, artistas seguidos ni seguidores
- **THEN** el bloque de afinidad no se muestra

#### Scenario: Visitante anónimo o dueño

- **WHEN** el perfil lo abre un visitante sin sesión o su propio dueño
- **THEN** no se calcula ni se muestra el bloque de afinidad

#### Scenario: Relación de bloqueo

- **WHEN** existe una relación de bloqueo entre el visitante y el dueño
- **THEN** no se calcula ni se muestra el bloque de afinidad
