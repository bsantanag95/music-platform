# Features — índice

Especificaciones de producto por feature: qué hace, en qué estados, qué casos límite
tiene. Distinto de `02-architecture/frontend-plan/`, que documenta *cómo* se construye
un feature concreto (la Fase 3 hoy) — acá vive el *qué*, independiente de la
implementación.

| Documento | Fase | Estado |
|---|---|---|
| [`phase-5-design.md`](./phase-5-design.md) | 5 | 🟢 Diseño maestro: pasos 1–6 implementados, scrobbling pendiente |
| [`catalog-browsing.md`](./catalog-browsing.md) | 3 | ✅ Especificado, backend listo |
| [`ratings-and-reviews.md`](./ratings-and-reviews.md) | 4 | ✅ Implementado y validado |
| [`listening-diary-and-ratings.md`](./listening-diary-and-ratings.md) | 4-5 | 🟡 Propuesta de diseño |
| [`lists-and-favorites.md`](./lists-and-favorites.md) | 5 | ✅ Implementado (cambio `add-favorites-and-lists`) |
| [`activity-feed.md`](./activity-feed.md) | 5 | ✅ Implementado (escuchas + favoritos + listas + ratings + comentarios) |
| [`home.md`](./home.md) | 5 | 🟡 Diseño cerrado, pendiente de implementación |

## Regla de esta carpeta

No se escribe un feature spec detallado más de una fase por delante de donde está el
proyecto — `lists-and-favorites.md` y `activity-feed.md` se quedan deliberadamente cortos
hasta que llegue su fase, para no tomar decisiones de diseño que todavía no hace falta
tomar y que podrían quedar obsoletas antes de implementarse.
