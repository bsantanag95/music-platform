# Riesgos técnicos y recomendaciones

| # | Riesgo | Mitigación |
|---|---|---|
| 1 | **Rate limit de MusicBrainz (1 req/seg)** en navegación real: la cola en memoria de `musicbrainz/client.ts` serializa toda ingesta nueva; con varios usuarios visitando artistas nunca antes vistos al mismo tiempo, alguno puede esperar varios segundos. | Estados de carga explícitos en frontend (ya incluido en `02-implementation-plan.md`); mensaje tipo "estamos importando este artista por primera vez"; a mediano plazo evaluar cola distribuida, ya anotada como limitación conocida en `client.ts` y `architecture.md`. |
| 2 | ~~**Desalineación entre `architecture.md` (tRPC) y el código real (REST)**~~ **✅ Resuelto** — `architecture.md` corregido a REST, ver ADR 0006. | — |
| 3 | ~~**Sin convención de errores estandarizada**~~ **✅ Resuelto** — `code` implementado en los tres route handlers, ver `docs/04-api/errors.md`. | — |
| 4 | ~~**Endpoints faltantes bloquean 2 de las 3 pantallas principales**~~ **✅ Resuelto** — `artist/[id]` y créditos en tracklist implementados y validados con Postgres real (ver `code-walkthrough.md`). | — |
| 5 | **Sin testing automatizado hoy**, ni en frontend ni en backend: cualquier regresión solo se detecta manualmente. | Etapa 3.0 incluye setup mínimo de Vitest; evaluar Playwright antes de Fase 4, donde aparecen formularios de escritura (rating/comentarios) con más superficie de bugs. Los smoke tests de `scripts/` (`smoke-test-*.ts`) cubren hoy el backend contra Postgres real, pero no reemplazan un test runner configurado. |
| 6 | **Uso incorrecto de carátulas** (Cover Art Archive): cualquier componente que arme una URL de imagen a mano, en vez de usar `coverThumbUrl()`, podría terminar sirviendo una imagen de alta resolución — violando la política de producto documentada en `docs/03-data/data-licensing.md`. | Centralizar todo uso de carátula en `AlbumCover`/`LazyCoverImage`, que internamente llaman a `coverThumbUrl()`; prohibir por convención de código construir esa URL en cualquier otro componente (ver `03-best-practices.md`). |
| 7 | **PWA diferida a Fase 6 (ADR 0001)**: si el frontend de Fase 3 no se construye mobile-first desde el principio, hay retrabajo visual en Fase 6. | Tailwind + diseño responsive desde la Etapa 3.0/3.6, aunque el manifest/service worker en sí queden fuera de esta fase. |
| 8 | ~~**Decisión de alcance de "detalle de canción" sin resolver**~~ **✅ Resuelto** — Camino A confirmado, diferido a Fase 4. | — |

Ningún riesgo de esta lista es, por sí solo, motivo para no empezar — todos tienen una
mitigación concreta y de bajo costo. El único requisito real antes de escribir código es
resolver los bloqueantes de decisión listados en `00-backend-analysis.md`, porque esos sí
cambian el diseño de las pantallas, no solo su implementación.
