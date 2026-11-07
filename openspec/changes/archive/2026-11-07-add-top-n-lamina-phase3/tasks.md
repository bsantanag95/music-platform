## 1. Intención

- [x] 1.1 `src/lib/laminas/intent.ts`: validar el `uuid` y armar la ruta; pruebas
- [x] 1.2 ADR 0052 y `docs/02-architecture/auth.md`

## 2. Autenticación

- [x] 2.1 `AuthForm`, `LoginPanel` y `SocialSignIn` con `laminaId`; pruebas
- [x] 2.2 Páginas de registro y login: leer `lamina`, enlaces entre ellas y redirección con sesión; pruebas
- [x] 2.3 `oauth-flow.ts` y rutas de Google: `laminaId` en el estado, solo con `login`, y retorno en el callback; pruebas

## 3. Láminas

- [x] 3.1 `getLaminaInspiration` con las reglas de lectura de la página pública
- [x] 3.2 Llamado en la página pública, según sesión y dueño; pruebas
- [x] 3.3 `/me/laminas?desde=` y `LaminaCreateForm` inspirado: formato, tipo, chip y enlace de vuelta; pruebas

## 4. Documentación y textos

- [x] 4.1 `docs/05-features/sharing.md` §6 y §9 y `docs/01-domain/business-rules.md`
- [x] 4.2 Textos es/en y `client-messages`
- [x] 4.3 Ampliar `scripts/smoke-test-top-laminas.ts` y `scripts/smoke-test-google-oauth.ts`, con su entrada en `AGENTS.md`

## 5. Verificación

- [x] 5.1 Smoke contra Postgres real: lectura de inspiración (pública, privada, oculta, propia) y Google con alta nueva, cuenta existente, valor inválido e intención de cuenta
- [x] 5.2 Navegador con el build final, a 375 px: visitante anónimo, registro local con la intención, formulario inspirado y visitante con sesión
- [x] 5.3 `pnpm run typecheck`, `lint`, `test` y `build`

### Resultados de la verificación (2026-11-07)

- `scripts/smoke-test-top-laminas.ts` pasa contra Postgres real (BD de scratch): la lectura de inspiración hereda formato, tipo y título, sin ítems, y devuelve
  `null` con una Lámina propia, inexistente, de un bloqueo, para seguidores sin seguir, privada, oculta o que ya no es Lámina.
- `scripts/smoke-test-google-oauth.ts` pasa: alta nueva y cuenta existente van a `/es/me/laminas?desde=<id>` y el onboarding sigue pendiente; un valor inválido se
  descarta y el callback no lee la intención de su query. Que `link` y `reauth` la ignoren lo cubre una prueba unitaria, no el smoke.
- Navegador con el build final, a 375 px y por el DOM: como anónimo, la Lámina entera con el llamado; registro local con la intención, enlace de Google y de login
  que la conservan; llegada a `/es/me/laminas?desde=<id>` con Top 10 y álbumes elegidos, título vacío, el título ajeno como sugerencia sin repetirse y enlace de vuelta;
  Lámina creada sin ítems ajenos; con sesión, el llamado va directo al formulario; `?desde=` inválido deja el formulario normal; Inicio ofrece la bienvenida
  pendiente. Sin desplazamiento horizontal.
- No se probó el registro con Google real en el navegador: lo cubre el smoke, con un proveedor simulado.
- `pnpm run typecheck`, `lint`, `test` (694 archivos, 6881 pruebas) y `build` pasan.
