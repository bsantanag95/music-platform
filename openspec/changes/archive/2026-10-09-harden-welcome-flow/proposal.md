## Why

Dos pendientes de la auditoría de `/welcome` (2026-10-09):

- **Recargar pierde el trabajo.** El paso y los álbumes elegidos viven en memoria hasta el cierre; lo seguido y lo registrado en los otros pasos ya está en el servidor pero la lista se pierde, de modo que tras recargar se puede volver a registrar la misma escucha (entrada de diario duplicada) y ya no se puede deshacer.
- **Doble render tras registrarse.** `router.push` seguido de `router.refresh()` pide la página destino dos veces: la primera termina abortada (`ERR_ABORTED`) pero el servidor ya la renderizó (`/welcome` 2746 ms + 205 ms; `/` 2588 ms + 424 ms, medido en dev). El `refresh` existe porque el Header vive en un layout que `push` no vuelve a pedir.

## What Changes

- **Estado de sesión del flujo** (`sessionStorage`, por persona): el paso, los álbumes elegidos, los artistas seguidos y las escuchas registradas (con el id de la entrada, para poder deshacer) sobreviven a una recarga de la pestaña. Un valor guardado con otra forma se descarta; sin almacenamiento disponible el flujo sigue en memoria; al cerrar el onboarding se borra.
- **Una sola petición tras registrarse o iniciar sesión**: `AuthForm` navega con una navegación completa del navegador (el layout se renderiza ya con la sesión) en vez de `push` + `refresh`, y mantiene el botón en «enviando» hasta que cambia la página. «Ir a Inicio» del resumen deja de llamar a `refresh` (Inicio es dinámico y el layout no cambia con el cierre).

## Capabilities

### Modified Capabilities

- `onboarding`: el flujo conserva el paso y lo elegido al recargar la pestaña.

## Impact

- `src/lib/session-state.ts` y `src/lib/hard-navigate.ts` nuevos; `WelcomeFlow`, `ArtistFollowPicker`, `NowPlayingPicker`, `AlbumIdentityPicker`, `AuthForm`, `welcome/page.tsx`; pruebas.
- `docs/05-features/onboarding.md`.

## Non-Goals

- Persistir el flujo en el servidor o entre dispositivos (la selección es de la pestaña).
- Cambiar `ResetPasswordForm` (no hay sesión que reflejar en el layout).
- Reordenar los resultados locales cuando llega la búsqueda completa.
