## ADDED Requirements

### Requirement: Acciones desde comentarios y reseñas ajenos

Un usuario autenticado SHALL poder reportar un comentario o reseña ajena con motivo y bloquear a su
autor directamente desde el posteo, sin navegar al perfil.

#### Scenario: Usuario reporta un comentario ajeno
- **WHEN** un usuario autenticado abre las acciones de un comentario ajeno, escribe un motivo y
  confirma
- **THEN** se crea un reporte pendiente de ese comentario y la interfaz confirma el envío

#### Scenario: Usuario bloquea al autor desde el posteo
- **WHEN** un usuario autenticado confirma bloquear al autor de un comentario o reseña
- **THEN** el autor queda bloqueado y su contenido se retira de la vista actual

#### Scenario: Usuario normal no ve acciones de moderación
- **WHEN** un usuario sin permisos de plataforma ve un posteo ajeno
- **THEN** solo ve reportar y bloquear, nunca ocultar/restaurar ni suspender

#### Scenario: Moderador suspende desde el posteo
- **WHEN** un visitante con `moderation.suspend_social` confirma una suspensión con expiración futura
  y motivo desde un comentario o reseña ajena
- **THEN** se crea la restricción `social_activity` mediante el endpoint de restricciones