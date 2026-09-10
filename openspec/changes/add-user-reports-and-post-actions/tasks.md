## 1. Datos y reportes de perfil

- [x] 1.1 Migración `0024`: `content_report.user_id` con `CHECK` de un objetivo y dedupe pendiente.
- [x] 1.2 `moderation_action.user_id` con `CHECK` de cinco objetivos.
- [x] 1.3 `reportContent` admite `{ userId }`, valida existencia y bloquea el auto-reporte.
- [x] 1.4 `listModerationReports` distingue `targetType: "user"` con el usuario reportado.

## 2. API

- [x] 2.1 `POST /api/moderation/reports` acepta `targetType: "user"`.
- [x] 2.2 `GET /api/moderation/reports` acepta el filtro `targetType=user`.
- [x] 2.3 Auditoría de resolución/descartes con `user_id`.

## 3. Consola de moderación

- [x] 3.1 Mostrar reportes de perfil con enlace al usuario.
- [x] 3.2 Atajo para suspender al usuario reportado.

## 4. Acciones desde posteos y perfil

- [x] 4.1 Menú de reportar (con motivo) y bloquear en comentarios ajenos.
- [x] 4.2 Menú de reportar (con motivo) y bloquear en reseñas ajenas.
- [x] 4.3 Al bloquear, retirar el contenido del autor de la vista.
- [x] 4.4 Reportar usuario desde el perfil.
- [x] 4.5 Suspender actividad social desde el perfil solo con `moderation.suspend_social`.
- [x] 4.6 Suspender actividad social desde comentarios y reseñas ajenas solo con `moderation.suspend_social`.
- [x] 4.7 Duración de la suspensión por presets (24h, 3 días, 1 semana, 1 mes) en consola, perfil y posteos.
- [x] 4.8 Identificar al usuario por username o email (no UUID) en la consola de moderación.

## 5. Localización y documentación

- [x] 5.1 Mensajes es/en para reportar, bloquear y suspender.
- [x] 5.2 Actualizar `docs/04-api/contracts.md` y `docs/03-data/sql-model.md`.

## 6. Verificación

- [x] 6.1 Tests de servicios (reporte de perfil, auto-reporte, auditoría).
- [x] 6.2 Tests del endpoint de reportes (`user`, `403/400/401`).
- [x] 6.3 Tests de componentes (`ContentActions`, consola con reportes de usuario).
- [x] 6.4 `pnpm run typecheck`, `lint`, `test` y `build`.