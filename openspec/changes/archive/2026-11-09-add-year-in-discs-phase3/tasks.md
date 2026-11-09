## 1. Datos y servicios

- [x] 1.1 `drizzle/0089_year_invitation.sql` (tipo y preferencia `year_in_discs`, `notification.year`, `CHECK` y único), aplicada en scratch;
  `schema.ts`, `sql-model.md`, `domain-model.md`
- [x] 1.2 `yearInvitationFor(now, timeZone)` y la lectura de la tarjeta (escuchas visibles del año, marca, cookie de descarte); pruebas
- [x] 1.3 Notificaciones: tipo en "Novedades", sin contador, preferencia en la pantalla de preferencias, enlace al año; pruebas
- [x] 1.4 `scripts/send-year-invitations.ts` (ventana UTC, idempotente, `--dry-run`) y `.cmd`; `docs/06-operations`

## 2. Arma la tuya

- [x] 2.1 `BuildIntent` con `{ kind: "year" }` y `anio=<año>`: registro, login, Google (estado del flujo), prioridad; pruebas
- [x] 2.2 Llamado en el año de otra persona (con y sin sesión); ADR `0055`; `contracts.md`

## 3. Páginas

- [x] 3.1 Año propio sin escuchas: estado vacío para el dueño, 404 para el resto; pruebas
- [x] 3.2 Tarjeta en Inicio y en el diario, con "Descartar"; pruebas

## 4. Documentación y textos

- [x] 4.1 `docs/05-features/sharing.md` (estado), `docs/01-domain/business-rules.md`
- [x] 4.2 Textos es/en y `client-messages`
- [x] 4.3 Smoke `scripts/smoke-test-year-laminas.ts` ampliado (y `smoke-test-google-oauth.ts` con la intención de año) y sus entradas en `AGENTS.md`

## 5. Verificación

- [x] 5.1 Smoke contra Postgres real: `CHECK` de `0089`, envío en y fuera de la ventana, repetido, preferencia, cuenta desactivada, `--dry-run`, tarjeta
  (marca, descarte, ocultos), año propio vacío
- [x] 5.2 HTTP sobre el build final: registro y login con `anio=`, valor inválido
- [x] 5.3 Navegador con el build final, en escritorio y a 375 px: tarjeta (con la fecha simulada), descartar, "Arma la tuya" anónimo → registro → año
  propio vacío, aviso en "Novedades"
- [x] 5.4 `pnpm run typecheck`, `lint`, `test` y `build`

## Resultados (2026-11-09)

- Suite completa: 713 archivos, 7097 pruebas en verde; `typecheck`, `lint` (sin avisos nuevos) y `build` pasan.
- Smoke en scratch (`0089` aplicada): sección "Invitación de diciembre" en verde (el envío se acota a las cuentas del smoke con `onlyUserIds`); la
  lectura del año sigue en ~22 ms con 1.000 escuchas. `smoke-test-google-oauth.ts` suma la intención de año (alta, cuenta existente, prioridad, inválida).
- HTTP sobre el build: `/auth/register?anio=2026` conserva la intención en el enlace al login, `anio=1850` se descarta; el año compartido muestra
  "Arma la tuya" con `anio=2026` a un anónimo; un año sin escuchas de otra persona responde 404.
- Navegador (build): "Arma la tuya" → registro → `/users/<nueva>/year/2026` con el estado vacío; 2025 propio vacío 200, 2027 404. El aviso aparece en
  "Novedades" con enlace al año propio; la preferencia se apaga y se enciende (por API: el panel oculto no deja hacer clic en los interruptores, tampoco
  en los ya existentes).
- Tarjeta: con un servidor de desarrollo y una fecha simulada temporal (3 de diciembre, quitada antes de cerrar), Inicio y el diario la muestran;
  "Descartar" la oculta y no vuelve en ninguna de las dos; a 375 px sin desborde y botones de 44 px.
