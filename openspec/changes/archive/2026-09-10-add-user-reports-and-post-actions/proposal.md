## Why

La plataforma ya permite reportar comentarios y reseñas, y bloquear desde el perfil, pero la
moderación de perfiles y las acciones desde el propio contenido no están disponibles: un usuario no
puede reportar un perfil abusivo ni bloquear/reportar desde el comentario o la reseña donde ocurre
el problema. El flujo obliga a navegar al perfil del autor o a usar endpoints a mano.

## Goals

- Reportar un perfil de usuario con motivo, reutilizando la cola de moderación existente.
- Reportar o bloquear al autor directamente desde un comentario o una reseña ajena.
- Reportar un perfil desde la página del usuario; los moderadores pueden suspender actividad social
  desde el mismo perfil.
- Mantener separación de permisos: reportar/bloquear requiere sesión; suspender requiere
  `moderation.suspend_social`.

## Non-Goals

- Crear nuevas reglas de suspensión ni cambios al modelo de roles.
- Moderar contenido desde las superficies públicas (ocultar/restaurar sigue siendo de moderadores
  en la consola).

## What Changes

- Migración `0024`: `content_report.user_id` (objetivo usuario) y `moderation_action.user_id`
  (auditoría con objetivo usuario), con índices únicos de dedupe.
- `reportContent` admite `{ userId }`; bloquea el auto-reporte; la cola distingue `targetType:
  "user"`.
- `POST /api/moderation/reports` acepta `targetType: "user"`.
- Consola de moderación: muestra reportes de perfil con enlace al usuario y atajo para suspender.
- Menú de acciones en comentarios y reseñas ajenas: reportar (con motivo) y bloquear autor.
- Perfil: acción de reportar usuario y, para moderadores, suspender actividad social con
  expiración y motivo.

## Capabilities

### New Capabilities

- `user-reports`: reportar un perfil con motivo en la misma cola que comentarios y reseñas.
- `post-level-actions`: reportar o bloquear desde comentarios y reseñas ajenas.
- `profile-actions`: reportar un usuario desde su perfil y, para moderadores, suspenderlo.

## Impact

- Backend: servicios de reporte/consulta, endpoint de reportes y migración `0024`.
- Frontend: menú de acciones en `Comments`/`Reviews`, acciones en el perfil, consola de moderación.
- Contratos y documentación: `contracts.md`, `sql-model.md`.
- Tests: servicios, route handlers, componentes y consola de moderación.