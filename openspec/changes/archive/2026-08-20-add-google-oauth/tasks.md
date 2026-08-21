## 1. Preparación y configuración

- [x] 1.1 Revisar `docs/02-architecture/auth.md` (sección 6), ADR 0010 y los artefactos de este cambio antes de tocar código.
- [x] 1.2 Agregar `jose` como dependencia con `pnpm add jose` y verificar que instala sin problemas.
- [x] 1.3 Crear/validar un servicio de config que lea `GOOGLE_CLIENT_ID`, `GOOGLE_CLIENT_SECRET`, `GOOGLE_REDIRECT_URI` y `GOOGLE_OAUTH_SCOPES`, con fail-closed si faltan al iniciar el flujo (patrón `MUSICBRAINZ_USER_AGENT`).
- [x] 1.4 Confirmar valores reales de Google en `.env` para desarrollo y la app OAuth en Google Cloud Console con el `redirect_uri` correcto.

## 2. Interfaz de proveedores ampliada

- [x] 2.1 Ampliar `AuthProviderAdapter` en `src/services/auth/providers/` para cubrir el ciclo completo: `buildAuthUrl`, `exchangeCode`, `validateIdToken` y `toIdentity`, con tipos para params y perfil validado.
- [x] 2.2 Ampliar `ExternalIdentity` si hace falta (sin duplicar `provider_account_id`) y actualizar `providers.test.ts` con la nueva interfaz.
- [x] 2.3 Mantener el tipo `AuthProviderProtocol` y verificar que los tests existentes de adaptadores siguen pasando con la interfaz nueva.

## 3. Adaptador de Google

- [x] 3.1 Implementar `src/services/auth/providers/google.ts` con issuer fijo `https://accounts.google.com`, scopes `openid email profile`, `redirect_uri` desde config y construcción de la authorization URL con `state`, `code_challenge` (S256) y `nonce`.
- [x] 3.2 Implementar `exchangeCode` en el adaptador: POST al endpoint de token de Google con `code`, `redirect_uri` fijo y `code_verifier`, parseando la respuesta con Zod.
- [x] 3.3 Implementar `validateIdToken` con `jose`: issuer, audience (`client_id`), firma contra JWKS de Google, `exp` y `nonce`; extraer `sub`, `email` y `email_verified`.
- [x] 3.4 Implementar `toIdentity` traduciendo el perfil validado a `ExternalIdentity`.
- [x] 3.5 Añadir tests unitarios del adaptador: authorization URL, intercambio, validación de ID token (issuer, audience, firma, exp, nonce) y casos inválidos.

## 4. Estado del flujo (state / PKCE / nonce)

- [x] 4.1 Implementar utilidades de generación de `state`, `code_verifier`/`code_challenge` (S256) y `nonce` criptográficamente aleatorios.
- [x] 4.2 Persistir el estado del flujo en cookies `httpOnly`, `secure`, `sameSite=lax` de corta duración (p. ej. 10 min), con función de lectura y borrado tras consumir.
- [x] 4.3 Añadir tests de generación, roundtrip de cookies y expiración del estado.

## 5. Servicio de identidades y resolución de username

- [x] 5.1 Crear `src/services/auth/identities.ts` con resolución de `auth_identity` por `(provider, provider_account_id)`.
- [x] 5.2 Implementar la creación transaccional de `app_user` + `auth_identity` para altas nuevas vía Google, sin contraseña (`password_hash` nulo).
- [x] 5.3 Implementar la derivación de username en `src/services/auth/users.ts` (no en el adaptador): local-part saneado a `^[a-zA-Z0-9_]+$`, relleno si <3, truncado a 32, sufijo numérico incremental en colisión.
- [x] 5.4 Implementar la detección de email local ya existente (`EMAIL_TAKEN_BY_LOCAL`) sin crear usuario ni identidad, y exigir `email_verified=true` para altas nuevas (`OAUTH_EMAIL_NOT_VERIFIED` si `false`/ausente).
- [x] 5.5 Añadir tests: resolución de identidad existente, alta nueva, local-part corto, truncado, colisión de username, email colisionado, email no verificado y unicidad en la BD.

## 6. Rutas de la API OAuth

- [x] 6.1 Crear `src/app/api/auth/google/start/route.ts`: genera el estado del flujo (incluyendo el `locale` validado), setea cookies, aplica rate limiting por IP (`oauth:start:ip:...`) y redirige a la authorization URL de Google.
- [x] 6.2 Crear `src/app/api/auth/google/callback/route.ts`: valida `state`, intercambia el code, valida el ID token, resuelve/crea usuario, rota o crea la sesión (`rotateCurrentSession`/`createSession`), limpia el contador de rate limit y redirige a `/<locale>/search` (fijo, sin `returnTo`).
- [x] 6.3 Manejar en el callback los errores de Google (`error` param), estado inválido, token inválido, email local existente, email no verificado y rate limit, redirigiendo a la página localizada de error en el locale persistido del flujo.
- [x] 6.4 Envolver ambos handlers con `withErrorHandling` y verificar que no se exponen secretos ni el texto crudo del error.
- [x] 6.5 Añadir tests de route handlers: flujo feliz, cancelación, state inválido, token inválido, email local existente, email no verificado, rate limit, open redirect, callback repetido y sin configuración.

## 7. Frontend

- [x] 7.1 Agregar el botón "Continuar con Google" en las páginas de login y registro (`src/app/[locale]/auth/`), como enlace a `/api/auth/google/start?locale=<locale>` sin lógica OAuth en componentes cliente.
- [x] 7.2 Agregar mensajes localizados `es`/`en` para el botón y los estados de error del callback (cancelación, email ya existente, email no verificado, rate limit y error del flujo).
- [x] 7.3 Añadir tests de componentes y de consistencia de claves de mensajes para el nuevo contenido.
- [x] 7.4 Verificar que no se agrega ninguna ruta ni UI de vinculación de cuentas en esta fase.

## 8. Errores y documentación

- [x] 8.1 Definir códigos de error nuevos (p. ej. `OAUTH_CONFIG_MISSING`, `OAUTH_STATE_INVALID`, `OAUTH_CALLBACK_INVALID`, `OAUTH_CANCELLED`, `OAUTH_TOKEN_INVALID`, `OAUTH_EMAIL_NOT_VERIFIED`, `EMAIL_TAKEN_BY_LOCAL`) en `src/lib/api/schemas.ts` y en `docs/04-api/errors.md`.
- [x] 8.2 Documentar los endpoints `GET /api/auth/google/start` y `GET /api/auth/google/callback` en `docs/04-api/contracts.md`, incluido el retorno fijo `/<locale>/search`, el `?locale=` de start, el rate limiting y la excepción de transporte de errores.
- [x] 8.3 Verificar consistencia de `docs/02-architecture/auth.md` (sección 6) y `docs/02-architecture/adr/0010` con la implementación; ajustar si hay diferencias (incluye el requisito de `email_verified` y la creación transaccional).
- [x] 8.4 Actualizar `docs/02-architecture/architecture.md` si corresponde (estado del servicio de auth) y confirmar que `.env.example` ya documenta las variables de Google y `NEXT_PUBLIC_APP_URL`.

## 9. Pruebas de integración y validación final

- [x] 9.1 Crear un smoke test en `scripts/` que ejercite el flujo con `global.fetch` mockeado y BD scratch (`ALLOW_SMOKE_ON_REAL_DB=1`), cubriendo alta nueva, identidad existente, email colisionado y retorno a `/<locale>/search`; limpiar sus fixtures al final.
- [x] 9.2 Ejecutar `pnpm run typecheck`, `pnpm run lint`, `pnpm run test` y `pnpm run build` y dejarlos pasando.
- [x] 9.3 Verificar manualmente el flujo con una app OAuth real de Google en entorno de desarrollo (login, alta nueva, cancelación y error de email existente).