# Checklist de infraestructura y escalabilidad — análisis de propuesta externa

**Contexto:** Este documento clasifica y expande los ~26 puntos sustantivos de una respuesta recibida sobre arquitectura de infraestructura para music-platform (separación catálogo/comunidad, ingestión de MusicBrainz, cover art, búsqueda, colas, feeds, etc.). El objetivo es decidir qué se documenta e implementa ahora, qué se aclara antes de decidir, qué se difiere y qué se descarta — siguiendo la metodología documentation-first del proyecto.

**Supuesto de partida a cuestionar:** la respuesta original está escrita para una plataforma social genérica (posts, likes, follows, feeds masivos). Music-platform es cataloging/rating estilo Letterboxd/RYM. No está confirmado que "feed" o "follows a gran escala" sean parte del dominio de producto tal como está en `product-philosophy.md`. Varios puntos del balde C y D dependen de esta pregunta de fondo.

---

## A. Implementar ahora

Relevante para Fase 4 en curso, o barato de decidir ahora / costoso de corregir después.

### A.1 — Namespacing de esquema (`catalog.*`, `community.*`, `users.*`)

**De qué se trata:** organizar las tablas de Postgres en schemas lógicos separados desde el diseño, incluso operando sobre una única instancia física.
**Por qué ahora:** Fase 4 sigue generando tablas activamente (auth, ratings, comments). Introducir namespacing después de que existan decenas de tablas sin agrupar implica una migración de esquema no trivial, con riesgo de romper referencias y foreign keys entre modelos ya en producción.
**Conexión con lo existente:** no hay ADR que cubra la organización física de schemas todavía. Sería una decisión nueva, de bajo costo de implementación y alto payoff futuro (permite separar físicamente Catalog DB / Community DB más adelante sin rediseñar la aplicación).
**Acción sugerida:** ADR corta definiendo la convención de naming de schemas antes de que se generen más tablas de Fase 4.

### A.2 — Idempotencia + `external_id` (MusicBrainz GID) como clave de reconciliación

~~**De qué se trata:** garantizar que procesar dos veces el mismo evento/registro de MusicBrainz produzca el mismo resultado que procesarlo una vez, usando el UUID de MusicBrainz como clave de reconciliación en vez de depender de IDs internos.~~

**Estado: ✅ Resuelto — ADR 0011.** Las tres reglas de idempotencia ya están documentadas y funcionando: `ON CONFLICT` como mecanismo general (no locks), advisory lock solo para reconciliación destructiva, `DO UPDATE` vs `DO NOTHING` según semántica. La clave de reconciliación es `mbid UUID UNIQUE` en todas las entidades de catálogo. El riesgo de dogpile bajo concurrencia se acepta por ahora (riesgo #10 en `04-risks.md`).

### A.3 — `musicbrainz_gid` (UUID, UNIQUE) junto a ID interno BIGINT

~~**De qué se trata:** cada entidad del catálogo (artist, release, recording, etc.) mantiene tanto un ID interno autogenerado como el GID externo de MusicBrainz, indexado como único.~~

**Estado: ✅ Resuelto — esquema existente.** Todas las entidades de catálogo ya usan `mbid UUID UNIQUE` como columna de reconciliación (`artist.mbid`, `release_group.mbid`, `release.mbid`, `recording.mbid`). Los IDs internos son `UUID` (no BIGINT, ver ADR 0003). No hay acción pendiente.

### A.4 — BIGINT para IDs internos en entidades comunitarias de alto crecimiento

**De qué se trata:** usar BIGINT (no INT) como tipo de clave primaria interna en tablas como `rating` y `comment`, que por volumen de uso pueden acercarse al límite de INT (2.147B) con el tiempo.
**Por qué ahora:** migrar de INT a BIGINT sobre una tabla ya poblada y con foreign keys activas es una operación costosa y riesgosa (locks, reindexado, downtime potencial). Decidirlo ahora, con Fase 4 recién generando estas tablas, es prácticamente gratis.
**Conexión con lo existente:** no hay ADR específica sobre tipos de ID; podría integrarse a `conventions.md` como regla general para tablas de alto volumen esperado, no solo para rating/comment.
**Acción sugerida:** revisar el schema actual de Drizzle para `rating` y `comment` (y cualquier tabla comunitaria de Fase 4/5) y confirmar el tipo de PK antes de generar migraciones.

### A.5 — Agregados derivados de rating (`rating_sum`, `rating_count`, `rating_average`)

**De qué se trata:** en vez de calcular `AVG(rating)` en cada lectura, mantener columnas o tabla derivada actualizada por evento/transacción, tratando el agregado como dato reconstruible desde `ratings` (source of truth).
**Por qué ahora:** Fase 4 está construyendo ratings activamente. Es además el punto de mayor tensión con una decisión ya tomada: ADR 0009 elige eliminación física (no soft-delete) para `rating` precisamente para evitar bugs de "olvidar `deleted_at IS NULL`". Si un rating se borra físicamente, el mecanismo de reconciliación del agregado derivado tiene que estar definido explícitamente — de lo contrario hay una vía clara de datos huérfanos o contadores desincronizados.
**Conexión con lo existente:** cruza directo con ADR 0009. Debería resolverse en la misma ADR o en una nueva que la referencie explícitamente.
**Acción sugerida:** este es, junto con A.2, uno de los dos puntos de mayor prioridad — bloquea diseño limpio de la feature de ratings que ya está en marcha.

### A.6 — Marco conceptual: Source of Truth / Derived Data / Ephemeral Data

**De qué se trata:** clasificar explícitamente cada tipo de dato del sistema en una de tres categorías (no se puede perder / se puede reconstruir / se puede perder sin consecuencia), y usar esa clasificación para decisiones de backup, cacheo y prioridad de recuperación.
**Por qué ahora:** es una taxonomía de documentación, no infraestructura nueva — costo de adopción casi nulo, y da un lenguaje común para todas las decisiones de A.1 a A.5 y de los baldes C y D.
**Conexión con lo existente:** encaja naturalmente como sección de `04-risks.md` o como documento propio en `02-architecture`.
**Acción sugerida:** escribirlo como documento corto de referencia; después, revisar retroactivamente si las entradas de `04-risks.md` ya reflejan esta distinción.

### A.7 — Backups con PITR (Point-in-Time Recovery) y prueba real de restore

**De qué se trata:** no basta con tener backups automáticos — hay que medir y probar cuánto tarda una restauración real y confirmar que funciona.
**Por qué ahora:** es una práctica operativa de bajo costo de establecer temprano y catastrófica de omitir. No depende de volumen de datos ni de fase del proyecto — aplica desde el primer dato real en producción.
**Conexión con lo existente:** no hay mención explícita en `04-risks.md` todavía (a confirmar). Sería una entrada natural de riesgo con mitigación operativa, no arquitectónica.
**Acción sugerida:** confirmar si ya existe backup automático configurado en el entorno actual; si no, es de las acciones más urgentes de todo este checklist por su asimetría costo/impacto.

### A.8 — Regla de propiedad de datos: MusicBrainz vs. comunidad

**De qué se trata:** establecer explícitamente que los campos que vienen de MusicBrainz (`artist.name`, `release.date`, etc.) no son editables directamente por usuarios; los usuarios solo pueden generar contenido en el espacio "comunidad" (rating, review, tag, favorito) que se combina con los datos del catálogo para renderizar una página.
**Por qué ahora:** se conecta directamente con el ítem ya identificado en el horizonte del proyecto: "roles/permissions system for official platform content in the lists feature". Es la misma pregunta de fondo (¿quién puede modificar qué) aplicada al catálogo en general, no solo a listas.
**Conexión con lo existente:** relacionado con la separación catalog/community de A.1, y con el trabajo pendiente de roles/permisos.
**Acción sugerida:** documentar como principio en `product-philosophy.md` o en una ADR de modelo de datos; evita conflictos futuros durante sincronizaciones de MusicBrainz si un usuario "corrigió" un campo que en realidad pertenece al catálogo externo.

### A.9 — Postura de eventual consistency

**De qué se trata:** declarar explícitamente que no todo el sistema necesita estar fuertemente consistente en tiempo real (ej. una review puede tardar segundos en aparecer en búsqueda o en un feed, sin que eso sea un problema).
**Por qué ahora:** es una declaración de postura arquitectónica en docs, no requiere infraestructura nueva, pero condiciona cómo se diseñan features futuras (evita sobre-ingeniería prematura buscando consistencia fuerte innecesaria).
**Conexión con lo existente:** complementa el marco de A.6 y da justificación documentada para diferir los puntos del balde C (colas, eventos, search index) hasta que haya señal real.
**Acción sugerida:** una o dos frases en `02-architecture`, más como principio rector que como ADR formal.

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

**La ambigüedad:** ya existe una entrada relacionada — Riesgo #10 (agotamiento del pool de conexiones de Postgres, "too many clients"), marcada como no bloqueante en la fase actual. Pero no está claro qué subconjunto de las métricas propuestas (p50/p95/p99, WAL growth, replication lag, sync lag de MusicBrainz) ya se está monitoreando versus cuáles son aspiracionales.
**Acción sugerida:** hacer un inventario rápido de qué observabilidad existe hoy antes de decidir qué agregar; evita documentar como "pendiente" algo que ya está resuelto, o viceversa.

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
2. **A.5** (agregados de rating) — cruza con ADR 0009, y Fase 4 lo necesita ahora.
3. ~~**B.1** (aclarar patrón real de ingestión)~~ **✅ Resuelto** — patrón "cacheo bajo demanda", no bulk sync.
4. **A.1** (namespacing de esquema) — barato ahora, cada vez más caro cuanto más tablas genere Fase 4.
5. Resto del balde A, según disponibilidad.

Puntos 1, 3, 8, 20 y 22 de la respuesta original no se incluyen como filas propias en este checklist: son marco general ya asumido (arquitectura de destino, elección de Postgres, cover art fuera de Postgres, crecimiento por etapas, preferencia por servicios gestionados sobre Kubernetes).
