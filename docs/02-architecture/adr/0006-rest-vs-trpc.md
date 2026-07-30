# ADR 0006 — REST en vez de tRPC, corrigiendo ADR implícito de Fase 1

**Estado:** Aceptado (corrige una inconsistencia entre `architecture.md` original y el código real)

## Contexto

`architecture.md` documentaba tRPC desde la planificación inicial del stack, pero las
Fases 1 y 2 se construyeron con route handlers REST (`src/app/api/catalog/*`), ya
probados de punta a punta con Postgres real y los smoke tests de ingesta. Esta
inconsistencia entre lo documentado y lo construido quedó sin detectar hasta que el
análisis de arranque de la Fase 3 (`02-architecture/frontend-plan/00-backend-analysis.md`)
la señaló explícitamente como bloqueante.

## Decisión

Usar REST como el contrato de API real del proyecto. Se actualiza `architecture.md` para
reflejar esto; no se migra el código existente a tRPC.

## Justificación

- El código REST ya existe, está probado (Postgres real + smoke tests de ingesta), y
  reescribirlo a tRPC no aporta valor de producto — sería puro costo de migración sin
  beneficio funcional en esta etapa.
- REST con Server Components llamando directo a `src/services/catalog/*` (ver
  `02-architecture/frontend-plan/01-frontend-architecture.md`) ya cubre la necesidad
  original de tRPC (evitar round-trips innecesarios): el frontend de Fase 3 no necesita
  pasar por HTTP para su carga inicial de página.
- tRPC seguiría siendo una opción válida si en el futuro se necesita un cliente externo
  fuertemente tipado (ej. una app nativa) — no se descarta para siempre, solo no se adopta
  ahora sobre código que ya funciona.

## Alternativas consideradas

- **Migrar los route handlers existentes a tRPC**: descartada para esta etapa — el costo
  de reescritura no se justifica frente al beneficio, y retrasaría el arranque de la
  Fase 3 sin necesidad real.

## Consecuencias

`docs/04-api/contracts.md` y `docs/04-api/errors.md` documentan el contrato REST real
(no un contrato tRPC). Cualquier cliente futuro (incluida una eventual app nativa)
consume la misma API REST documentada ahí.
