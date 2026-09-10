## ADDED Requirements

### Requirement: Gestión editorial desde administración

La superficie administrativa SHALL permitir a un administrador publicar y retirar listas editoriales
oficiales mediante acciones autorizadas y auditables. SHALL operar únicamente sobre listas de la
cuenta curadora de `/explore` (`@exploracion`); las listas personales de otros usuarios NO SHALL ser
publicables como contenido oficial desde esta superficie.

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

#### Scenario: Moderador intenta publicar contenido editorial
- **WHEN** un usuario sin `editorial.publish` llama al endpoint editorial
- **THEN** la API responde `403` y no cambia el origen de la lista

### Requirement: Edición editorial con estados visibles

La interfaz SHALL distinguir listas oficiales publicadas, retiradas y ocultas por moderación, y SHALL
mostrar estados vacíos y errores localizados.

#### Scenario: Lista ocultada por moderación
- **WHEN** una lista oficial tiene `moderation_status = hidden`
- **THEN** no se ofrece como publicada en la cola editorial ni en el descubrimiento público

#### Scenario: No hay listas editoriales
- **WHEN** un administrador autorizado abre la superficie sin listas publicadas
- **THEN** ve un estado vacío localizado en vez de una tabla rota o una respuesta de error
