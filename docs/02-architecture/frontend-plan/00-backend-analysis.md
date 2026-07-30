# Etapa 0 — Análisis del backend disponible

**Objetivo:** determinar exactamente qué puede consumir el frontend hoy sin cambios de
backend, qué falta, y qué decisiones de arquitectura hay que cerrar antes de escribir la
primera línea de código de UI.

**Estado: 🟢 Resuelto.** Los 6 bloqueantes quedaron cerrados (ver historial abajo). El
código de frontend puede arrancar desde la Etapa 3.0 de `02-implementation-plan.md`.

## Qué existe hoy (resumen — detalle completo en `docs/04-api/contracts.md`)

- Ingesta bajo demanda de artista + discografía (`GET /api/catalog/search?q=`).
- Perfil de artista navegable directo por id, con auto-enriquecimiento de stubs
  (`GET /api/catalog/artist/[id]`).
- Ingesta bajo demanda de tracklist de un álbum, con créditos (`feat.`) por canción
  (`GET /api/catalog/release-group/[id]`).
- Esquema de datos completo y estable (`drizzle/0000_initial.sql` a `0002_artist_discography_synced_at.sql`).
- Convención de errores con `code` machine-readable en las tres rutas (`docs/04-api/errors.md`).
- Reglas de negocio de catálogo (identidad de artista, canción vs. remaster, ediciones)
  ya resueltas y probadas contra un caso real (Pink Floyd / Roger Waters,
  `scripts/smoke-test-ingestion.ts`, `scripts/smoke-test-new-endpoints.ts`).

## Vistas necesarias (Fase 3) vs. lo disponible

| Vista de frontend | Endpoint requerido | Estado | ¿Bloqueante? |
|---|---|---|---|
| Buscar artista por nombre | `GET /api/catalog/search?q=` | ✅ Existe | No |
| Perfil de artista (navegación directa por id) | `GET /api/catalog/artist/[id]` | ✅ Existe | No |
| Discografía del artista (lista de álbumes) | incluido en `search`/`artist/[id]` | 🟡 Existe, sin carátula ni año — resuelto con carga progresiva (ver abajo) | No |
| Detalle de álbum + tracklist | `GET /api/catalog/release-group/[id]` | ✅ Existe | No |
| Créditos (`feat.`) en el tracklist | `credits` por track en `release-group/[id]` | ✅ Existe | No |
| Detalle de canción | no expuesto | ❌ Diferido a Fase 4 (Camino A confirmado) | No, es alcance intencionalmente fuera de Fase 3 |
| Login / sesión | — | Fase 4, fuera de alcance | No aplica acá |
| Valorar / comentar | — | Fase 4, fuera de alcance | No aplica acá |

## Bloqueantes — historial de resolución

1. ~~**REST vs. tRPC.**~~ **✅ Resuelto** — `architecture.md` corregido para reflejar REST
   (era la inconsistencia real: documentaba tRPC sobre código que ya era REST). Ver
   ADR 0006.
2. ~~**¿Quién resuelve las brechas de backend?**~~ **✅ Resuelto** — Claude las implementó
   directamente: `getArtistById` (con enriquecimiento de stub por id) +
   `GET /api/catalog/artist/[id]`, y créditos por canción en `release-group/[id]` vía join
   con `credit`+`artist`. Validado con `scripts/smoke-test-new-endpoints.ts` contra
   Postgres real.
3. ~~**Carátula en la grilla de discografía.**~~ **✅ Resuelto — Opción C** (carga
   progresiva/lazy desde el frontend). Sin cambios de backend: cada `AlbumCard` de la
   Etapa 3.2 dispara su propia consulta a `release-group/[id]`, que ya expone `cover`.
4. ~~**Convención de errores.**~~ **✅ Resuelto** — `docs/04-api/errors.md` aprobado e
   implementado: las tres rutas (`search`, `artist/[id]`, `release-group/[id]`) devuelven
   `code` (`VALIDATION_ERROR`, `ARTIST_NOT_FOUND`, `ALBUM_NOT_FOUND`, `NO_EDITIONS_FOUND`).
5. ~~**Alcance de la vista de canción.**~~ **✅ Resuelto — Camino A.** La Fase 3 cierra en
   el tracklist del álbum; la página de canción se construye en Fase 4 junto con el
   formulario de valoración, para no reescribirla dos veces. Anotado también en
   `docs/00-product/roadmap.md`.
6. **Librería de fetching/estado de datos remotos.** Sin objeción — se acepta TanStack
   Query tal como propone `01-frontend-architecture.md` (elección técnica estándar de bajo
   riesgo, no requería la misma confirmación explícita que los puntos 1-5).

## Decisión resuelta: carátula en la grilla de discografía (contexto, para no perder el razonamiento)

La respuesta de `search`/`artist/[id]` no trae carátulas, porque `findOrIngestDiscography`
solo ingiere `release_group` (el álbum como concepto), no `release` (la edición concreta,
que es donde vive `cover_thumb_url`). Se evaluaron tres caminos:

- **A — Sin carátula en el primer corte.** Simple, pero visualmente pobre.
- **B — Ingerir la carátula de cada álbum junto con la discografía.** Descartado: con el
  rate limit de 1 req/seg, un artista con 20 álbumes tardaría 20+ segundos en su primera
  visita.
- **C — Carga progresiva (lazy) desde el frontend — elegida.** La grilla se renderiza
  rápido sin carátula, y cada `AlbumCard` dispara su propia consulta a
  `release-group/[id]` (que ya existe) para completar la carátula apenas es visible. Mismo
  patrón de "cacheo bajo demanda" que ya usa el backend, aplicado también en el frontend.
