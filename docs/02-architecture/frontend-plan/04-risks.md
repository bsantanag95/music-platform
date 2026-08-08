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
| 9 | **Disponibilidad de Cover Art Archive / Archive.org (carátulas):** la app hotlinkea las miniaturas de CAA (`coverartarchive.org/release-group/{mbid}/front-250`), que redirige a archive.org. Se cachea solo la **URL**, no los bytes de la imagen. Una URL cacheada como "válida" no garantiza que la imagen esté disponible en el momento del GET (ver detalle abajo). | Aceptar como riesgo conocido mientras se valida la Fase 3 — la Fase 3 existe para descubrir estos problemas antes de sumar complejidad. Mitigación inmediata de bajo coste (Etapa 3.6, estados de carga): retry limitado con pequeño backoff, skeleton/placeholder mientras se reintenta y fallback definitivo al agotar intentos — sin reintentos infinitos ni tráfico excesivo. **No introduce almacenamiento propio.** Reevaluar con métricas reales (ver detalle abajo) antes de desacoplar la disponibilidad de las carátulas de CAA. |

Ningún riesgo de esta lista es, por sí solo, motivo para no empezar — todos tienen una
mitigación concreta y de bajo costo. El único requisito real antes de escribir código es
resolver los bloqueantes de decisión listados en `00-backend-analysis.md`, porque esos sí
cambian el diseño de las pantallas, no solo su implementación.

## Riesgo 9 — Disponibilidad de Cover Art Archive (detalle y evidencia para reevaluar)

- **Por qué una URL válida no garantiza que la imagen esté disponible en el GET:**
  `resolveCoverThumbUrl` (`src/services/cover-art.ts`) verifica existencia con un `HEAD` y
  `redirect: "manual"` — un 3xx de CAA cuenta como "existe". El `GET` real de la imagen (vía
  `next/image`) sigue ese redirect hasta **archive.org**, un host distinto con disponibilidad
  propia: puede responder `404`/`503` de forma transitoria o estar lento, y el optimizador de
  Next propaga ese estado al `<img>`. Por eso la misma URL puede fallar una vez y cargar
  correctamente al recargar. Se observó este comportamiento en la práctica durante la Fase 3.
- **Por qué no se introduce almacenamiento propio ahora:** la Fase 3 existe para validar el
  modelo contra discografías reales antes de agregar complejidad; todavía no hay evidencia de
  que esta dependencia degrade la experiencia de forma relevante en producción; PostgreSQL no
  debe usarse para almacenar binarios; y almacenar/servir copias propias de portadas tiene
  implicaciones de copyright que obligan a revisar `docs/03-data/data-licensing.md` antes de
  adoptarlo.
- **Mitigación inmediata (bajo coste):** retry limitado + pequeño backoff + skeleton/placeholder
  mientras se reintenta + fallback definitivo, especificada en la Etapa 3.6 de
  `02-implementation-plan.md`. Es resiliencia de bajo coste, no la solución arquitectónica
  definitiva.
- **Evidencia que justificaría reevaluar la arquitectura (métricas a medir durante la Fase 3):**
  % de cargas de carátulas fallidas; % de errores transitorios (reintentables); % de retries que
  terminan con éxito; % de imágenes que terminan en fallback; tiempo de carga de las carátulas;
  frecuencia de errores por sesión; frecuencia de errores por tipo de página/discografía. No se
  construye un sistema de analytics nuevo solo para esto — el objetivo es definir qué evidencia
  se necesitará, no crear infraestructura prematuramente.
- **Alternativas futuras (condicionadas a esa evidencia, no decididas de antemano):** cache
  HTTP/CDN, proxy propio, endpoint de imágenes propio, Object Storage o una arquitectura híbrida
  `CAA → cache/proxy → CDN → usuario`. La elección comparará disponibilidad, latencia, coste,
  complejidad operativa, escalabilidad, invalidación, comportamiento ante imágenes
  eliminadas/cambiadas y, sobre todo, las implicaciones de copyright/licencia de almacenar y
  servir copias propias. **"Object Storage" no es la respuesta correcta por defecto.**
