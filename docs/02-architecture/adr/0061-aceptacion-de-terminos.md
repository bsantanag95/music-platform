# ADR 0061 — Aceptación de los Términos al crear la cuenta: casilla con email, aviso con Google

## Estado

Aceptado (cambio `add-terms-acceptance`, 2026-11). Complementa el ADR 0060 (páginas informativas y legales) sin
reescribirlo.

## Contexto

Los Términos del servicio dicen que se aceptan al crear una cuenta, pero el alta no pedía nada: ni casilla ni registro de
cuándo ni de qué versión. Hay dos caminos de alta: el formulario con email (que controlamos entero) y Google, donde la
cuenta se crea en el callback del flujo OAuth, sin pasar por ningún formulario nuestro.

## Decisión

1. **Con email, casilla obligatoria.** El registro lleva una casilla sin marcar de antemano («Acepto los Términos del
   servicio y he leído la Política de privacidad», con ambos enlaces en pestaña nueva). La API la exige: `acceptTerms` es
   `z.literal(true)` en `RegisterRequestSchema`; ausente, `false` o de otro tipo responde `VALIDATION_ERROR` (400) sin crear
   nada. El cliente la valida primero y enfoca la casilla con su error.
2. **Con Google, aviso junto al botón.** Bajo el botón de Google hay una línea que dice que continuar es aceptar los Términos
   y la Política de privacidad (en el registro, tal cual; en el login, «si es tu primera vez», porque ese botón también crea
   cuentas). No hay casilla ni paso intermedio. Es una aceptación más débil que la casilla; se acepta como punto de partida y
   queda anotada en «Por definir» de `/terms` para que la revise asesoría legal.
3. **Se guarda qué, cuándo y cómo.** Tres columnas en `app_user` (migración `0096`): `terms_accepted_at`, `terms_version` y
   `terms_accepted_via` (`checkbox` o `notice`), con un `CHECK` que las exige juntas o ninguna. La versión es la fecha de
   última actualización de `/terms` (`TERMS_VERSION` en `src/lib/terms.ts`, de la que `INFO_PAGES.terms.updated` lee su
   fecha): quien cambia los Términos actualiza esa constante en el mismo cambio. Distinguir `checkbox` de `notice` conserva la
   diferencia de fuerza entre ambas aceptaciones.
4. **No se inventa lo que no ocurrió.** Las cuentas anteriores quedan con las tres columnas en `NULL`, sin backfill, y las
   creadas por scripts o fixtures (`registerUser` sin aceptación) también. Pedir la aceptación a esas cuentas en su próximo
   inicio de sesión queda como decisión pendiente (`/terms` › «Por definir»).
5. **Solo el handler de registro acepta.** `registerUser(input, acceptance)` recibe el modo como argumento explícito y solo la
   ruta `POST /api/auth/register` lo pasa; el callback de Google lo fija en `notice` al crear la cuenta. La exportación de
   datos (`GET /api/me/export`) incluye los tres campos.

## Alternativas descartadas

- **Paso intermedio para cuentas nuevas de Google** (pantalla de aceptación tras el callback): es la aceptación fuerte, pero
  cuesta un estado intermedio sin cuenta completa y se descartó por ahora a favor del aviso. Es el camino si la revisión legal
  exige más.
- **Casilla separada para la Política de privacidad:** la aceptación de los Términos no es el consentimiento para tratar los
  datos; basta con que la política esté enlazada y sea clara. Una segunda casilla sin base que la justifique es fricción.
- **Marcar la casilla de antemano:** no es una aceptación activa.
- **Guardar solo un booleano:** sin versión no se sabe qué texto aceptó cada persona ni se puede pedir una nueva aceptación
  cuando cambien los Términos.

## Consecuencias

- Cambiar los Términos obliga a actualizar `TERMS_VERSION`, que es también la fecha visible de la página.
- Toda cuenta nueva trae su aceptación; la ausencia de ella es señal de una cuenta anterior o de un fixture.
- Los textos de `/help`, `/terms` y `/privacy` (tabla de datos) lo describen, como exige la regla de `AGENTS.md`.
