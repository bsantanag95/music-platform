## Why

Tras la Fase 1 (`refine-settings-phase1`), Ajustes carga sin el hueco en blanco, pero sus dos pantallas más largas
siguen siendo difíciles de usar (auditoría del 2026-10-29):

- **Perfil mide 3735 px** sin índice: seis tarjetas apiladas (foto, Tarjeta de Identidad, tu identidad, identidad
  musical, preguntas, enlaces) y cuatro botones "Guardar" independientes. Nada dice qué tarjeta tiene cambios sin
  guardar y salir de la página los pierde sin aviso.
- **Cuenta lista 21 sesiones**: en el móvil la pantalla llega a 4971 px y empuja Preferencias y "Eliminar cuenta" al
  fondo. Solo existe "Cerrar todas las sesiones", que también cierra la actual.

## What Changes

- **Índice fijo de Perfil**: una fila de enlaces a cada tarjeta que se queda a la vista al desplazarse, marca la
  sección visible y un punto en las que tienen cambios sin guardar.
- **Estado por tarjeta**: cada tarjeta de editor dice "Cambios sin guardar" mientras los haya (el "Guardar" de cada
  una se mantiene, decisión del usuario), usando el contrato `EditorHostContext` que ya usan los editores.
- **Aviso al salir con cambios**: si hay cambios sin guardar, salir del área (un enlace interno o cerrar/recargar la
  pestaña) pide confirmación.
- **Sesiones plegadas** (decisión del usuario): la actual y las 2 más recientes; "Ver las N más" despliega el resto.
  Nuevo "Cerrar las demás" (`DELETE /api/me/sessions`), que conserva la sesión actual; "Cerrar todas las sesiones"
  se mantiene.

### Non-Goals

- Una sola barra de guardado para Perfil.
- Red con cifras y resumen en la entrada (Fase 3); el peso de los textos del layout raíz (cambio aparte).

## Capabilities

### New Capabilities

(ninguna)

### Modified Capabilities

- `owner-settings`: índice y cambios sin guardar en Perfil; sesiones plegadas y "Cerrar las demás" en Cuenta.

## Impact

- `src/components/settings/{SettingsEditorCard,SettingsSectionIndex,UnsavedChangesGuard}.tsx` (nuevos)
- `src/app/[locale]/me/settings/(screens)/{layout,profile/page}.tsx`
- `src/components/settings/account/SessionsCard.tsx`, `src/app/api/me/sessions/route.ts`
- `messages/{es,en}/users.json`, `docs/04-api/contracts.md`, `docs/05-features/user-profile.md`
