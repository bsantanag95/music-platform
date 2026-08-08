# Frontend — Plan de implementación (Fase 3 del roadmap)

Plan para construir las primeras vistas del frontend: un **catálogo navegable de solo
lectura** (buscar → artista → álbum → canción), que es el entregable de la **Fase 3** de
`docs/00-product/roadmap.md`. No incluye autenticación ni valoraciones/comentarios — eso
es Fase 4 y queda fuera de alcance de este plan.

**Estado general: 🟢 Etapas 3.0, 3.0b, 3.1, 3.2, 3.3, 3.4 y 3.6 completas.** Backend listo
(`00-backend-analysis.md`); i18n implementado (Etapa 3.0b); Fase 3 cerrada y lista para
revisión con usuarios.

## Índice

| Documento | Responde a | Estado |
|---|---|---|
| [`00-backend-analysis.md`](./00-backend-analysis.md) | Qué puede consumir el frontend hoy, qué falta, qué decisiones están pendientes | 🟢 Resuelto |
| [`01-frontend-architecture.md`](./01-frontend-architecture.md) | Estructura de carpetas, stack, manejo de estado, nuevas dependencias | 🟢 Confirmada |
| [`02-implementation-plan.md`](./02-implementation-plan.md) | Etapas de construcción, una por vista, con tareas/archivos/criterios de aceptación | 🟢 Lista para ejecutar |
| [`03-best-practices.md`](./03-best-practices.md) | Tipado, manejo de errores, testing, reutilización de componentes | 🟢 Confirmada |
| [`04-risks.md`](./04-risks.md) | Riesgos técnicos detectados y mitigaciones | 🟡 Vigente |

Ver también `docs/04-api/` (`contracts.md` y `errors.md`), que documentan el contrato de
API sobre el que se apoya este plan y las brechas que hay que resolver primero.

## Regla de avance

No se avanza a construir código (Etapa 3.0 en adelante) sin confirmar antes los puntos
bloqueantes listados en `00-backend-analysis.md`. Ninguna etapa se marca como completa en
`02-implementation-plan.md` hasta que su criterio de aceptación se cumple de verdad.

## Regla de mantenimiento

Igual que en `docs/README.md`: no se modifica un documento de este plan sin revisar el
impacto en los demás — una decisión nueva en `00-backend-analysis.md` puede invalidar una
etapa entera de `02-implementation-plan.md`, y debe reflejarse ahí también.
