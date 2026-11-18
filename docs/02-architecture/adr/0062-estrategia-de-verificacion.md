# ADR 0062 — Estrategia de verificación: bucle local, hook al terminar, checks por diff y sello en modo observe

## Estado

Aceptado (cambio `strengthen-verification-loop`, 2026-11), implementado por fases; esta versión recoge las Fases 1 a 3. Complementa
`docs/06-operations/smoke-tests.md` sin reescribirlo.

## Contexto

La verificación era `typecheck → lint → test → build` en CI, ~750 archivos de test unitarios y ~50 smoke tests contra Postgres
real que nadie ejecuta automáticamente. Las reglas de "antes de dar por terminado" estaban solo en prosa; cada fase repetía a mano
levantar `next dev` desde el worktree, copiar `.env` y elegir smoke tests; y los incidentes conocidos (Pink Floyd congelado con
datos falsos, `Date` en raw SQL, `CHECK` con `IN` nulable, firmas viejas de `params`) vivían en notas, no en checks. Con varios
agentes en paralelo, leer cada diff no escala.

## Decisión

1. **Un punto de entrada: `pnpm run verify` + skill `verify`.** Falla rápido (review → typecheck → lint → test) y deja constancia
   de lo que pasó sobre un árbol concreto (huella por contenido). El skill añade smoke tests y recorrido en el navegador.
2. **Los smoke tests solo corren contra una BD cuyo nombre indica que es desechable** (`scratch`, `test`, `ci`, `tmp`) o autorizada
   con `VERIFY_ALLOWED_DB`; si no se puede determinar, no corren (falla cerrada). Se descartó comparar contra "la BD real" porque
   el `.env` del desarrollador puede apuntar legítimamente a la scratch.
3. **Hook `Stop` del proyecto** (`.claude/settings.json`) que corre `typecheck` y `lint` si hay cambios de código; tras 3 rondas
   fallidas deja de bloquear y pide ayuda humana. No corre `test` ni `build` (pesados). Los hooks personales siguen en
   `settings.local.json`.
4. **`REVIEW.md` con disparadores sobre el diff**, cada ítem con su check y su incidente de origen, leído desde `main` para que un
   cambio no relaje su propio check.
5. **Sello `Verified:` en el commit con gate en `observe`.** Registra lo que habría bloqueado, sin bloquear; `enforce` existe,
   con válvula de escape tras 2 bloqueos, pero queda apagado hasta revisar el registro.
6. **Scripts en TypeScript ejecutados con `tsx`**, como el resto de `scripts/`: la lógica pura se testea con vitest y el
   typecheck del proyecto los cubre.
7. **E2E con Playwright contra un build de producción** y una BD de scratch sembrada, con el servidor sin user agents externos (los clientes de
   MusicBrainz, Wikimedia y ListenBrainz fallan cerrados). `next dev` se descartó como servidor por defecto: su compilación perezosa deja páginas sin
   hidratar y vuelve inestables los tests. Sin reintentos automáticos; la rúbrica de los flujos es `docs/05-features/feature-map.md`.
8. **Smoke tests en el CI con un Postgres efímero** (job `integration`, aparte de `build`) y un helper común (`runSmoke`) que hace fiel el código de salida
   y garantiza la limpieza. La lista es explícita (`ci-list.ts`) y excluye los que miden tiempos, los lentos y los que hoy fallan, con su motivo; la
   auditoría los destapó (varios mocks de MusicBrainz estaban desactualizados desde hacía cambios). Los E2E corren en un job no bloqueante hasta medir su estabilidad.

## Alternativas descartadas

- **Hooks en `settings.local.json`:** está versionado y tiene rutas absolutas de una máquina; mezcla política del proyecto con
  preferencias personales.
- **`test` y `build` en el hook `Stop`:** alargan cada turno; van en `verify` y en el CI.
- **Gate en `enforce` desde el primer día:** genera falsos positivos y fricción; se mide primero.
- **Más revisores en vez de afinar `REVIEW.md`:** un revisor principal con reglas concretas y con origen rinde más que apilar.

## Consecuencias

- Un solo comando reproduce la verificación en cualquier worktree; los agentes dejan de reinventarla.
- Las reglas críticas dejan de depender de que alguien las recuerde, pero `REVIEW.md` y los tests de `scripts/verify/` necesitan
  mantenimiento y poda.
- El sello declara lo que se corrió, no lo prueba: sirve para medir y para decidir si pasar a `enforce`.
- Las Fases 2–4 (E2E con Playwright, smoke tests en CI con Postgres efímero, tests de propiedades) amplían esta decisión y se
  anotan en `docs/06-operations/verification.md`.
