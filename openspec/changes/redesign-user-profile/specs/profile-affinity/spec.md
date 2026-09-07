## ADDED Requirements

### Requirement: Coincidencias entre visitante y dueño

El sistema SHALL calcular, para un visitante autenticado que no es el dueño y que puede
acceder al contenido del perfil, un bloque de coincidencias con el dueño: favoritos en
común, entidades que ambos valoran con 4 estrellas o más, y seguidores en común. El cálculo
SHALL respetar el bloqueo y la audiencia de cada elemento, y SHALL hacerse bajo demanda.

#### Scenario: Favoritos y valoraciones en común

- **WHEN** un visitante autenticado abre el perfil accesible de otra persona con la que
  comparte 3 favoritos y 2 entidades valoradas con 4+ estrellas
- **THEN** el bloque de afinidad muestra esos favoritos y esas valoraciones en común

#### Scenario: Seguidores en común

- **WHEN** el visitante y el dueño tienen 4 seguidores en común
- **THEN** el bloque de afinidad indica la cantidad de seguidores en común

#### Scenario: Sin coincidencias

- **WHEN** un visitante autenticado abre un perfil accesible con el que no comparte nada
- **THEN** el bloque de afinidad no se muestra

#### Scenario: Visitante anónimo o dueño

- **WHEN** el perfil lo abre un visitante sin sesión o su propio dueño
- **THEN** no se calcula ni se muestra el bloque de afinidad

#### Scenario: Relación de bloqueo

- **WHEN** existe una relación de bloqueo entre el visitante y el dueño
- **THEN** no se calcula ni se muestra el bloque de afinidad

### Requirement: Seguidores en común en el aviso de perfil privado

El aviso de perfil privado mostrado a un visitante autenticado no autorizado SHALL indicar,
cuando exista, cuántos de los seguidores aprobados del dueño son personas que el visitante
sigue, como señal para decidir seguir. Esta indicación SHALL NOT revelar la identidad de
esos seguidores si el listado de seguidores del dueño no es accesible para el visitante.

#### Scenario: Hint de seguidores en común

- **WHEN** un visitante autenticado no autorizado abre un perfil privado y sigue a 3
  personas que a su vez siguen al dueño
- **THEN** el aviso de perfil privado indica que 3 personas que sigue también siguen a esta
  cuenta

#### Scenario: Sin seguidores en común

- **WHEN** un visitante autenticado no autorizado abre un perfil privado y no sigue a nadie
  que siga al dueño
- **THEN** el aviso de perfil privado no muestra la indicación de seguidores en común
