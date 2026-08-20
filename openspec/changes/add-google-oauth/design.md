## Context

El proyecto ya implementa autenticación local (Fase 4) con sesiones server-side de token
opaco (ADR 0008), y dejó preparada la persistencia `auth_identity` (unicidad por
`(provider, provider_account_id)`) y la interfaz de adaptadores en
`src/services/auth/providers/` (ADR 0010). Google es el primer proveedor previsto y este
incremento lo habilita con OAuth 2.0 Authorization Code + OIDC, exclusivamente en el backend
de la misma aplicación Next.js.

El estado del flujo OAuth (login/registro) desemboca en la misma sesión server-side común:
ratings y comentarios no distinguen el método de inicio de sesión. No hay migración SQL
necesaria. La vinculación explícita de una identidad externa con una cuenta local existente
queda diferida a una fase posterior (página de perfil/configuración), según ADR 0010 y
`auth.md` sección 6.

## Goals / Non-Goals

**Goals:**

- Habilitar login y alta de cuentas con Google mediante OAuth 2.0 Authorization Code + OIDC.
- Validar el flujo con `state`, PKCE (S256), `nonce`, issuer, audience, firma (JWKS),
  expiración y `redirect_uri`, usando `jose`.
- Resolver una identidad externa existente o crear `app_user` + `auth_identity` en una
  transacción, con resolución de username para altas nuevas.
- Desembocar siempre en la sesión server-side existente (cookie `music_session`).
- No almacenar access/refresh tokens de Google; secretos solo en variables de entorno.
- Redirigir post-autenticación a `/search` de forma fija.

**Non-Goals:**

- Vinculación (linking) de Google con una cuenta local existente — diferida a fase posterior.
- Merge/auto-link implícito por coincidencia de email.
- Recuperación de contraseña o verificación de email.
- Almacenar tokens de Google para consumir APIs del proveedor.
- Implementar otros proveedores OAuth/OIDC.

## Decisions

### 1. Interfaz de adaptadores ampliada

`AuthProviderAdapter` hoy solo traduce un perfil validado a `ExternalIdentity`
(`provider.ts`). Se amplía para cubrir el ciclo completo del flujo:

- `buildAuthUrl(params)`: devuelve la authorization URL de Google con `client_id`,
  `redirect_uri`, `scope`, `state`, `code_challenge`/`code_challenge_method=S256` y
  `nonce`.
- `exchangeCode(code, redirectUri, codeVerifier)`: intercambia el authorization code por
  tokens en el backend y devuelve el ID token y los claims ya validados.
- `validateIdToken(idToken, { nonce })`: valida con `jose` issuer, audience, firma (JWKS),
  expiración y `nonce`; extrae `sub`, `email` y `email_verified`.
- `toIdentity(profile)`: traduce el perfil validado a `ExternalIdentity`.

Alternativa descartada: mantener la interfaz mínima y poner el flujo en el route handler.
Se descarta porque mezclaría lógica específica de Google con el route handler y dificultaría
agregar futuros proveedores; el ADR 0010 exige adaptadores propios tras una interfaz común.

### 2. Estado del flujo en cookies de corta duración

`state`, `code_verifier` (PKCE) y `nonce` se generan en `/start` y se guardan en cookies
`httpOnly`, `secure`, `sameSite=lax`, de corta duración (p. ej. 10 minutos), para ser
consumidas y borradas en `/callback`.

Alternativa descartada: persistir el estado en una tabla. Se descarta porque agrega una
tabla y limpieza sin necesidad: el estado es efímero y sensible, y las cookies seguras ya
son el mecanismo existente del proyecto (sesión opaca).

### 3. Validación del callback con `jose`

En `/callback` se valida en orden: presencia de `state` que coincida con la cookie (CSRF),
ausencia de `error` de Google, intercambio del code con PKCE, y validación del ID token con
`jose` (issuer exacto `https://accounts.google.com`, `aud` igual a `GOOGLE_CLIENT_ID`,
firma contra JWKS de Google, `exp`, `nonce`). El `redirect_uri` usado en el intercambio es
siempre el configurado en `.env` — nunca uno de la request.

### 4. Resolución de identidad y creación de usuario

En el servicio compartido (`src/services/auth/identities.ts`):

- Buscar `auth_identity` por `(provider='google', provider_account_id=sub)`.
- Si existe → devolver el `app_user` asociado.
- Si no existe → verificar el email del ID token (con `email_verified`) contra `app_user`:
  - Si ya existe una cuenta local con ese email y sin esa identidad → error
    `EMAIL_TAKEN_BY_LOCAL` (sin crear nada).
  - Si no → insertar `app_user` + `auth_identity` en una transacción. El username se deriva
    en `src/services/auth/users.ts` (no en el adaptador): local-part del email saneado a
    `^[a-zA-Z0-9_]+$`, relleno si <3, truncado a 32, sufijo numérico incremental en
    colisión (`nombre`, `nombre2`, `nombre3`, ...).

La creación de usuario e identidad comparte la lógica de validación de unicidad existente
(`users.ts`) para que `USERNAME_TAKEN` no sea un error, sino la señal para probar el
siguiente sufijo. Los callbacks repetidos con el mismo `code` fallan por validación de
Google; los repetidos tras éxito no crean duplicados porque la identidad ya resuelve.

### 5. Rutas de la API

- `GET /api/auth/google/start` → genera el estado del flujo y redirige a Google.
- `GET /api/auth/google/callback` → valida, resuelve/crea usuario, rota o crea la sesión
  (`rotateCurrentSession`/`createSession`), setea la cookie y redirige a `/search` (301/302
  sin `returnTo` dinámico).
- Ambas envueltas en `withErrorHandling`. Los errores del callback se mapean a códigos
  machine-readable (`errors.md`) y, cuando corresponda, a una página localizada de error
  (el callback es una navegación del navegador, no una llamada `fetch` del cliente).

Alternativa descartada: implementar el inicio y callback dentro de `/api/auth/login`.
Se descarta porque mezcla los dos métodos de autenticación y complica la lectura de
secretos y el manejo de errores del flujo OAuth.

### 6. Frontend

Botón "Continuar con Google" en las páginas de login y registro: es un enlace a
`/api/auth/google/start` (navegación del navegador, no `fetch`), sin lógica OAuth en
componentes cliente. Mensajes localizados (`es`/`en`) para el botón y para los estados de
error del callback (cancelación, sesión expirada del flujo, email ya existente como cuenta
local). El retorno fijo a `/search` evita redirección abierta.

### 7. Configuración

Variables `GOOGLE_CLIENT_ID`, `GOOGLE_CLIENT_SECRET`, `GOOGLE_REDIRECT_URI` y
`GOOGLE_OAUTH_SCOPES` (scopes fijos `openid email profile`) documentadas en `.env.example`.
Un servicio de config lee estas variables y lanza un error claro si faltan cuando se inicia
el flujo (fail-closed), igual que el patrón de `MUSICBRAINZ_USER_AGENT`.

## Risks / Trade-offs

- [Alta de usuarios con Google agrega un punto de entrada con secretos externos] →
  fail-closed si faltan variables; secretos solo en el servidor; sin almacenar tokens.
- [Validación OIDC compleja (JWKS, nonce, audience)] → se delega a `jose` (aprobada) en vez
  de criptografía manual; tests que cubren token inválido, issuer/audiencia/firma/exp no
  válidos y `nonce` incorrecto.
- [Colisión de username en altas nuevas] → resolución con sufijo numérico dentro de una
  transacción; la unicidad de `app_user.username` queda garantizada por la BD.
- [Email de Google ya usado por cuenta local] → error machine-readable sin auto-link; sin
  exponer flujo de merge (decisión de producto ya cerrada).
- [Callback es una navegación del navegador, no un request `fetch`] → los errores no pueden
  devolverse en el shape JSON habitual; se redirige a una página localizada de error de
  autenticación con el `code` correspondiente.
- [Rate limiting del flujo OAuth] → los intentos de intercambio fallidos se limitan por IP
  con el limitador en memoria existente; el botón de inicio es un simple enlace (no abusable
  con alta frecuencia).
- [Multi-instancia: estado del flujo en cookies no se comparte] → coherente con el
  supuesto de una sola instancia ya documentado para el rate limiting y las sesiones.

## Migration Plan

1. Agregar `jose` y las variables de Google a `.env`.
2. Implementar el adaptador y los servicios de identidad/usuario.
3. Implementar las rutas y el frontend del botón.
4. Probar con la BD scratch (smoke test con `global.fetch` mockeado) y manualmente con una
   app OAuth real en Google Cloud Console.
5. Sin cambios de esquema: la reversión consiste en desactivar las rutas y quitar el botón;
   ninguna migración que revertir.

## Open Questions

- Ninguna bloqueante: las decisiones de producto (username, email colisionado, retorno fijo
  `/search`, `jose`) están cerradas y documentadas en `auth.md` sección 6 y ADR 0010.