## Why

La pantalla "Cuenta y seguridad" solo permite editar el nombre visible, ver el método de acceso y cerrar todas las sesiones: la persona no puede cambiar su usuario, su email ni su contraseña, ni vincular Google, ni ver qué dispositivos tienen su sesión abierta, ni pausar, exportar o borrar su cuenta. Son las funciones que cualquier usuario espera de una cuenta y quedaron anotadas como pendientes al cerrar `rework-owner-management`. En paralelo, la identidad pública es plana (nombre, bio, pronombres, ubicación, enlaces): en una plataforma de música falta decir cómo se relaciona la persona con ella (qué escucha, en qué formato, qué defiende), que es lo que da ganas de visitar un perfil ajeno.

## Goals

- **Fase 1 — Cuenta y seguridad:** cambiar usuario (con redirección del enlace anterior), email (con confirmación por correo) y contraseña; crear contraseña en cuentas de Google; vincular y desvincular Google; ver y cerrar sesiones por dispositivo; guardar el idioma de la interfaz en la cuenta.
- **Fase 2 — Identidad ampliada:** "Me defino como" (hasta 3), géneros (hasta 5), formatos de escucha (hasta 5), preguntas del perfil (hasta 3, una línea cada una), zona horaria como selector con opción de mostrar la hora local, y una ficha en la Placa (opción B del mockup) que los muestra.
- **Fase 3 — Ciclo de vida de la cuenta:** desactivar (oculta a la persona, conserva su actividad, se reactiva al iniciar sesión), eliminar (borra todo lo que creó, sin vuelta atrás) y exportar los datos propios.
- Todo desde `/me/settings`, con los mismos patrones de las pantallas actuales (editores con estados de carga, éxito y error recuperable).

## Non-Goals

- **Foto de perfil o avatar** (subida de archivos o portada del catálogo): irá en una spec dedicada a imágenes. La identidad visual sigue siendo el monograma.
- Notificaciones (por email o dentro de la app): no existe un sistema de notificaciones.
- Fecha de nacimiento, verificación en dos pasos, importación desde Last.fm o Spotify.
- Que el selector de idioma del Header persista la preferencia: solo la persiste el control de Ajustes.
- Cambiar la política de moderación o el flujo de suspensión social existente.

## What Changes

- **Fase 1**
  - Cambiar usuario: una vez cada 30 días; el usuario anterior queda reservado y `/users/<anterior>` redirige al nuevo durante 30 días.
  - Cambiar email: exige la contraseña (o autenticación reciente en cuentas de Google), manda un correo de confirmación al email nuevo y avisa al anterior; el email solo cambia al confirmar.
  - Cambiar contraseña con la actual y la opción de cerrar las demás sesiones; crear contraseña en cuentas sin ella; aviso por correo.
  - Vincular Google desde una sesión iniciada y desvincularlo sin dejar la cuenta sin método de acceso. **BREAKING (spec):** se retira el requisito "Sin vinculación de cuentas existentes" de `google-oauth`.
  - Confirmar la identidad con Google en cuentas sin contraseña ("autenticación reciente"), sin que el cliente controle la URL de retorno.
  - Sesiones por dispositivo: lista, cerrar una, cerrar todas (ya existe). Se guarda una etiqueta del dispositivo (p. ej. "Chrome · Windows") y la última actividad; nunca el User-Agent completo ni la IP.
  - Idioma preferido guardado en la cuenta; se aplica al iniciar sesión.
- **Fase 2**
  - Cuatro campos públicos nuevos (roles, géneros, formatos, preguntas) de listas cerradas, con su editor en Ajustes y en el modo edición del perfil.
  - Zona horaria con selector (hoy es texto libre que no se muestra) y opción "mostrar mi hora local". Los valores libres que no sean una zona válida se descartan.
  - Ficha en la Placa con lo nuevo; cada bloque desaparece si está vacío. Solo se muestra en perfiles accesibles, no en la tarjeta del perfil privado.
- **Fase 3**
  - Desactivar cuenta: oculta perfil, listados, feed y listas; conserva el contenido; las reseñas y comentarios ya publicados pasan a mostrar «Cuenta desactivada» sin enlace; iniciar sesión la reactiva.
  - Eliminar cuenta: confirma con el usuario y la contraseña (o autenticación reciente), borra todo en cascada y cierra la sesión. Una cuenta con historial de moderación o editorial no se puede eliminar: se ofrece desactivarla.
  - Exportar: descarga inmediata de un archivo JSON con los datos propios. Cambia respecto del mockup (correo con enlace que vence): sin trabajo en segundo plano ni correo.

## Capabilities

### New Capabilities

- `account-username`: cambio de usuario con enfriamiento, reserva del usuario anterior y redirección de su enlace.
- `account-credentials`: cambio de email con confirmación, cambio y creación de contraseña, vincular y desvincular Google, autenticación reciente.
- `session-management`: lista de sesiones por dispositivo, cierre individual y última actividad.
- `account-preferences`: idioma de la interfaz guardado en la cuenta.
- `profile-music-identity`: roles, géneros, formatos y preguntas del perfil; hora local; ficha de la Placa.
- `account-lifecycle`: desactivar y reactivar, eliminar y exportar; superficies donde una cuenta desactivada deja de aparecer.

### Modified Capabilities

- `owner-settings`: la pantalla Cuenta y seguridad incorpora los controles nuevos y deja de prohibir los que ya existen; la pantalla Perfil incorpora los editores de la Fase 2.
- `profile-identity`: la zona horaria pasa de texto libre a una zona válida, con opción de mostrar la hora local.
- `google-oauth`: el flujo admite las intenciones de vincular y confirmar identidad con retorno fijo a Ajustes; se retira "Sin vinculación de cuentas existentes".

## Impact

- **Base de datos** (tres migraciones, una por fase; verificar el siguiente número libre, hoy `0039`):
  - `app_user`: `username_changed_at`, `locale`; `self_roles`, `genres`, `listening_formats`, `show_local_time`; `deactivated_at`.
  - Tablas nuevas: `username_alias`, `email_change_token`, `user_profile_prompt`.
  - `session`: `device_label` y `last_seen_at`.
  - Limpieza de `timezone` con valores que no son zonas válidas.
- **Servicios:** `services/auth` (usuarios, sesiones, identidades, OAuth), `services/profiles/account-settings`, nuevos servicios de cuenta, y las consultas que exponen personas (feed, búsqueda, listas, reseñas, comentarios, seguidores) en la Fase 3.
- **API:** rutas nuevas bajo `/api/me/account/*`, `/api/me/sessions`, `/api/me/preferences`, `/api/me/export` y `/api/auth/email/change/confirm`; el inicio y el callback de Google ganan intenciones. Se actualiza `docs/04-api`.
- **UI:** pantallas Perfil y Cuenta y seguridad de `/me/settings`, la Placa, el modo edición, la página de confirmación de email y las páginas de perfil (redirección por usuario anterior).
- **Correo:** plantillas nuevas (confirmación y aviso de cambio de email, aviso de cambio de contraseña).
- **Dependencias:** ninguna nueva. La etiqueta del dispositivo se deriva con un analizador propio y la validación de zonas con `Intl`.
- **Documentación:** `docs/05-features/user-profile.md` y el contrato de API.
