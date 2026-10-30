## Context

El layout del área (`(screens)/layout.tsx`) ya resuelve la sesión con `requirePageUser`, cuyo `user` es la fila completa
de `app_user`: `profileVisibility`, `notificationDigestEnabled` y `emailVerifiedAt` llegan sin consultas nuevas. Un
layout no se vuelve a ejecutar al navegar entre sus páginas, pero sí con `router.refresh()`.

## Decisions

### D1 — Red con cifras

La página Red añade a cada destino su cifra: seguidores y seguidos de `countFollows` (las mismas que la Placa y las
pestañas de conexiones), bloqueadas de `countBlocks` (nuevo: cuentas activas que el dueño bloqueó). Van a la derecha en
texto apagado; las solicitudes conservan su insignia ámbar solo cuando hay pendientes (bandeja de entrada).

### D2 — Estado en el menú

`SettingsNav` recibe `statuses: Partial<Record<SettingsScreenId, { text; tone: "muted" | "warn" }>>` y pinta una línea
bajo el nombre, solo desde `md` (en el teléfono las pestañas son una fila y una segunda línea las duplicaría en alto):

- `privacy`: "Perfil público" / "Perfil privado" (siempre);
- `notifications`: "Resumen semanal activo" (solo si lo está);
- `account`: "Email sin verificar" en tono de aviso (solo si lo está).

`PrivacySettings` y el interruptor del resumen llaman a `router.refresh()` tras guardar, para que el layout vuelva a
leer la sesión y el menú no quede desactualizado.

### D3 — Foco al cambiar de pantalla

`SettingsFocus` (cliente, en el layout) observa la ruta: al cambiar (no en la carga inicial) lleva el foco al título de
la pantalla (`h2` de `SettingsSection`, con `tabIndex={-1}` y `id="settings-screen-title"`), sin desplazar la página.
Así el lector de pantalla anuncia la pantalla nueva y el teclado sigue desde el contenido.

## Risks / Trade-offs

- `router.refresh()` vuelve a renderizar la pantalla activa; los formularios conservan su estado de cliente.
