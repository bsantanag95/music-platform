# Roadmap — music-platform

Siete fases secuenciales. El objetivo de esta secuencia es construir primero un núcleo delgado que funcione de extremo a extremo (buscar artista → ver discografía → puntuar canción) antes de tocar cualquier función social. Todo lo demás se apila sobre ese núcleo.

## Fase 0 — Cerrar el modelo de datos

Decisiones de negocio que deben quedar resueltas antes de escribir código, porque son las que después cuestan migraciones dolorosas si se dejan para después.

**Estado: cerrada.** Ver `01-domain/business-rules.md` para el detalle de cada regla y `02-architecture/adr/` para el razonamiento detrás de cada decisión.

## Fase 1 — Elegir stack y esqueleto

Entregable: repositorio con CI corriendo, esquema de la Fase 0 migrado a Postgres, deploy mínimo funcionando.

## Fase 2 — Ingesta y cache musical

Entregable: capa de integración con MusicBrainz (metadata) y Cover Art Archive (carátulas), bajo el patrón de cacheo bajo demanda: se consulta la fuente externa solo cuando un usuario busca algo que la base propia todavía no tiene, y desde ahí se enriquece con datos propios.

**Estado: implementada.** `src/services/musicbrainz/` (cliente con rate limiting de 1 req/seg y `User-Agent` obligatorio), `src/services/catalog/` (ingesta de artista, discografía, créditos y tracklist), `src/services/cover-art.ts` (miniaturas de 250px, ver política de licencias). Los artistas credited que aún no tienen perfil propio se cachean como "stub" (`type='unknown'`, migración `0001`) y se enriquecen cuando alguien visita su perfil directamente.

## Fase 3 — Catálogo navegable

Entregable: buscar → artista → álbum → canción, sin cuentas todavía. El objetivo de esta fase es validar el modelo de datos completo contra discografías reales antes de sumar la complejidad de usuarios (el caso de prueba de referencia es Roger Waters / Pink Floyd, por la doble discografía solista y de banda).

**Estado: implementada.** El catálogo navegable, sus estados de carga/error, responsive,
accesibilidad y navegación por membresías quedaron implementados y validados.

## Fase 4 — Auth, ratings y comentarios

Entregable: autenticación local de usuarios, valoración dual (estrellas + detallada) y comentarios funcionando sobre artista, álbum y canción. Es el núcleo social base y cierra el MVP definido en el PRD. El incremento posterior de Google OAuth/OIDC también está implementado y validado manualmente. El linking explícito de cuentas y el scrobbling de servicios de streaming permanecen fuera de esta fase.

**Estado: implementada y validada.**

Junto al trabajo sobre las vistas de artista/álbum/canción, esta fase cierra también la **navegación
por membresías** diferida en la Etapa 3.6 (caso Pink Floyd / Roger Waters): el perfil de una banda
debe permitir llegar al perfil de sus integrantes, y el perfil de una persona debe mostrar su
discografía solista y la de los grupos a los que pertenece. Ver `05-features/catalog-browsing.md`
(sección 4) para el problema y la solución detallados.

## Fase 5 — Presencia, favoritos y actividad social

Entregable: la capa de presencia (registro de qué se escuchó, sin exigir opinión) y la capa de criterio ampliada sobre ella — favoritos en los tres niveles (artista, álbum, canción), listas curadas, y la función de actividad tipo "qué estás escuchando". Se deja deliberadamente como el último bloque de producto antes del lanzamiento, porque es la parte más fácil de iterar con feedback real de usuarios y la más difícil de acertar de antemano sin ese feedback.

La capa de presencia se construye en dos entregas dentro de esta misma fase, no repartidas entre fases: primero un registro manual liviano ("marcar como escuchado", sin rating), sin dependencia de ninguna integración externa; y después scrobbling automático vía las Web APIs de Spotify/Apple Music como mejora sobre lo mismo — nunca como la única puerta de entrada. Ver `05-features/listening-diary-and-ratings.md` (sección 2.1) para el razonamiento completo de esta arquitectura de dos capas (presencia vs. criterio).

## Fase 6 — PWA y beta cerrada

Entregable: manifest, service worker con shell offline, instalabilidad, y lanzamiento a un grupo pequeño y controlado antes de abrir al público. El objetivo de esta beta es encontrar los huecos del modelo de datos que solo aparecen con uso real (ediciones raras, artistas con nombres ambiguos, discografías gigantes), no crecimiento.
