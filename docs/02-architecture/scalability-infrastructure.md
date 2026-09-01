# Checklist de infraestructura y escalabilidad — análisis de propuesta externa

**Contexto:** Este documento clasifica y expande los ~26 puntos sustantivos de una respuesta recibida sobre arquitectura de infraestructura para music-platform (separación catálogo/comunidad, ingestión de MusicBrainz, cover art, búsqueda, colas, feeds, etc.). El objetivo es decidir qué se documenta e implementa ahora, qué se aclara antes de decidir, qué se difiere y qué se descarta — siguiendo la metodología documentation-first del proyecto.

**Supuesto de partida a cuestionar:** la respuesta original está escrita para una plataforma social genérica (posts, likes, follows, feeds masivos). Music-platform es cataloging/rating estilo Letterboxd/RYM. No está confirmado que "feed" o "follows a gran escala" sean parte del dominio de producto tal como está en `product-philosophy.md`. Varios puntos del balde C y D dependen de esta pregunta de fondo.

---

## A. Implementar ahora

Relevante para Fase 4 en curso, o barato de decidir ahora / costoso de corregir después.

### A.1 — ~~Namespacing de esquema (`catalog.*`, `community.*`, `users.*`)~~ **Movido al balde C (diferido)**

**Estado: ⏳ Diferido a balde C.** El costo de migrar ahora es comparable al de no hacerlo — ver C.10. 

### A.2 — Idempotencia + `external_id` (MusicBrainz GID) como clave de reconciliación

~~**De qué se trata:** garantizar que procesar dos veces el mismo evento/registro de MusicBrainz produzca el mismo resultado que procesarlo una vez, usando el UUID de MusicBrainz como clave de reconciliación en vez de depender de IDs internos.~~

**Estado: ✅ Resuelto — ADR 0011.** Las tres reglas de idempotencia ya están documentadas y funcionando: `ON CONFLICT` como mecanismo general (no locks), advisory lock solo para reconciliación destructiva, `DO UPDATE` vs `DO NOTHING` según semántica. La clave de reconciliación es `mbid UUID UNIQUE` en todas las entidades de catálogo. El riesgo de dogpile bajo concurrencia se acepta por ahora (riesgo #10 en `04-risks.md`).

### A.3 — `musicbrainz_gid` (UUID, UNIQUE) junto a ID interno BIGINT

~~**De qué se trata:** cada entidad del catálogo (artist, release, recording, etc.) mantiene tanto un ID interno autogenerado como el GID externo de MusicBrainz, indexado como único.~~

**Estado: ✅ Resuelto — esquema existente.** Todas las entidades de catálogo ya usan `mbid UUID UNIQUE` como columna de reconciliación (`artist.mbid`, `release_group.mbid`, `release.mbid`, `recording.mbid`). Los IDs internos son `UUID` (no BIGINT, ver ADR 0003). No hay acción pendiente.

### A.4 — ~~BIGINT para IDs internos en entidades comunitarias de alto crecimiento~~ **✅ No aplica — UUID de base**

**Estado: ✅ No aplica.** El proyecto nunca usó INT/INT4 como PK: las 18 tablas (incluidas `rating`, `comment`, `user_follow`, `listen_entry`, `favorite`, `user_list_item`) usan `UUID ... DEFAULT gen_random_uuid()` desde la migración fundacional 0000 (las adicionales en 0005/0007/0008/0009 siguieron el mismo patrón). No hay INT32 que migrar a BIGINT. La decisión de tipo de PK ya está tomada y centralizada: ADR 0003 eligió `UUID` (con `BIGSERIAL` descartado) y `conventions.md:12` la norma como regla general para todas las entidades. El límite de 2.147B de INT no aplica a UUID (128-bit).

### A.5 — ~~Agregados derivados de rating~~ **Movido al balde C (diferido)**

**Estado: ⏳ Diferido a balde C — ver Riesgo #11 en `04-risks.md`.** No existe columna materializada (ni trigger que la mantenga): el promedio se calcula en vivo (`social.ts:37-39`) y los índices `idx_rating_*` (`drizzle/0000_initial.sql:222-224`) lo convierten en un index scan por entidad, no un seq scan. Como no hay estado derivado, el borrado físico de ADR 0009 no tiene nada que desincronizar (no-riesgo). Se materializa solo si aparece señal real (p95 de latencia en páginas de entidad o volumen de ratings por entidad superando un umbral); cuando ocurra, la sincronización debe usar triggers de Postgres (argumento estructural de ADR 0009), no lógica de aplicación.

### A.6 — Marco conceptual: Source of Truth / Derived Data / Ephemeral Data

**Estado: ✅ Resuelto — ver `data-classification.md`.** La taxonomía quedó documentada como documento standalone en `02-architecture`, con cuatro categorías: **fuente de verdad propia** (irreproducible), **espejo reconstruible de fuente externa** (regenerable desde MusicBrainz a costo de rate limit), **derivada / computable** (recalculable), y **efímera** (reservada, sin ocupantes hoy — Redis diferido en C.3, `session` es propia vía ADR 0008). La clasificación se definió por *perdibilidad/reconstruibilidad*, no por origen — lo que corrige la premisa del espejo original que trataba el catálogo de MusicBrainz como fuente de verdad al mismo nivel que los datos propios de usuario (el catálogo es reconstruible con costo, no irreemplazable). Complementa ADR 0011 (que clasifica por origen solo para ingestión) sin duplicarlo. Marca la pauta para backups (prioridad: propia > efímera > espejo > derivada).

### A.7 — Backups con PITR (Point-in-Time Recovery) y prueba real de restore

**Estado: ✅ Resuelto (backup + prueba de restore) — ver `06-operations/backup-restore.md`.** Se implementó backup nocturno automático de la BD principal (`music_platform`) y de la scratch (`music_platform_scratch`, Efímera, por conveniencia) vía `scripts/backup-db.ts` + tarea agendada de Windows diaria + retención de 7 dumps por BD. **Se hizo una prueba de restore real** (requisito central de A.7) el 2026-08-31: dump restaurado a `music_platform_restore_test` en **~782 ms**, con conteos idénticos al vivo (427 artistas, 2184 release_groups, 1 app_user, 1 rating), 5 triggers no internos y 12 migraciones. La política queda **probada**, no solo configurada.

**Alcance honesto:** esto es backup nocturno, **no PITR**. El PITR requiere WAL archiving, que no está activo; la ventana de pérdida posible es de hasta ~1 día. Se difiere por el criterio "deferred by default" mientras la instancia es puramente local con datos de prueba; el runbook documenta el **trigger de criticidad** (cuándo pasa a staging compartido/producción y se debe migrar a un proveedor gestionado con PITR por defecto).

**De qué se trata:** no basta con tener backups automáticos — hay que medir y probar cuánto tarda una restauración real y confirmar que funciona.
**Por qué ahora:** es una práctica operativa de bajo costo de establecer temprano y catastrófica de omitir. No depende de volumen de datos ni de fase del proyecto — aplica desde el primer dato real en producción.
**Acción sugerida (original):** confirmar si ya existe backup automático configurado en el entorno actual; si no, es de las acciones más urgentes de todo este checklist por su asimetría costo/impacto. → **Hecho** (ver resolución arriba); reiterar la prueba de restore cuando cambie el esquema o aparezcan datos reales.

### A.8 — Regla de propiedad de datos: MusicBrainz vs. comunidad

**Estado: ✅ Garantizado por construcción hoy — diferido como consecuencia del futuro sistema de roles/permisos.** Verificado en el código: las rutas de entidad de catálogo (`catalog/search`, `catalog/artist/[id]`, `catalog/release-group/[id]`, `catalog/recording/[id]`, `catalog/release-group/[id]/cover`) son **solo `GET`** — no existe ningún endpoint de mutación que escriba sobre `artist`/`release_group`/`recording`. Las únicas escrituras bajo `/api/catalog/*` son comunidad target-scoped (`[target]/[id]/ratings`, `[target]/[id]/comments`), y los campos de catálogo solo se escriben vía ingesta bajo demanda desde MusicBrainz (`ingest-*`, ADR 0011) y el self-heal de carátula. `app_user` no tiene columna de rol (`schema.ts:26-43`): todos los usuarios autenticados tienen exactamente los mismos permisos. **Consecuencia:** la regla se cumple por *ausencia de superficie de edición*, no por una decisión de permisos explícita. La decisión explícita pertenece al sistema de roles/permisos anotado como abierto en `product-philosophy.md:84,108` (cuyo único ocupante previsto son las listas editoriales, §6.3); escribir una regla parcial hoy generaría vocabulario a reconciliar con ese diseño mayor. Revisitar cuando se diseñe ese sistema.

**De qué se trata:** establecer explícitamente que los campos que vienen de MusicBrainz (`artist.name`, `release.date`, etc.) no son editables directamente por usuarios; los usuarios solo pueden generar contenido en el espacio "comunidad" (rating, review, tag, favorito) que se combina con los datos del catálogo para renderizar una página.
**Por qué ahora:** se conecta directamente con el ítem ya identificado en el horizonte del proyecto: "roles/permissions system for official platform content in the lists feature". Es la misma pregunta de fondo (¿quién puede modificar qué) aplicada al catálogo en general, no solo a listas.
**Conexión con lo existente:** relacionado con la separación catalog/community de A.1, y con el trabajo pendiente de roles/permisos.
**Acción sugerida (original):** documentar como principio en `product-philosophy.md` o en una ADR de modelo de datos; evita conflictos futuros durante sincronizaciones de MusicBrainz si un usuario "corrigió" un campo que en realidad pertenece al catálogo externo. → **No se hace hoy deliberadamente** (ver resolución arriba): el diseño de permisos mayor debe preceder.

### A.9 — Postura de eventual consistency

**Estado: ⏳ Diferido — sin objeto hoy.** La eventual consistency no tiene componente que la requiera: no existe ningún elemento asíncrono (colas C.5, eventos C.6, search index C.2 — todos diferidos) y toda la arquitectura es síncrona dentro de la request HTTP (ADR 0011). La propiedad *actual* es la inversa — consistencia fuerte por construcción — y ya está documentada en piezas: la sincronía en-request de ADR 0011 y el `AVG()` en vivo del agregado de rating (Riesgo #11 / C.9). No hay invariante sin nombrar ni postura que anticipar sin un caso concreto. **Cuándo revisitar:** junto al primer componente asíncrono real (probablemente search C.2 o un feed/notificaciones), cuando exista un caso concreto contra el cual redactar la postura — como ADR de consistencia — en vez de una declaración en abstracto. Mismo criterio de "no preparar terreno" que C.9/C.10 y C.5/C.6.

**De qué se trata:** declarar explícitamente que no todo el sistema necesita estar fuertemente consistente en tiempo real (ej. una review puede tardar segundos en aparecer en búsqueda o en un feed, sin que eso sea un problema).
**Por qué ahora:** es una declaración de postura arquitectónica en docs, no requiere infraestructura nueva, pero condiciona cómo se diseñan features futuras (evita sobre-ingeniería prematura buscando consistencia fuerte innecesaria).
**Conexión con lo existente:** complementa el marco de A.6 y da justificación documentada para diferir los puntos del balde C (colas, eventos, search index) hasta que haya señal real.
**Acción sugerida (original):** una o dos frases en `02-architecture`, más como principio rector que como ADR formal. → **No se hace hoy** (ver resolución arriba): diferido hasta que exista el primer componente asíncrono real.

---

## B. Aclarar primero

El plan de acción depende de una pregunta sobre el estado real de la ingestión que no está resuelta.

### B.1 — Pipeline completo Downloader → Raw/Staging → Parser → Validation → Bulk Loader

~~**La ambigüedad:** el bug ya diagnosticado (undici stale socket) es sobre **llamadas a la API de MusicBrainz en vivo** (probablemente on-demand, cuando un usuario busca o visualiza algo), no necesariamente sobre un proceso de sincronización masiva tipo mirror/dump completo del catálogo.~~

**Estado: ✅ Resuelto — el patrón real es "cacheo bajo demanda".** music-platform consulta la API de MusicBrainz en tiempo real por cada request de usuario y cachea el resultado en Postgres (`ingest-artist.ts`, `ingest-discography.ts`, `ingest-release.ts`). No hay mirror/dump ni pipeline de bulk ingestion. Toda la propuesta de pipeline Downloader → Staging → Bulk Loader descarta por proposer una arquitectura para un problema que la app actualmente no tiene.

### B.2 — Bulk load vía `COPY` en vez de `INSERT` por fila

**La ambigüedad:** depende enteramente de la respuesta a B.1. Si no hay bulk ingestion, este punto no aplica todavía.
**Acción sugerida:** resolver junto con B.1.

### B.3 — Monitoreo desde el principio (sync lag, connections, cache hit ratio, etc.)

**Estado: ✅ Resuelto como checklist de salida (no se instrumenta hoy).** Los tres únicos triggers que B.3 alimenta — dogpile de MusicBrainz (Riesgo #10), costo del agregado de rating (Riesgo #11) y fragmentación de PK por UUID v4 (Riesgo #12 / C.11) — son triggers de **concurrencia real**, y hoy esa concurrencia no existe: no hay staging ni entorno compartido desplegado (todo vive en la instancia local `localhost:5433` de A.7, un solo proceso y un solo usuario). Por el criterio "deferred by default" (igual que A.9/C.9/C.10), **no se instrumenta observabilidad ahora** — sería medir algo que no puede ocurrir todavía. En cambio, B.3 queda como **checklist de salida**: el conjunto mínimo de métricas, acotado estrictamente a hacer medibles esos tres triggers, que debe instrumentarse **antes del primer despliegue compartido** (staging o producción).

**Observabilidad actual (inventario):** mínima y no apta para producción — solo `console.error`/`console.log` esporádicos; el único "error tracking" es `with-error-handling.ts:23` (imprime el error no controlado en consola). Sin Sentry, sin APM, sin OTel, sin logger. No es un trabajo a cerrar hoy, pero es el punto de partida desde el que se construye el checklist de salida.

**Checklist de métricas mínimas antes del primer despliegue compartido** (acotado a los tres triggers; no es observabilidad general):

| Trigger | Métrica mínima para medirlo |
|---|---|
| Riesgo #10 — dogpile MusicBrainz | Profundidad de cola sostenida en la cola serial de `client.ts`; p95 de latencia en rutas de cache-miss (búsqueda/artista/álbum en frío). |
| Riesgo #11 — agregado de rating | p95 de latencia en páginas de entidad con conteo alto de ratings; volumen de ratings por entidad. |
| Riesgo #12 / C.11 — fragmentación PK | Volumen de filas en tablas comunitarias (`rating`, `comment`, `listen_entry`); tamaño/fragmentación del índice de PK (`pg_stat_user_indexes`/`pgstattuple`). |

**Trigger general:** los tres "no aplican" hasta que exista tráfico concurrente real; activar el checklist de salida antes del primer despliegue compartido.

**La ambigüedad:** ya existe una entrada relacionada — Riesgo #10 (agotamiento del pool de conexiones de Postgres, "too many clients"), marcada como no bloqueante en la fase actual. Pero no está claro qué subconjunto de las métricas propuestas (p50/p95/p99, WAL growth, replication lag, sync lag de MusicBrainz) ya se está monitoreando versus cuáles son aspiracionales.
**Acción sugerida (original):** hacer un inventario rápido de qué observabilidad existe hoy antes de decidir qué agregar; evita documentar como "pendiente" algo que ya está resuelto, o viceversa. → **Hecho** (inventario arriba: solo consola) y resuelto como checklist de salida sin instrumentar.

---

## C. Diferir

Riesgos/necesidades reales, pero sin señal de tráfico o escala que los justifique todavía — consistente con el patrón de "deferred by default" ya establecido en el proyecto.

- **C.1 — No almacenar imágenes inicialmente / depender del CDN de Cover Art Archive.** _Nota: esto ya está resuelto en el proyecto — el local byte caching en `LazyCoverImage` está explícitamente diferido "until real traffic justifica it". Este punto de la respuesta externa simplemente confirma una decisión ya tomada._
- **C.2 — Motor de búsqueda separado** (OpenSearch / Elasticsearch / Meilisearch). Postgres con `ILIKE` o `tsvector` es suficiente hasta que haya evidencia de que la búsqueda necesita fuzzy matching o relevancia sofisticada a escala.
- **C.3 — Redis** para caché, sesiones, rate limiting. El proyecto ya usa sesiones server-side con tokens opacos (ADR 0008) sobre Postgres; introducir Redis debe resolver un problema medido, no anticipado.
- **C.4 — Particionamiento de tablas comunitarias** (`comments_2026`, etc.). Prematuro sin volumen real; decidir solo tras análisis de queries reales.
- **C.5 — Colas para desacoplar acciones comunitarias** (Kafka/RabbitMQ/SQS/Pub-Sub). Depende de que exista una razón de latencia o acoplamiento medida, no hipotética.
- **C.6 — Diseño event-driven explícito** (`ReviewCreated`, consumidores independientes). Es la consecuencia natural de C.5; mismo criterio de diferimiento.
- **C.7 — Minimizar duplicación del catálogo entre sistemas.** No aplica todavía porque no hay un segundo sistema (search index) que duplique datos del catálogo — se vuelve relevante recién si se implementa C.2.
- **C.8 — Backpressure vía colas.** Depende de que exista una cola (C.5); no es una decisión independiente.
- **C.9 — Agregados derivados de rating** (`rating_average`/`rating_sum`/`rating_count`). Ver Riesgo #11 en `04-risks.md`. No hay columna materializada hoy; el `AVG()`/`count(*)` en vivo (`social.ts:37-39`) ya es un index scan por entidad gracias a `idx_rating_*`. Diferir hasta señal real; la sincronización, cuando ocurra, vía triggers de Postgres (patrón de `trg_rating_touch`).
- **C.10 — Namespacing de esquema** (`catalog.*`, `community.*`, `users.*`). **Antes clasificado en balde A (ex-A.1); recalificado a diferido por costo real.** Las 18 tablas ya viven en el schema `public` por defecto de Postgres con datos poblados (7 de catálogo ingeridas de MusicBrainz, 8 de comunidad, 3 de auth). Drizzle nunca ha usado `pgSchema()` (sería la primera vez), las migraciones SQL crudas no usan `CREATE SCHEMA` ni calificadores, y no hay convención de prefijos de dominio. Migrar a schemas lógicos hoy implicaría: `CREATE SCHEMA` + `ALTER TABLE ... SET SCHEMA` para las 18 tablas, recalibrar FKs cross-domain (ej. `rating.user_id → app_user` cruza `community`→`users`) y los triggers (`fn_check_membership_types`, `fn_touch_updated_at`), reescribir el mirror plano en `schema.ts` envolviendo cada `pgTable` en `pgSchema()` con reorganización de imports, y duplicar todo en el SQL crudo + el mirror (ADRs/0005). Todo esto sin señal real de que haga falta separar físicamente Catalog DB / Community DB. Por el criterio "deferred by default" (igual que cover art, search index, Redis), se difiere. Si en el futuro se mantiene la separación a nivel solo de convención, se documenta en `conventions.md` para tablas nuevas, sin migrar las existentes.
- **C.11 — Fragmentación de la PK por UUID v4 aleatorio** (trade-off no documentado de ADR 0003). Ver Riesgo #12 en `04-risks.md`. Las PK internas de las tablas comunitarias de alto volumen (`rating`, `comment`, `listen_entry`) usan `gen_random_uuid()` (v4 aleatorio): a alto volumen, fragmentación del índice de PK y más I/O. ADR 0003 eligió UUID por otro eje (colisiones con MusicBrainz, pre-generación, no exponer conteo) y solo reconoció el peso del índice, no la localidad de inserción. Diferido hasta señal de volumen; las PK internas de estas tablas podrían migrar a secuencial/UUID v7 sin fricción de fuente externa (no se sincronizan con MusicBrainz).

---

## D. Descartar

No encaja con la escala actual, con el stack decidido, o con el dominio de producto tal como está documentado.

### D.1 — Feeds con estrategia fan-out (on-read / on-write / híbrido)

**Por qué se descarta:** asume una entidad "feed" que no está confirmada como parte del dominio de producto. `product-philosophy.md` enfatiza identidad y comparación de gustos, no necesariamente un timeline social tipo Twitter/X. Antes de considerar esto siquiera como diferido, habría que confirmar si "feed" es una feature real del roadmap o un supuesto importado de la respuesta genérica.
**Acción sugerida:** si en algún momento se define una feature de tipo feed, este punto se reclasifica a balde C, no se descarta el concepto por completo — pero no corresponde documentarlo como riesgo de infraestructura mientras no exista la feature.

### D.2 — Microservicios desde el día uno

**Por qué se descarta:** ya está descartado de facto por el stack actual (Next.js monolítico con App Router, Drizzle sobre una única base Postgres). No requiere una decisión nueva, solo se confirma que no aplica.

### D.3 — Kubernetes como primer paso de infraestructura

**Por qué se descarta:** mismo razonamiento que D.2 — el proyecto no ha mostrado necesidad de orquestación de contenedores; introducirlo ahora sería exactamente el tipo de complejidad prematura que el propio documento original advierte evitar.

---

## Resumen de prioridad sugerida

1. ~~**A.2 + A.3** (idempotencia + GID de MusicBrainz)~~ **✅ Resuelto** — ADR 0011 + esquema existente.
2. ~~**A.5** (agregados de rating)~~ **⏳ Diferido a balde C** — Riesgo #11 en `04-risks.md`.
3. ~~**B.1** (aclarar patrón real de ingestión)~~ **✅ Resuelto** — patrón "cacheo bajo demanda", no bulk sync.
4. ~~**A.1** (namespacing de esquema)~~ **⏳ Diferido a balde C** — C.10, costo comparable al beneficio.
5. ~~**A.4** (BIGINT para IDs internos)~~ **✅ No aplica** — todas las PK son `UUID` (ADR 0003, `conventions.md:12`); nunca hubo INT32 que migrar.
6. ~~**A.6** (marco Source of Truth / Derived / Ephemeral)~~ **✅ Resuelto** — `data-classification.md`.
7. ~~**A.7** (backups + prueba de restore)~~ **✅ Resuelto** — backup nocturno automático + prueba de restore real (782 ms) — ver `06-operations/backup-restore.md`. PITR diferido (requiere WAL archiving / proveedor gestionado cuando se dispare el trigger de criticidad).
8. ~~**A.8** (regla de propiedad MusicBrainz vs. comunidad)~~ **✅ Garantizado por construcción hoy** — catálogo solo-GET (sin endpoints de mutación sobre entidades de catálogo); sin columna de rol en `app_user`. Diferido como consecuencia del futuro sistema de roles/permisos (`product-philosophy.md:84,108`).
9. ~~**A.9** (postura de eventual consistency)~~ **⏳ Diferido a balde C** — sin componente asíncrono hoy que lo requiera; se documenta como ADR junto al primer componente asíncrono real (C.2/C.5/C.6).
10. ~~**B.3** (monitoreo)~~ **✅ Resuelto como checklist de salida** — sin observabilidad que instrumentar hoy (sin despliegue compartido); el set mínimo de métricas acotado a los tres triggers debe existir antes del primer despliegue compartido.
11. _Nota: los baldes A y B quedaron cerrados (resueltos, garantizados por construcción o diferidos). De A/B: A.2/A.3/A.4/A.6/A.7/A.8/B.1/B.3 cerrados; A.5/A.1/A.9 diferidos a balde C; trade-off del UUID aleatorio diferido (Riesgo #12 / C.11). No queda acción abierta en baldes A ni B._

Puntos 1, 3, 8, 20 y 22 de la respuesta original no se incluyen como filas propias en este checklist: son marco general ya asumido (arquitectura de destino, elección de Postgres, cover art fuera de Postgres, crecimiento por etapas, preferencia por servicios gestionados sobre Kubernetes).
