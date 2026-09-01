# Riesgos técnicos y recomendaciones

| # | Riesgo | Mitigación |
|---|---|---|
| 1 | **Rate limit de MusicBrainz (1 req/seg)** en navegación real: la cola en memoria de `musicbrainz/client.ts` serializa toda ingesta nueva; con varios usuarios visitando artistas nunca antes vistos al mismo tiempo, alguno puede esperar varios segundos. | Estados de carga explícitos en frontend (ya incluido en `02-implementation-plan.md`); mensaje tipo "estamos importando este artista por primera vez"; a mediano plazo evaluar cola distribuida, ya anotada como limitación conocida en `client.ts` y `architecture.md`. |
| 2 | ~~**Desalineación entre `architecture.md` (tRPC) y el código real (REST)**~~ **✅ Resuelto** — `architecture.md` corregido a REST, ver ADR 0006. | — |
| 3 | ~~**Sin convención de errores estandarizada**~~ **✅ Resuelto** — `code` implementado en los route handlers, ver `docs/04-api/errors.md`. | — |
| 4 | ~~**Endpoints faltantes bloquean 2 de las 3 pantallas principales**~~ **✅ Resuelto** — `artist/[id]` y créditos en tracklist implementados y validados con Postgres real (ver `code-walkthrough.md`). | — |
| 5 | **Sin testing automatizado hoy**, ni en frontend ni en backend: cualquier regresión solo se detecta manualmente. | Etapa 3.0 incluye setup mínimo de Vitest; evaluar Playwright antes de Fase 4, donde aparecen formularios de escritura (rating/comentarios) con más superficie de bugs. Los smoke tests de `scripts/` (`smoke-test-*.ts`) cubren hoy el backend contra Postgres real, pero no reemplazan un test runner configurado. |
| 6 | **Uso incorrecto de carátulas** (Cover Art Archive): cualquier componente que arme una URL de imagen a mano, en vez de usar `coverThumbUrl()`, podría terminar sirviendo una imagen de alta resolución — violando la política de producto documentada en `docs/03-data/data-licensing.md`. | Centralizar todo uso de carátula en `AlbumCover`/`LazyCoverImage`, que internamente llaman a `coverThumbUrl()`; prohibir por convención de código construir esa URL en cualquier otro componente (ver `03-best-practices.md`). |
| 7 | **PWA diferida a Fase 6 (ADR 0001)**: si el frontend de Fase 3 no se construye mobile-first desde el principio, hay retrabajo visual en Fase 6. | Tailwind + diseño responsive desde la Etapa 3.0/3.6, aunque el manifest/service worker en sí queden fuera de esta fase. |
| 8 | ~~**Decisión de alcance de "detalle de canción" sin resolver**~~ **✅ Resuelto** — Camino A confirmado, diferido a Fase 4. | — |
| 9 | **Disponibilidad de Cover Art Archive / Archive.org (carátulas):** la app hotlinkea las miniaturas de CAA (`coverartarchive.org/release-group/{mbid}/front-250`), que redirige a archive.org. Se cachea solo la **URL**, no los bytes de la imagen. Una URL cacheada como "válida" no garantiza que la imagen esté disponible en el momento del GET (ver detalle abajo). | Aceptar como riesgo conocido mientras se valida la Fase 3 — la Fase 3 existe para descubrir estos problemas antes de sumar complejidad. Mitigación inmediata de bajo coste (Etapa 3.6, estados de carga): retry limitado con pequeño backoff, skeleton/placeholder mientras se reintenta y fallback definitivo al agotar intentos — sin reintentos infinitos ni tráfico excesivo. **No introduce almacenamiento propio.** Reevaluar con métricas reales (ver detalle abajo) antes de desacoplar la disponibilidad de las carátulas de CAA. |
| 10 | **Dogpile sobre MusicBrainz en cache-miss concurrente:** múltiples requests HTTP sobre la misma entidad no cacheada generan llamadas duplicadas a la API de MusicBrainz. La cola serial en proceso las espacia pero no las descarta — ver detalle abajo. | **Riesgo aceptado sin mitigación activa.** Si el tráfico lo justifica, la solución es un rate limitador distribuido (Redis token bucket, previsto en `client.ts:9-13`), no advisory locks. Ver ADR 0011. Revisar cuando la profundidad de cola sostenida o el p95 de latencia en rutas de cache-miss superen un umbral definido. **El checklist de métricas pre-despliegue vive en B.3 de `scalability-infrastructure.md`** (fuente única, no duplicada aquí). |
| 11 | **Costo del agregado de rating en vivo (`AVG()`/`count(*)` por lectura).** El promedio por entidad se calcula al vuelo (`src/services/social.ts:37-39`) y no hay columna materializada (`rating_average`/`rating_sum`/`rating_count`) en ninguna tabla. Hoy está mitigado por los índices de target (`idx_rating_*`, ver detalle abajo), que hacen de la agregación un index scan por entidad, no un seq scan. Diferido: no hay señal de tráfico que justifique materializar todavía. | **No-riesgo con ADR 0009** — como no existe el estado derivado, el borrado físico de `rating` no puede dejar agregados desfasados: no hay nada que sincronizar. **Diferido por falta de señal.** Si se materializa el agregado, la sincronización debe usar triggers de Postgres (mismo argumento estructural de ADR 0009: no depender de que cada código de mutación, escrito por modelos distintos, recuerde actualizar el agregado). Revisar cuando el p95 de latencia en páginas de entidad con conteo alto de ratings, o el volumen de ratings por entidad, superen un umbral definido. |
| 12 | **Fragmentación del índice de PK por UUID v4 aleatorio en tablas comunitarias de alto volumen** (`rating`, `comment`, `listen_entry`): cada `INSERT` cae en una posición impredecible del B-tree de la PK (a diferencia de un BIGSERIAL o UUID v7 monótonos). A volumen alto: el índice de PK se fragmenta más rápido (peor cache hit ratio, más I/O) y ocupa más espacio en disco (16 bytes vs 8 bytes por entrada, antes del row). **Trade-off no documentado en ADR 0003**, que eligió UUID por otro eje (colisiones con MusicBrainz, pre-generación, no exponer conteo) y solo mencionó el peso del índice, no la localidad de inserción. Ver detalle abajo. | **Diferido sin mitigación activa.** Riesgo de escala, no de corrección — el límite de INT no aplica y no hay bug. Si se activa el trigger, las opciones incluyen indexar por un `BIGSERIAL` de solo-índice, migrar a UUID v7 (monótono, no expone conteo vía leak inferencial bajo, preserva la pre-generación), o particionar las tablas. Preserva el argumento de ADR 0003 para el catálogo (mbid externo). Revisar cuando el volumen de filas en una tabla comunitaria o el tamaño/fragmentación del índice de PK superen un umbral definido. |

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

## Riesgo 10 — Dogpile sobre MusicBrainz en cache-miss concurrente

Cuando múltiples requests HTTP hacen cache-miss de la misma entidad de catálogo simultáneamente, cada una genera su propia llamada a la API de MusicBrainz. La cola serial en proceso (`client.ts`, `MIN_INTERVAL_MS = 1100`) serializa las llamadas HTTP salientes, pero no evita que se generen múltiples llamadas para la misma entidad — solo las espacia.

- **Efecto de segundo orden:** las llamadas duplicadas no solo desperdician trabajo propio
  (upserts idempotentes que se sobreescriben con los mismos datos) — también ocupan turnos de
  la cola serial que podrían estar sirviendo cache-misses de _otras_ entidades, no relacionadas
  con el pico. El costo real durante un pico no es solo cómputo desperdiciado: es **latencia
  para usuarios que no tienen nada que ver con la entidad que generó el dogpile**.
- **Por qué no se usan advisory locks:** la única función de ingestión que los necesita es
  `ensureArtistMemberships` (`ingest-artist.ts:63-96`), porque tiene una operación destructiva
  (DELETE de relaciones stale) que sí puede corromper datos bajo concurrencia. Las demás
  funciones de ingestión son puramente aditivas — la peor consecuencia de concurrencia es
  trabajo desperdiciado, no corrupción. Serializar escrituras aditivas detrás de un lock
  introduciría latencia innecesaria para prevenir un riesgo que hoy es despreciable.
  Ver ADR 0011 para la justificación completa de esta decisión.
- **Impacto actual:** despreciable. A la escala actual (poco tráfico, un solo proceso Node), el
  escenario de múltiples usuarios solicitando simultáneamente la misma entidad no cacheada es
  prácticamente imposible.
- **Trigger de revisión:** en vez de un criterio genérico ("si el tráfico crece"), la señal
  concreta a monitorear es: profundidad de cola sostenida en `client.ts`, o p95 de latencia en
  rutas de cache-miss superando un umbral definido. _(Conexión directa con el punto B.3 del
  checklist de infraestructura — "aclarar primero" qué observabilidad existe hoy antes de fijar
  el umbral.)_
- **Mitigación si se activa el trigger:** un rate limitador distribuido (Redis token bucket, ya
  previsto como componente futuro en `client.ts:9-13`) — no advisory locks por entidad.

## Riesgo 11 — Costo del agregado de rating en vivo

El promedio de rating por entidad se calcula al vuelo en la capa de servicio (`src/services/social.ts:37-39`) con `AVG(stars)::float`, `AVG(detailedScore)::float` y `count(*)::int`. No existe ninguna columna materializada (`rating_average`, `rating_sum`, `rating_count`) en ninguna tabla, ni trigger que las mantenga — el único trigger sobre `rating` es `trg_rating_touch` para `updated_at`.

- **Por qué no es un problema hoy:** `rating` tiene **dos conjuntos de índices** (`drizzle/0000_initial.sql`):
  - `uq_rating_user_*` (parciales, `user_id` líder): sirven al upsert por usuario (`social.ts:58-73` codifica contra el `ON CONFLICT` sobre estos índices).
  - `idx_rating_*` (`artist_id`, `release_group_id`, `recording_id` como líder, espejados en `schema.ts:275-277`): sirven al query del promedio, que filtra por entidad (`WHERE release_group_id = ?`). La agregación es un index scan por entidad, no un seq scan de la tabla completa. No hay gap de índice pendiente.
- **Cierre no-riesgo con ADR 0009:** como no existe el estado derivado, el borrado físico de `rating` (ADR 0009) no puede dejar agregados desfasados — no hay nada que sincronizar. La intersección que motivaba el ítem A.5 del checklist de infraestructura ("si se borra físicamente, definir el mecanismo de reconciliación del agregado") **no aplica mientras no exista el agregado**.
- **Cuándo materializar (diferido):** no hay señal de tráfico que justifique materializar el promedio todavía. Si se materializa, la sincronización debe usar **triggers de Postgres** (reutilizando el patrón de `trg_rating_touch`), no lógica de aplicación dentro de cada mutación — mismo argumento estructural que ADR 0009 usa contra soft-delete: no depender de que cada código de mutación, escrito por modelos distintos a lo largo del tiempo, recuerde actualizar el agregado. Un `UPDATE` de un rating existente se sincroniza igual que un `INSERT`/`DELETE` (el trigger debe cubrir las tres operaciones).
- **Trigger de revisión:** p95 de latencia en páginas de entidad con conteo alto de ratings, o volumen de ratings por entidad superando un umbral definido — no "tráfico" en general. **El checklist de métricas pre-despliegue vive en B.3 de `scalability-infrastructure.md`** (fuente única, no duplicada aquí).

## Riesgo 12 — Fragmentación del índice de PK por UUID v4 aleatorio

Todas las PK del proyecto son `UUID ... DEFAULT gen_random_uuid()` (v4, aleatorio) — verificado en las 18 tablas (`drizzle/*.sql`) y centralizado en `conventions.md:12` + ADR 0003. En las tablas comunitarias de mayor crecimiento (`rating`, `comment`, `listen_entry`), cada `INSERT` cae en una posición impredecible del B-tree del índice de PK.

- **El trade-off que ADR 0003 no documentó:** la justificación de ADR 0003 elige UUID por tres ejes — evita colisiones con MusicBrainz (cuyos `mbid` también son UUID), permite generar el ID pre-insert sin round-trip a la base, y no expone el conteo/orden de filas vía URL (evita IDs secuenciales enumerables). La única mención de costo es en "Consecuencias": "índices ligeramente más pesados… costo aceptable dado el volumen esperado". Eso habla del **tamaño en bytes del índice**, no de la **localidad de inserción**. No hay mención a fragmentación, a UUID v7 ni a ninguna alternativa monótona en docs ni en el código.
- **Por qué importa (a volumen alto, no hoy):** un UUID v4 aleatorio, a diferencia de un `BIGSERIAL` o un UUID v7 (monótonos crecientes), produce:
  - **Fragmentación del índice de PK** — los page-split del B-tree ocurren en posiciones intermedias en vez de al final; peor cache hit ratio y más I/O bajo alta tasa de INSERT.
  - **Mayor ocupación de disco** — 16 bytes por entrada (vs 8 de un BIGINT), antes de contar el propio row; pero el costo de bytes ya estaba reconocido en ADR 0003, el nuevo es el de localidad.
- **Por qué no es A.4 de nuevo:** A.4 trataba el límite de ancho (overflow de INT32). Este riesgo es distinto: no hay overflow ni migración forzosa por tipo — es una degradación gradual de performance de escritura en tablas de alto volumen.
- **Consideración del trade-off para mitigaciones futuras (no decididas):** la razón del catálogo para UUID (mbid externo) **no aplica a las PK internas** de `rating`/`comment`/`listen_entry` — esas no se sincronizan con MusicBrainz, así que están libres para usar una PK interna secuencial o UUID v7 sin fricción de fuente externa. Pero la razón "no exponer conteo" con UUID v7 queda casi intacta (el orden es inferible, no el volumen exacto). No es una decisión a tomar hoy.
- **Trigger de revisión:** volumen de filas en una tabla comunitaria superando un umbral definido, o tamaño/fragmentación del índice de PK (medible vía `pg_stat_user_indexes`/`pgstattuple`) degradándose — no "tráfico" en general. **El checklist de métricas pre-despliegue vive en B.3 de `scalability-infrastructure.md`** (fuente única, no duplicada aquí).

## Clasificación de datos de los riesgos

Varios riesgos de esta lista tienen su categoría de perdibilidad/reconstruibilidad definida en
`../data-classification.md` (marco de clasificación de datos, ítem resuelto A.6):

- **Riesgo #10 (dogpile MusicBrainz)** → **Clase B (espejo reconstruible).** El dato en cache-miss es
  regenerable desde MusicBrainz; el riesgo es de **latencia**, no de pérdida.
- **Riesgo #11 (agregados de rating no materializados)** → **Clase C (derivada/computable).** Recalculable
  desde Clase A; hoy virtual, por eso el borrado físico de ADR 0009 no deja nada que desincronizar.
- **C.10 (namespacing de esquemas, diferido en `scalability-infrastructure.md`)** → **cruza las clases**:
  los schemas lógicos `catalog.*` (mayormente espejo) vs `community.*`/`users.*` (propios) se alinean
  conceptualmente con la clasificación.


