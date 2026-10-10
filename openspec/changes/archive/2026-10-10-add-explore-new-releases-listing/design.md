## Context

`add-explore-upcoming-releases` dejó el patrón: riel con `seeAll` → corte `?proximos=1` en `explore/page.tsx` →
`FilteredAlbumList` con `hideSort` y `dateLabels`, servicio con una condición compartida (`upcomingCondition()`)
y una consulta propia para el listado. `redefine-explore-new-releases` definió la condición de Novedades dentro
de `listNewReleases`. Este cambio replica el patrón para el lado pasado.

## Goals / Non-Goals

**Goals**: listado completo de Novedades, fecha en la tarjeta, enlace entre ambos listados.
**Non-Goals**: cambiar la condición o ventana de Novedades, género, Inicio, esquema, REST.

## Decisions

1. **Misma ventana y condición que el riel.** El listado reutiliza `newReleasesCondition()` (categorías
   `NEW_RELEASE_CATEGORIES`, `first_release_date` entre `current_date - NEW_RELEASE_WINDOW_DAYS` y
   `current_date`, carátula obligatoria), extraída de `listNewReleases`, que pasa a usarla. Alternativa
   descartada: ventana más amplia en el listado (p. ej. 180 días): riel y listado dirían cosas distintas bajo el
   mismo nombre. Si el listado queda corto con un catálogo chico, se sube `NEW_RELEASE_WINDOW_DAYS` y ambos crecen.

2. **Orden y consulta.** `first_release_date desc, id asc`, compartido como `newReleasesOrder()`. `listNewAlbums(page,
   { category })` es una consulta propia sin `rating` (igual que `listUpcomingAlbums`), con `paginate` y
   `toAlbumPage`, validando el tipo. Sin umbral: con pocas novedades se muestran igual.

3. **URL `/explore?novedades=1`** como un corte más. Prioridad: década > familia > género > `proximos` >
   `novedades`; si llegan `proximos=1` y `novedades=1` juntos, gana `proximos`. Un valor distinto de `1` se trata
   como ausente. `orden` se descarta como en `proximos`.

4. **Cortes hermanos.** `FilteredAlbumList` ya acepta `siblings`. Ambos listados pasan dos enlaces
   ("Novedades", "Próximos lanzamientos"), con el actual marcado y conservando `tipo` (sin `page`). Se construyen
   con `exploreListHref` para mantener la convención de URL. Se omiten las etiquetas nuevas de "Otras…": el
   `label` accesible de la navegación es "Lanzamientos".

5. **Fecha en la tarjeta del riel de Novedades.** Se pasa `dateLabels` al riel (ya soportado por `AlbumRail`) con
   `releaseDateLabel()`. Cambia de año a "9 oct", coherente con Próximos y más útil en 90 días.

6. **"Ver todo →" en el riel**, con la cadena `seeAll` ya existente (`upcomingSeeAll`) renombrada a una común
   `seeAll`: una sola cadena para ambos rieles, en vez de duplicarla.

## Risks / Trade-offs

- [Catálogo chico: el listado se parece al riel] → Es el mismo conjunto hasta 12; el valor aparece cuando hay más.
  Si molesta, subir la constante de ventana.
- [Renombrar la cadena `upcomingSeeAll`] → Se actualiza su único uso en la página; es/en juntos.
- [Prioridad entre cortes con dos parámetros a la vez] → Definida y probada (gana `proximos`).

## Migration Plan

Sin migraciones. Rollback: revertir el commit.

## Open Questions

Ninguna.
