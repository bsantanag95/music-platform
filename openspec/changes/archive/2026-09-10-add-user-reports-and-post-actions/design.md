## Context

La consola de moderación (cambio `add-moderation-admin-interface`) y el reporte de contenido ya
existen. Esta extensión conecta la red social con la moderación: reportes de perfil y acciones
directas desde el posteo, manteniendo la separación entre acciones de usuarios (reportar/bloquear)
y acciones de moderación (ocultar/suspender).

## Goals / Non-Goals

**Goals:**

- Reportar perfiles en la misma cola y con el mismo flujo que comentarios y reseñas.
- Ofrecer reportar y bloquear donde ocurre el problema (comentario/reseña) y en el perfil.
- Suspender actividad social desde el perfil solo para moderadores.
- Auditoría de resolución de reportes con objetivo usuario.

**Non-Goals:**

- Cambiar roles, permisos o reglas de suspensión.
- Exponer moderación (ocultar/restaurar) en superficies públicas.

## Decisions

### Objetivo usuario en el mismo modelo de reportes

Se extiende `content_report` con `user_id` (migración `0024`) y el `CHECK` pasa a exigir
exactamente un objetivo entre `comment_id`, `review_id` y `user_id`. Se reutiliza la misma cola,
el mismo endpoint y la misma dedupe de reportes pendientes (`uq_content_report_open_user`). El
auto-reporte de perfil se rechaza con `VALIDATION_ERROR`.

Alternativa descartada: tabla `user_report` separada. Duplica cola, endpoints y auditoría sin
beneficio; la consola tendría que unificar dos fuentes.

### Auditoría con objetivo usuario

`moderation_action` suma `user_id` (migración `0024`); resolver/descartar un reporte de perfil
registra `report_resolve`/`report_dismiss` con ese objetivo. El `CHECK` de `num_nonnulls` se
extiende a cinco objetivos.

### Separación reportar/bloquear vs suspender

- Reportar y bloquear: cualquier usuario autenticado, desde comentarios, reseñas o perfil.
- Suspender actividad social: requiere `moderation.suspend_social`; en el perfil el botón solo se
  muestra cuando el visitante tiene el permiso (resuelto server-side y pasado a la UI).

### Contenido bloqueado se retira de la vista

Tras bloquear a un autor desde un comentario/reseña, se filtran sus publicaciones de la lista
actual sin recargar; el endpoint de bloqueo sigue siendo el existente (`/api/users/[username]/block`).

### Expiración por presets y usuario por username/email

La duración de la suspensión se elige con presets (24 horas, 3 días, 1 semana, 1 mes) en vez de un
input manual de fecha/hora (`src/lib/moderation-presets.ts`); el servidor igual valida que
`expiresAt` sea futura. En la consola de moderación el usuario se identifica por username o email
(`POST /api/moderation/restrictions` acepta `userId` o `identifier`, que se resuelve server-side),
no por UUID. Perfil y posteos siguen enviando `userId` porque ya conocen el objetivo.

## Risks / Trade-offs

- **[Riesgo]** Reportes de perfil pueden usarse para acosar → **Mitigación:** motivo obligatorio,
  dedupe por autor/objetivo pendiente y cola de moderación con auditoría.
- **[Riesgo]** Suspender desde el perfil duplica la consola → **Mitigación:** mismo endpoint y
  validación; solo visible con permiso.

## Migration Plan

1. Aplicar la migración `0024` (aditiva: nuevas columnas y checks; no altera filas existentes).
2. Servicios y endpoint.
3. UI (posteo, perfil, consola) y mensajes localizados.
4. typecheck, lint, tests y build; verificación manual con usuario normal y moderador.

Rollback: retirar los botones y el endpoint de `targetType: "user"`; la migración `0024` es aditiva
y no requiere reversión.