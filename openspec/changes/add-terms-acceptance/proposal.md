## Why

Los Términos del servicio (`/terms`) dicen que se aceptan al crear una cuenta, pero el alta no pedía nada ni guardaba
qué texto aceptó cada persona. Con email controlamos el formulario; con Google la cuenta se crea en el callback, sin
formulario propio.

## What Changes

- Registro con email: casilla obligatoria («Acepto los Términos del servicio y he leído la Política de privacidad»), sin
  marcar de antemano, con enlaces en pestaña nueva. La API exige `acceptTerms: true` (400 si falta).
- Google: aviso junto al botón (registro y login) que dice que continuar es aceptar los Términos y la Política de
  privacidad. Sin casilla ni paso intermedio.
- Migración `0096`: `app_user.terms_accepted_at`, `terms_version` y `terms_accepted_via` (`checkbox` | `notice`), juntas o
  ninguna. Las cuentas anteriores quedan en `NULL`, sin backfill.
- `TERMS_VERSION` (`src/lib/terms.ts`) = fecha de última actualización de `/terms`; la exportación de datos incluye la
  aceptación.
- Textos: `/help` (primeros pasos), `/terms` (quiénes somos; «Por definir» con el aviso de Google y las cuentas
  anteriores) y `/privacy` (fila de la tabla de datos), en español e inglés.

## Capabilities

### New Capabilities
- `terms-acceptance`: aceptación de los Términos al crear la cuenta y su registro.

## Impact

`AuthForm.tsx`, `SocialSignIn.tsx`, `LoginPanel.tsx`, `terms-links.tsx`, páginas `auth/register` y `auth/login`, `schemas.ts`
(`RegisterRequestSchema`), `services/auth/{users,identities}.ts`, `api/auth/register/route.ts`, `data-export.ts`, `db/schema.ts`,
`drizzle/0096`, `messages/{es,en}/{auth,info,legal}.json`, `client-messages.json`, tests, ADR 0061, `contracts.md`,
`sql-model.md`, `auth.md`, `info-pages.md`. Contrato de `POST /api/auth/register`: `acceptTerms` pasa a ser obligatorio.
