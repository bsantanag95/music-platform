## 1. Estado que sobrevive a la recarga

- [x] 1.1 `useSessionState` (`sessionStorage`, hidratación tras el primer render, `try/catch`, validación) y `clearSessionState`
- [x] 1.2 `WelcomeFlow` guarda paso y álbumes; `ArtistFollowPicker` y `NowPlayingPicker` guardan lo seguido y lo registrado (`storageKey` por persona); se borra al cerrar
- [x] 1.3 Pruebas: recarga conserva paso/álbumes/seguidos/registrados, aislamiento por persona, limpieza al cerrar, valores inválidos descartados

## 2. Una sola petición tras autenticarse

- [x] 2.1 `hardNavigate` y `AuthForm` (registro e inicio de sesión) sin `push` + `refresh`; `pending` hasta que cambia la página; pruebas
- [x] 2.2 «Ir a Inicio» del resumen sin `router.refresh()`

## 3. Documentación y verificación

- [x] 3.1 `docs/05-features/onboarding.md`
- [x] 3.2 Navegador: un solo `GET /es/welcome` tras registrarse; recargar en el paso 2 conserva paso y álbum
- [x] 3.3 `pnpm run typecheck && pnpm run lint && pnpm run test && pnpm run build` (la suite completa y el build se corren una vez al cierre de la rama, junto con `extend-welcome-steps`)
