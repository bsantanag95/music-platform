## Why

La Fase 4 implementó autenticación local y dejó preparada la persistencia (`auth_identity`)
y la interfaz de adaptadores para proveedores externos, con Google como el primer proveedor
previsto (ADR 0010). Este incremento habilita el inicio de sesión y el alta de cuentas con
Google mediante OAuth 2.0 Authorization Code + OIDC, desembocando en la misma sesión
server-side de token opaco ya existente. El linking de una cuenta local existente queda
diferido a una fase posterior (pendiente de la página de perfil/configuración), tal como
documentan ADR 0010 (Consecuencias) y `docs/02-architecture/auth.md` sección 6.

## What Changes

- Extender la interfaz común de proveedores para soportar el flujo OAuth/OIDC completo:
  construcción de la authorization URL, intercambio del authorization code, validación del
  callback y traducción a `ExternalIdentity`.
- Implementar el adaptador de Google bajo `src/services/auth/providers/google.ts`, con
  `issuer` fijo, scopes `openid email profile` y `redirect_uri` fija por entorno.
- Implementar las rutas de backend `GET /api/auth/google/start` y
  `GET /api/auth/google/callback`, con validación de `state`, PKCE (S256), `nonce`, issuer,
  audience, firma (JWKS), expiración y `redirect_uri` usando la dependencia `jose`.
- Resolver o crear `app_user` + `auth_identity` en una transacción cuando la identidad no
  existe; username derivado del local-part del email (saneado 3–32 chars, relleno si <3,
  truncado a 32, sufijo numérico incremental en colisión).
- Si el email de Google ya pertenece a una cuenta local sin esa identidad vinculada, devolver
  un error machine-readable ("ya existe, iniciá sesión con contraseña") — nunca crear cuenta
  nueva ni vincular implícitamente por email.
- Redirigir post-autenticación a `/search`, fijo, sin `returnTo` dinámico.
- Agregar el botón "Continuar con Google" en las páginas de login y registro, con estados
  localizados; sin UI de vinculación.
- No almacenar access ni refresh tokens de Google; los secretos viven solo en variables de
  entorno.
- Sin migración SQL: `auth_identity` y `password_hash` nullable ya existen.

## Capabilities

### New Capabilities

- `google-oauth`: inicio de sesión y alta de cuentas con Google mediante OAuth 2.0
  Authorization Code + OIDC en el backend, con validación de seguridad del flujo, resolución
  o creación de la identidad/usuario y desemboque en la sesión server-side común. No incluye
  vinculación de identidades con cuentas locales existentes.

### Modified Capabilities

_(ninguna — no hay specs previas que cambien sus REQUIREMENTS; el cambio introduce la
capacidad nueva y no altera las de catálogo/i18n existentes)_

## Impact

- **Backend**: `src/services/auth/providers/` (interfaz ampliada + adaptador Google),
  `src/services/auth/users.ts` (resolución de username para altas vía Google),
  `src/services/auth/identities.ts` (nuevo: resolución/creación de `auth_identity`).
- **API**: nuevas rutas `GET /api/auth/google/start` y `GET /api/auth/google/callback`,
  envueltas en `withErrorHandling`; nuevos códigos de error OAuth.
- **Frontend**: páginas localizadas de login/registro (`src/app/[locale]/auth/`), mensajes
  `es`/`en`, sin flujo OAuth en componentes cliente.
- **Dependencias**: `jose` (aprobada en `auth.md` sección 6).
- **Configuración**: `GOOGLE_CLIENT_ID`, `GOOGLE_CLIENT_SECRET`, `GOOGLE_REDIRECT_URI`,
  `GOOGLE_OAUTH_SCOPES` en `.env` (ya documentadas en `.env.example`).
- **Documentación**: `docs/04-api/contracts.md`, `docs/04-api/errors.md`; verificar
  consistencia de `docs/02-architecture/auth.md` y `docs/02-architecture/adr/0010`.
- **Pruebas**: unitarias del adaptador y del flujo, route handlers, smoke test con BD scratch.