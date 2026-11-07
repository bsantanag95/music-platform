## 1. Intención

- [x] 1.1 `BuildIntent` en `src/lib/laminas/intent.ts`: leer, validar y armar el destino; pruebas
- [x] 1.2 `AuthForm`, `LoginPanel`, `SocialSignIn`, registro y login con `intent`; pruebas
- [x] 1.3 Estado y rutas de Google con `intent`, leyendo el campo anterior; pruebas
- [x] 1.4 ADR 0054 y `docs/02-architecture/auth.md`

## 2. Valorar lo que falta

- [x] 2.1 `discography.ts`: discos sin nota para el dueño, y la página del dueño siempre existe; pruebas
- [x] 2.2 `?valorar=1` con la lista de estrellas y la entrada desde la discografía; pruebas
- [x] 2.3 Estrellas en las canciones sin nota de la Lámina de álbum, solo para el dueño; pruebas

## 3. Arma la tuya

- [x] 3.1 `LaminaCta` con su destino y el llamado en la discografía; pruebas

## 4. Documentación y textos

- [x] 4.1 `docs/05-features/sharing.md` (D12 y estado), `docs/01-domain/business-rules.md` y `docs/04-api/contracts.md`
- [x] 4.2 Textos es/en y `client-messages`
- [x] 4.3 Ampliar `scripts/smoke-test-discography-lamina.ts` y `scripts/smoke-test-google-oauth.ts`, con su entrada en `AGENTS.md`

## 5. Verificación

- [x] 5.1 Smoke contra Postgres real: discos sin nota, página del dueño sin valoraciones y Google con la intención de discografía (alta nueva, cuenta existente, inválida)
- [x] 5.2 Navegador con el build final, a 375 px: valorar discos y canciones, "Arma la tuya" anónimo con registro local y con sesión
- [x] 5.3 `pnpm run typecheck`, `lint`, la suite completa y `build`

### Resultados de la verificación (2026-11-07)

- `scripts/smoke-test-discography-lamina.ts` pasa contra Postgres real (BD de scratch): la discografía del dueño existe sin valoraciones con sus 3 discos por
  valorar, una seguidora no la ve, la Lámina de un álbum sin valorar existe solo para el dueño, y al valorar los 3 discos no queda nada por valorar.
- `scripts/smoke-test-google-oauth.ts` pasa: la intención de discografía lleva al alta nueva y a la cuenta existente a su discografía con su propio usuario; con
  las dos intenciones manda la Lámina; un valor inválido se descarta. La de Lámina sigue igual.
- Navegador con el build final, a 375 px y por el DOM: como anónimo, el llamado de una discografía compartida con `discografia=`; registro local que la conserva
  (también en Google y login) y llega a `/users/<nueva>/artist/<id>?valorar=1`; valorar un disco que se guarda y sube "1 disco valorado"; la Lámina de un álbum sin
  valorar con estrellas en cada canción. Sin desplazamiento horizontal.
- Hallazgo corregido en el navegador: a 375 px las estrellas aplastaban el título de cada fila; pasaron a su propia línea, en la lista y en las canciones.
- `pnpm run typecheck`, `lint`, la suite completa (698 archivos, 6929 pruebas) y `build` pasan. Después del ajuste de las filas, que solo cambia clases, se
  repitieron `typecheck`, las pruebas de la página y el `build`, no la suite completa.
