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
| [`lists-and-favorites.md`](./lists-and-favorites.md) | 5 | ✅ Implementado (`add-favorites-and-lists`; sección `/me/lists` en `rework-lists-section`; detalle con 3 modos de vista + gestión interna de ítems + vista de lectura ajena en `rework-list-detail`; sección `/me/favorites` como muro por tipo con filtros y gestión de audiencia en lote en `rework-favorites-section`) · ⏳ listas seguidas en el feed → `add-followed-lists-to-feed` |
| [`physical-collection.md`](./physical-collection.md) | 5 | ✅ Implementado (`add-physical-collection`; estantería `/me/collection` con 3 modos de vista + toolbar de búsqueda/orden/agrupación + edición en línea + cambio de audiencia en lote + vista de lectura ajena en `rework-collection-section`) |
| [`activity-feed.md`](./activity-feed.md) | 5 | ✅ Implementado (escuchas + favoritos + listas + ratings + comentarios) |
| [`home.md`](./home.md) | 5 | ✅ Implementado (cambio `add-home-page`) |

## Regla de esta carpeta

No se escribe un feature spec detallado más de una fase por delante de donde está el
proyecto — `lists-and-favorites.md` y `activity-feed.md` se quedan deliberadamente cortos
hasta que llegue su fase, para no tomar decisiones de diseño que todavía no hace falta
tomar y que podrían quedar obsoletas antes de implementarse.
