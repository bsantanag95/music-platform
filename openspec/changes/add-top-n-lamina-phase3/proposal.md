## Why

Una Lámina compartida hoy termina en sí misma: quien la abre la mira y se va. El bucle viral de `docs/05-features/sharing.md` §6 necesita un llamado que
convierta a ese visitante en autor, sin pasar por el onboarding genérico. Esta es la última de las tres fases del Top N.

## Goals

- Que quien ve una Lámina ajena llegue a armar la suya con el formato ya elegido, tenga o no cuenta.
- Hacerlo sin abrir una redirección: el retorno sigue sin aceptar una URL del cliente.

## Non-Goals

- Copiar los ítems de la otra persona: la gracia es que sea la tuya.
- "Compárala con la tuya" y la lámina "Tú vs. otra persona" (`add-discography-lamina` y después).
- Mostrar en la Lámina nueva de quién salió la idea, o avisar a su autora: exigiría guardar el vínculo.
- Medir cuántas personas llegan por este llamado: es una decisión aparte de métricas (§8 D13).
- Conservar la intención en la recuperación de contraseña o en la verificación de email.

## What Changes

- **Llamado "Arma la tuya"** en la página pública de una Lámina, para quien no es su dueño. La Lámina se sigue viendo entera, sin muro de registro.
- **Con sesión:** lleva a `/me/laminas?desde=<id>`.
- **Sin sesión:** lleva al registro, con enlace al login, y la intención sobrevive al alta local, al login local y a Google.
- **Directo a armarla:** después de registrarse la persona va a `/me/laminas?desde=<id>`, no a `/welcome`. La bienvenida queda pendiente; Inicio ya la recuerda.
- **Formulario inspirado:** formato y tipo ya elegidos, el título de la otra Lámina como sugerencia para tocar y un enlace de vuelta. Nunca los ítems.
- **Intención cerrada:** es el id de una Lámina, no una URL. Si la Lámina ya no se puede ver, el formulario queda como siempre.
- **ADR nuevo** para esta excepción acotada al retorno fijo de la autenticación.

## Capabilities

### New Capabilities

Ninguna.

### Modified Capabilities

- `top-laminas`: llamado "Arma la tuya" y formulario inspirado.
- `google-oauth`: el flujo lleva una intención de Lámina y su retorno correspondiente.
- `onboarding`: quien se registra desde una Lámina no aterriza en `/welcome`.

## Impact

- **Base de datos:** sin migración.
- **Autenticación:** `AuthForm`, `LoginPanel`, `SocialSignIn`, páginas de login y registro, `oauth-flow.ts` y las rutas de Google.
- **Láminas:** página pública, `/me/laminas`, `LaminaCreateForm` y una lectura de inspiración en `laminas.ts`.
- **Documentación:** ADR 0052, `docs/02-architecture/auth.md`, `docs/05-features/sharing.md`, `docs/01-domain/business-rules.md`, `AGENTS.md`.
