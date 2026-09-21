# ADR 0016 — Vinculación explícita de Google, creación de contraseña y autenticación reciente

## Estado

Aceptado

## Contexto

ADR 0010 dejó prevista la vinculación de una identidad de Google con una cuenta existente como una
operación distinta del login, condicionada a "una acción autenticada y un nuevo flujo OAuth/OIDC
completo", y la difirió hasta que hubiera una pantalla de configuración. ADR 0014 (reset) impide que
una cuenta sin `password_hash` obtenga contraseña local por esa vía. Con el área de ajustes
(`/me/settings/account`, change `rework-account-settings`) esa condición existe, y con ella surgen tres
necesidades: vincular y desvincular Google desde una cuenta local, que una cuenta creada con Google
pueda crear una contraseña, y decidir qué factor de identidad exigen las acciones sensibles (cambiar
el email, crear contraseña, y después desactivar o eliminar la cuenta).

## Decisión

- **Intenciones del flujo OAuth.** El estado del flujo (cookies protegidas por `state`, PKCE y `nonce`)
  lleva una intención cerrada: `login` (por defecto), `link` o `reauth`. `GET /api/auth/google/start`
  solo acepta esos valores (otro = `login`) y **exige sesión** para `link` y `reauth`; guarda quién
  inició el flujo y el callback exige que sea la misma sesión.
- **Retorno fijo, sin `returnTo`.** Las intenciones de cuenta terminan siempre en
  `/<locale>/me/settings/account`, con el resultado en un query de conjunto cerrado
  (`?google=linked|confirmed|error&code=…`). Se conserva la regla de la spec `google-oauth`: el cliente
  nunca controla una URL de retorno.
- **`link` enlaza por identificador, no por email.** La identidad se crea por
  `(provider, provider_account_id)`; el email de Google no tiene que coincidir con el de la cuenta ni
  concede nada al dueño de ese email. Una identidad ya vinculada a otra cuenta se rechaza
  (`OAUTH_IDENTITY_TAKEN`). Esto no reabre la vinculación **implícita** por email de ADR 0010: el alta
  con un email de una cuenta local sigue rechazándose (`EMAIL_TAKEN_BY_LOCAL`).
- **Desvincular nunca deja la cuenta sin acceso.** Solo se permite si la cuenta tiene contraseña local
  (`LAST_ACCESS_METHOD` en caso contrario).
- **Crear contraseña en una cuenta de Google** (`POST /api/me/account/password`) es explícito y exige
  autenticación reciente. No contradice ADR 0014: el reset sigue restringido a cuentas con contraseña
  local; esto no es un reset ni una vinculación por coincidencia de email.
- **Autenticación reciente.** Las acciones sensibles exigen un factor fresco: la contraseña en el
  cuerpo de la petición (cuentas con contraseña, con límite de intentos por usuario) o, en cuentas sin
  contraseña, una sesión iniciada hace menos de 10 minutos; si no, `REAUTH_REQUIRED` y el usuario
  confirma con Google (`intent=reauth`), que rota la sesión. Un único punto de decisión:
  `services/auth/recent-auth.ts`.

## Consecuencias

- Ninguna dependencia nueva; se reutiliza el flujo, las cookies y el adaptador de Google existentes.
- Ya no hay una ruta de vinculación "inexistente" que un agente deba evitar: el requisito "Sin
  vinculación de cuentas existentes" de la spec `google-oauth` se retira.
- Cualquier acción nueva que deba exigir un factor fresco usa `requireRecentAuth`, no una verificación
  ad hoc.
- Vincular varias cuentas de Google a la misma cuenta no se impide; desvincular borra todas las de ese
  proveedor.
