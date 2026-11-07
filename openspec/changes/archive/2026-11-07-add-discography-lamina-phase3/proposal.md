## Why

La discografía de una persona ya se ve y se comparte, pero llegar a tener una exige valorar disco por disco desde cada página. Y quien ve la de otra persona no
tiene cómo pasar a armar la suya. Es el bucle viral de `docs/05-features/sharing.md` §6, con la valoración en lote de D12. Esta es la última de las tres fases.

## Goals

- Llenar la propia discografía en minutos, sin salir de ella.
- Que quien ve la discografía de otra persona llegue a la suya, con o sin cuenta.

## Non-Goals

- Valorar tocando las celdas de la grilla: a 375 px son chicas y la grilla solo aparece desde 10 canciones.
- Puntaje detallado en lote: se sigue poniendo desde la página del disco o de la canción.
- "Compárala con la tuya" ("Tú vs. otra persona", su propio cambio).
- Un aviso en el feed distinto para lo valorado en lote: cada valoración entra como siempre.

## What Changes

- **Valora lo que falta:** `?valorar=1` en la discografía propia lista los discos de las secciones mostradas que no tienen nota, cada uno con sus estrellas. Guarda al tocar, con la API de siempre.
- **También en la Lámina de un álbum:** las canciones sin nota tienen sus estrellas en la lista, solo para el dueño.
- **Entrada:** un enlace "Valora lo que falta" en la discografía propia cuando quedan discos sin nota, y la discografía del dueño existe aunque aún no llegue a 3 discos.
- **Arma la tuya en una discografía:** el llamado lleva a tu discografía de ese artista en el modo para valorar. Sin sesión pasa por el registro o el login y vuelve ahí.
- **Segunda intención cerrada:** `discografia=<artistId>`, además de `lamina=<id>`. El destino lo arma el código con el usuario autenticado. Se agrega en un ADR que amplía el 0052.

## Capabilities

### New Capabilities

Ninguna.

### Modified Capabilities

- `discography-laminas`: valorar lo que falta y "Arma la tuya".
- `google-oauth`: el flujo admite la intención de discografía.
- `onboarding`: quien se registra con cualquiera de las dos intenciones no aterriza en `/welcome`.

## Impact

- **Base de datos:** sin migración.
- **Autenticación:** la intención pasa de un id de Lámina a un valor cerrado con dos formas, en `src/lib/laminas/intent.ts`, `AuthForm`, `LoginPanel`, `SocialSignIn`, páginas de registro y login, `oauth-flow.ts` y rutas de Google.
- **Láminas:** `discography.ts` (discos sin nota), página de discografía y de álbum, `LaminaCta`.
- **Documentación:** ADR 0054, `docs/02-architecture/auth.md`, `docs/05-features/sharing.md`, `business-rules.md`, `contracts.md`, `AGENTS.md`.
