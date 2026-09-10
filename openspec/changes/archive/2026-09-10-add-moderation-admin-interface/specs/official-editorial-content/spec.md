## MODIFIED Requirements

### Requirement: Publicación editorial oficial

El sistema SHALL permitir que un administrador publique y retire listas editoriales oficiales mediante
una superficie administrativa y endpoints protegidos, distinguiéndolas de las listas personales. El
contenido oficial SHALL corresponder a listas de la cuenta curadora de `/explore` (`@exploracion`): la
marca oficial no SHALL ser editable por el propietario común de una lista ni aplicarse a listas
personales de otros usuarios, y SHALL conservar un actor administrativo identificable.

#### Scenario: Administrador publica lista oficial
- **WHEN** un administrador marca para publicación editorial una lista de la cuenta curadora
- **THEN** la lista aparece como contenido oficial en las superficies editoriales

#### Scenario: Administrador intenta publicar una lista personal ajena
- **WHEN** un administrador intenta marcar como oficial una lista de un usuario que no es `@exploracion`
- **THEN** la operación es rechazada y la lista conserva su origen personal

#### Scenario: Administrador retira lista oficial
- **WHEN** un administrador retira una lista editorial publicada
- **THEN** la lista deja de aparecer como contenido editorial publicado y conserva sus datos personales

#### Scenario: Usuario común intenta publicar contenido oficial
- **WHEN** un usuario sin permiso editorial intenta marcar una lista como oficial
- **THEN** la API responde `403` y la lista conserva su origen personal

### Requirement: Descubrimiento editorial distingue el origen

Las superficies públicas que muestran listas editoriales SHALL distinguir visualmente el contenido
oficial del contenido de usuarios y SHALL excluir listas ocultas por moderación o retiradas por un
administrador.

#### Scenario: Lista oficial visible
- **WHEN** una persona visita el descubrimiento público con una lista editorial publicada
- **THEN** ve la lista con una indicación localizada de contenido oficial

#### Scenario: Lista editorial moderada
- **WHEN** una lista oficial está oculta por moderación
- **THEN** no aparece en el descubrimiento público hasta ser restaurada

#### Scenario: Lista editorial retirada
- **WHEN** un administrador retira una lista oficial
- **THEN** no aparece en el descubrimiento público mientras permanezca retirada
