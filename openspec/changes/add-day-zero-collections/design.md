## Context

`automate-explore-collections` (ADR 0033) generó el riel con cuatro plantillas; `manage-explore-featured-console`
(ADR 0034) añadió la gestión humana. Medido en el scratch con datos reales, el día 0 tiene:

- **Sin comunidad:** 1 valoración, 0 reseñas. `top-rated-quarter` y `most-reviewed-month` no llegan al mínimo.
- **Carátulas escasas:** 180 de 793 `studio` tienen carátula y solo 43 se han comprobado (la resolución es
  perezosa). Las nominaciones de premios casi no tienen carátula aún (2 de 247).
- **Premios:** ~10 álbumes ganadores por ceremonia (2021–2025), con señal de calidad externa.
- **Fechas completas** en el 87 % de los `studio` (686 de 793); géneros efectivos en casi todo el catálogo.
- **Calendario:** `release_calendar_entry` guarda `anonymous_rank` (selección ordenada por popularidad de
  ListenBrainz) y el generador de Inicio ya resuelve carátulas con `findOrResolveCover` (CAA, sin la cola de
  MusicBrainz).

Hoy `CollectionTemplate` expone `periodKey(now)` y `title(now)` síncronos y `select(now)`. Eso no alcanza para
Grammy (el año depende de la última ceremonia cargada) ni para el género de la semana (el título depende de la
familia que tenga contenido).

## Goals / Non-Goals

**Goals:** seis colecciones válidas con carátula el día 0; verificación previa sin escribir; relevo automático
de la comunidad.

**Non-Goals:** otra fuente de popularidad, ingesta nueva de MusicBrainz, curaduría manual del contenido, cambiar
el tope de 6 o el modelo de datos.

## Decisions

1. **`plan(now)` asíncrono en lugar de `periodKey/title/select`.** Cada plantilla devuelve
   `{ periodKey, title, candidates } | null` (null = nada que mostrar). `candidates` son ids de release-group
   ordenados, **con holgura** (hasta `CANDIDATE_POOL`, 3 × `COLLECTION_SIZE`) para poder descartar los que no
   tengan carátula. *Alternativa descartada:* mantener las funciones síncronas y agregar una consulta previa
   para Grammy/género; duplica la lógica de elegir y puede desincronizar período y contenido.
2. **Resolución de carátulas en el generador, no en cada plantilla** (`collections/covers.ts`). Recorre los
   candidatos en orden: acepta los que ya tienen carátula, resuelve los demás con `findOrResolveCover` (4 en
   paralelo, tope `COVER_RESOLVE_BUDGET` = 40 por corrida) y se detiene al reunir `COLLECTION_SIZE`. Los que
   CAA no confirma se descartan. Si quedan menos de `MIN_ALBUMS_FOR_SECTION`, la plantilla se omite como hoy.
   Las plantillas existentes ya filtran por `coverThumbUrl` en SQL y siguen funcionando (el generador no
   resuelve nada que ya esté resuelto).
3. **Señal de calidad común** (`collections/signal.ts`), solo para ordenar y desempatar:
   1. promedio de valoraciones con ≥ `MIN_RATINGS_PER_ALBUM`;
   2. premio: ganador antes que nominado;
   3. popularidad del calendario (`anonymous_rank` menor = mejor);
   4. carátula ya resuelta;
   5. id (determinista).
   Con comunidad, el criterio 1 domina y las colecciones mejoran solas; el día 0 decide el 2–3. Se expone como
   fragmentos SQL reutilizables (`ORDER BY` con `LEFT JOIN LATERAL`/subconsultas), sin materializar nada.
4. **Las seis del día 0**, todas con `source='template'`:
   - `grammy-winners` — período `<premio>-<año>` de la **última ceremonia cargada**; ganadores con álbum
     (`release_group_id` o `anchor_release_group_id`), categorías generales primero, luego `sort_order`.
     Título "Ganadores del Grammy {año}" (nombre del premio desde el slug).
   - `anniversaries` — período `AAAA-MM`; `studio` con `first_release_date` completa en el mes actual y
     aniversario múltiplo de 5 (≥ 10). Si hay menos de 6, se amplía a cualquier aniversario ≥ 10. Orden: mayor
     aniversario redondo primero, luego la señal. Título "Cumplen años en {mes}".
   - `genre-spotlight` — período semana ISO (`AAAA-Www`); la familia es la `(semana mod n)`-ésima de las
     familias con ≥ 6 candidatos, en el orden de `GENRE_FAMILIES`; si no llega a 6 con carátula, prueba la
     siguiente (hasta n intentos). Un disco por era (década) en orden cronológico. Título "Para entrar a
     {familia}". Una lista nueva por semana: ~52 al año, públicas y accesibles por URL tras vencer.
   - `upcoming` — evergreen "Lo que viene": filas del calendario con fecha futura, enlazadas al catálogo, por
     `anonymous_rank`; si hay menos de 6, completa con los próximos del catálogo (misma condición que el riel
     de Próximos lanzamientos).
   - `new-releases` — evergreen "Novedades esenciales": lo lanzado en los últimos `NEW_RELEASE_WINDOW_DAYS`
     ordenado por la señal (popularidad del calendario primero entre los sin comunidad) y no por fecha.
   - `one-per-decade` — sin cambios de forma; el elegido de cada década pasa a salir de la señal en lugar de
     "el más antiguo".
5. **Plantillas de comunidad intactas, con peso.** `top-rated-quarter` y `most-reviewed-month` conservan su
   regla; al crearse heredan un `weight` de plantilla mayor (10) para pasar delante de las más débiles dentro del
   tope de 6. El orden editorial (consola) las sigue pudiendo cambiar. *Alternativa descartada:* subir el
   tope a 8; cambia una regla de producto sin necesidad.
6. **Mensajes y orden de rank.** Nombres de plantilla del panel en `messages/{es,en}`. `rank` de las seis:
   `new-releases` 1, `grammy-winners` 2, `genre-spotlight` 3, `anniversaries` 4, `upcoming` 5,
   `one-per-decade` 6.
7. **`--dry-run`** en `sync-explore-collections.ts`: ejecuta `plan` y la resolución de carátulas **sin escribir
   listas** (sí puede resolver carátulas, que es un efecto idempotente y deseado) e imprime por plantilla
   candidatos, con carátula, y el motivo si no llega a 6. Es la comprobación previa al lanzamiento.
8. **Reanudar** devuelve al riel la fila de la plantilla con `starts_at` más reciente, no la de un período
   calculado (`resumeTemplate` ya no usa `periodKey` síncrono).

## Risks / Trade-offs

- **Catálogo y premios sin cargar el día 0** → las plantillas se omiten y el riel queda corto; la guía de
  puesta en marcha fija el orden (géneros → premios → calendario → generación) y `--dry-run` lo comprueba.
- **Mucha resolución de carátulas en una corrida** → presupuesto de 40 y concurrencia 4; el resto se completa
  en la corrida siguiente (los resueltos ya quedan guardados).
- **`new-releases`/`upcoming` se parecen a los rieles** de Novedades y Próximos → se distinguen por el orden
  (popularidad) y viven en el riel editorial; si molesta, `upcoming` se cambia sin tocar el modelo.
- **`one-per-decade` sigue siendo débil sin comunidad** → la señal de premios solo respalda 2010–2020; mejora sola.
- **Aniversarios corto un mes** → ampliación a cualquier aniversario ≥ 10; si aun así < 6, se omite.
- **Listas semanales acumulan filas** → ~52/año por plantilla de período semanal; aceptado, vencen y no se
  muestran.

## Migration Plan

1. Desplegar el código (sin migración). Las filas existentes de `new-releases` y `one-per-decade` se siguen
   adoptando por `(template_key, period_key='evergreen')`.
2. Puesta en marcha: `load-taxonomy`/géneros, `load-awards`, `sync-release-calendar`, luego
   `sync-explore-collections --dry-run` y, si las seis llegan, `sync-explore-collections`.
3. Rollback: volver a la versión anterior deja las listas nuevas huérfanas pero inertes (no se refrescan);
   `expires_at` las saca del riel.

## Open Questions

- Ninguna bloqueante. Si `upcoming` resulta redundante con el riel de Próximos lanzamientos, el sexto cupo puede
  cambiarse (p. ej. "Directos esenciales") sin tocar el modelo.
