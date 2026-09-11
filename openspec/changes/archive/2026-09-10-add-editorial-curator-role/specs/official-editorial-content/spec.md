## MODIFIED Requirements

### Requirement: Publicación editorial oficial

El sistema SHALL permitir que un administrador publique y retire listas editoriales oficiales mediante
una superficie administrativa y endpoints protegidos, distinguiéndolas de las listas personales. El
contenido oficial SHALL corresponder a listas de la cuenta curadora de `/explore` (`@exploracion`): la
marca oficial no SHALL ser editable por el propietario común de una lista ni aplicarse a listas
personales de otros usuarios, y SHALL conservar un actor administrativo identificable. La publicación
SHALL exigir `editorial.publish` para publicar y retirar; la creación y edición del borrador
pueden haber sido ejecutadas por un curador con `editorial.author`, conservando su autoría, sin que
ello altere la identidad pública `@exploracion`.

#### Scenario: Administrador publica lista oficial
- **WHEN** un administrador con `editorial.publish` marca para publicación editorial una lista de la cuenta curadora
- **THEN** la lista aparece como contenido oficial en las superficies editoriales

#### Scenario: Administrador intenta publicar una lista personal ajena
- **WHEN** un administrador intenta marcar como oficial una lista de un usuario que no es `@exploracion`
- **THEN** la operación es rechazada y la lista conserva su origen personal

#### Scenario: Administrador retira lista oficial
- **WHEN** un administrador con `editorial.publish` retira una lista editorial publicada
- **THEN** la lista deja de aparecer como contenido editorial publicado y conserva sus datos personales

#### Scenario: Usuario común intenta publicar contenido oficial
- **WHEN** un usuario sin permiso editorial intenta marcar una lista como oficial
- **THEN** la API responde `403` y la lista conserva su origen personal

#### Scenario: Curador no publica ni retira
- **WHEN** un usuario con `editorial.author` pero sin `editorial.publish` intenta publicar o retirar una lista oficial
- **THEN** la API responde `403` y la lista conserva su estado

### Requirement: Gestión editorial desde administración

La superficie administrativa SHALL permitir a un administrador publicar y retirar listas editoriales
oficiales mediante acciones autorizadas y auditables. SHALL operar únicamente sobre listas de la
cuenta curadora de `/explore` (`@exploracion`); las listas personales de otros usuarios NO SHALL ser
publicables como contenido oficial desde esta superficie. La superficie SHALL permitir además
revisar los borradores y propuestas editoriales creados por curadores, mostrando su autoría, y
publicarlos o retirarlos según el permiso `editorial.publish`.

#### Scenario: Administrador publica lista oficial
- **WHEN** un administrador confirma la publicación de una lista válida de la cuenta curadora
- **THEN** la lista queda marcada como oficial, conserva el actor administrativo y aparece en la
  superficie editorial pública

#### Scenario: Administrador intenta publicar una lista personal de otro usuario
- **WHEN** un administrador intenta publicar una lista cuyo dueño no es `@exploracion`
- **THEN** la API responde `404` y la lista conserva su origen personal

#### Scenario: Administrador retira lista oficial
- **WHEN** un administrador confirma retirar una lista oficial
- **THEN** deja de aparecer como contenido editorial publicado sin borrar la lista personal subyacente

#### Scenario: Administrador revisa una propuesta de curador
- **WHEN** un administrador abre una lista propuesta por un curador
- **THEN** ve su autoría y puede publicarla conservando la trazabilidad de autor y propuesta

#### Scenario: Moderador intenta publicar contenido editorial
- **WHEN** un usuario sin `editorial.publish` llama al endpoint editorial
- **THEN** la API responde `403` y no cambia el origen de la lista
