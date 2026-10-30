## Why

Con las Fases 1 y 2, Ajustes carga sin hueco en blanco y Perfil y Cuenta se dejan recorrer. Quedan detalles de la
auditoría del 2026-10-29 que hacen que el área se lea mejor de un vistazo:

- **Red sin cifras:** cuatro enlaces (Seguidores, Seguidos, Solicitudes, Cuentas bloqueadas) que no dicen cuántas
  personas hay en cada uno; solo las solicitudes llevan número.
- **El menú no resume nada:** para saber si el perfil es público, si el resumen semanal está activo o si el email está
  sin verificar hay que entrar a cada pantalla.
- **Foco tras cambiar de pantalla:** al elegir otra pantalla en el menú, el foco se queda en el enlace y un lector de
  pantalla no anuncia el contenido nuevo.

## What Changes

- **Red con cifras:** cuántos seguidores, seguidos y cuentas bloqueadas, en texto apagado; las solicitudes siguen como
  bandeja ámbar (no una métrica de logro).
- **Estado en el menú lateral** (desde `md`; en el teléfono las pestañas quedan compactas): bajo "Privacidad y
  audiencia", "Perfil público" / "Perfil privado"; bajo "Notificaciones", "Resumen semanal activo" si lo está; bajo
  "Cuenta y seguridad", "Email sin verificar" si es el caso. Guardar la privacidad o el resumen refresca el menú.
- **Foco al cambiar de pantalla:** tras una navegación dentro del área, el foco pasa al título de la pantalla nueva.

### Non-Goals

- El peso de los textos del layout raíz (cambio aparte, decidido con el usuario).

## Capabilities

### New Capabilities

(ninguna)

### Modified Capabilities

- `owner-settings`: Red con cifras, estado en el menú lateral y foco al cambiar de pantalla.

## Impact

- `src/app/[locale]/me/settings/(screens)/{layout,network/page}.tsx`, `src/components/settings/SettingsNav.tsx`,
  `SettingsSection.tsx`, `SettingsFocus.tsx` (nuevo)
- `src/services/social/blocking.ts` (`countBlocks`)
- `src/components/social/PrivacySettings.tsx`, `src/components/notifications/NotificationPreferencesForm.tsx`
  (refrescan tras guardar)
- `messages/{es,en}/users.json`, `docs/05-features/user-profile.md`
