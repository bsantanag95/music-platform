## Context

`listNewReleases(limit, condition?)` (`src/services/discovery/discovery.ts`) la usan dos consumidores: la portada de
`/explore` (vía `getExplorePage`) y el riel "Novedades" de la página de género (`getGenreNewReleases`, que pasa
`albumInGenreTree`). Hoy filtra `first_release_year IS NOT NULL` y categoría `studio`/`single_ep`, ordena por año
descendente y `created_at` descendente.

`release_group.first_release_date` (`DATE`) solo se puebla con precisión diaria; `first_release_year` admite años
sueltos (`sql-model.md`). El sync del calendario de Inicio ya vincula al catálogo, como stub con
`first_release_date` y carátula resuelta, todo lo que muestra.

## Goals / Non-Goals

**Goals**
- Novedades de Explorar = lanzados en los últimos 90 días, fecha completa, con carátula, orden por fecha real.
- Omisión del riel bajo `MIN_ALBUMS_FOR_SECTION`.

**Non-Goals**
- Riel de género, calendario de Inicio, esquema, contratos REST, personalización.

## Decisions

1. **Fuente única: `release_group`.** No se lee `release_calendar_entry`. Alternativa descartada: unir ambas
   tablas; exigiría deduplicar, acopla Explorar a una tabla que el sync reemplaza por ventana e incluye
   lanzamientos futuros y personalizados que Novedades no quiere. A medida que crece el catálogo (visitas y sync)
   el riel se llena solo.

2. **Ventana por constante.** `NEW_RELEASE_WINDOW_DAYS = 90` en `constants.ts`, ajustable sin migración como los
   demás umbrales. Filtro `first_release_date BETWEEN current_date - 90 AND current_date`; la cota superior
   excluye anunciados. `first_release_date` nulo (solo año o mes conocidos) queda fuera: no se puede ubicar en la
   ventana y nunca se inventa mes ni día.
   - La fecha de corte se calcula en SQL (`current_date - make_interval(days => $n)`), no con un `Date` de JS
     (ver memoria sobre parámetros `Date` en SQL crudo).

3. **Orden determinista.** `first_release_date desc, id asc`. Se abandona `created_at` como desempate: no
   representa el lanzamiento.

4. **Carátula obligatoria.** `cover_thumb_url IS NOT NULL` en la consulta, coherente con el calendario de Inicio:
   un riel de portadas con huecos grises se ve roto y no aporta descubrimiento.

5. **Dos funciones, no un flag.** `listNewReleases()` queda para Explorar con la ventana; el riel de género pasa
   a `listRecentByYear(limit, condition)` (la lógica actual, renombrada) y `getGenreNewReleases` la usa. Alternativa
   descartada: un parámetro opcional `window` en una sola función; mezcla dos semánticas bajo un nombre y hace
   fácil que género herede la ventana por accidente. Se mantiene el comportamiento del riel de género y su
   "Ver todo →" (`orden=recientes`).

6. **Omisión bajo umbral.** Como Mejor valorados: se consulta `max(limit, MIN_ALBUMS_FOR_SECTION)` filas y si
   hay menos de `MIN_ALBUMS_FOR_SECTION` se devuelve `[]`; `AlbumRail` ya omite el riel vacío. Esto cumple el
   escenario existente "Sección sin contenido se omite".

## Risks / Trade-offs

- [El catálogo se llena bajo demanda y el calendario trae sobre todo lo popular, así que el riel puede quedar
  oculto] → Es el comportamiento esperado de la omisión grácil; si molesta, subir la constante a 180 días.
- [Los "Novedades" de género y de Explorar dejan de compartir definición] → Documentado como non-goal y en
  `explore.md`/`genres.md`; unificar es un cambio posterior si se decide.
- [Fecha de corte según la zona horaria del servidor/BD] → `current_date` de Postgres; el desfase de ±1 día en
  el borde de la ventana es irrelevante para un riel editorial.

## Migration Plan

Sin migraciones ni datos que rellenar. Rollback: revertir el commit.

## Open Questions

Ninguna.
