## Context

`/explore` compone rieles por reglas (ver `redefine-explore-new-releases`: Novedades = últimos 90 días hasta
hoy). Inicio ya tiene "Próximos lanzamientos" (`listAnonymousReleases` / `listPersonalReleases`), pensado como
resumen. Los futuros llegan al catálogo desde el sync del calendario (stub de `release_group` con
`first_release_date` y carátula resuelta). `AlbumCard` muestra `año · tipo`; los listados filtrados de Explorar
usan `FilteredAlbumList` + `ExploreFilterBar` con `?tipo=&orden=&page=`.

## Goals / Non-Goals

**Goals**: una vista de futuros con más valor que Inicio (ventana amplia, cronológica, completa, con fecha).
**Non-Goals**: personalización, tocar Inicio/calendario/sync, esquema, contratos REST.

## Decisions

1. **Qué lo diferencia de Inicio.** Ventana de 180 días (Inicio: 60–90 anónimo), orden por fecha ascendente
   (Inicio: popularidad), sin tope por artista ni por familia, fecha exacta visible y listado completo
   paginado. Explorar responde "qué sale y cuándo"; Inicio, "qué es lo más destacado".

2. **Fuente única: `release_group`.** Igual que en Novedades: sin `release_calendar_entry`. Condición
   `first_release_date > current_date AND first_release_date <= current_date + 180`. `> current_date` (no `>=`)
   porque lo de hoy ya cuenta como publicado en Novedades (`<= current_date`): las ventanas no se solapan ni
   dejan hueco. Mismas categorías (`NEW_RELEASE_CATEGORIES`) y carátula obligatoria. La fecha parcial queda fuera
   (solo `first_release_date` se puebla con precisión diaria).

3. **Constante `UPCOMING_WINDOW_DAYS = 180`** en `constants.ts`, ajustable sin migración. Se eligió 180 por
   coherencia con la ventana personal de Inicio (`PERSONAL_UPCOMING_DAYS`); el feed solo trae 90, así que lo que
   pase de eso depende de lo que el catálogo ya tenga.

4. **Riel y listado comparten condición.** Una función interna `upcomingCondition()` (SQL) la usan
   `listUpcomingReleases(limit)` (riel, con umbral `MIN_ALBUMS_FOR_SECTION`) y `listUpcomingAlbums(page, {category})`
   (listado). El listado **no** reutiliza `listAlbumsFiltered`: esa función une `rating` y ordena por valoración,
   y su `ALBUM_SORTS` es compartido con la página de género. Una consulta propia, sin `rating`, con
   `first_release_date asc, id asc`, reutiliza `paginate` y `toAlbumPage`. El listado no aplica el umbral de 6
   (con 1 o 2 futuros se muestra igual); si no hay ninguno, el estado vacío existente.

5. **URL: `/explore?proximos=1`.** Nuevo corte con prioridad después de década > familia > género. Se leen `tipo`
   y `page` con `parseExploreListParams`; `orden` se ignora. Un valor distinto de `1` se trata como ausente
   (portada). `exploreListHref` no cambia: el listado pasa `baseHref="/explore?proximos=1"`.

6. **Fecha visible.** `AlbumCard` recibe `releaseDateLabel?: string`; si viene, reemplaza al año en la línea
   `año · tipo`. La etiqueta se formatea en la página con `Intl.DateTimeFormat(locale, { day, month })` (con año
   si no es el actual) a partir de `firstReleaseDate` (`YYYY-MM-DD`, interpretada en UTC para no desplazar el
   día). `AlbumRail` y `FilteredAlbumList` aceptan `dateLabels?: Record<id, string>` (mapa serializable, en vez de una función) que lo propaga.

7. **Sin selector de orden en el listado.** `ExploreFilterBar` gana `hideSort`; el orden es fijo y cronológico.
   "Quitar filtros" considera solo el tipo.

## Risks / Trade-offs

- [Casi un espejo de Inicio si el catálogo solo tiene lo del feed de 90 días] → Aun así difiere en orden,
  ausencia de recortes, fecha y listado completo; y se llena con más ingesta. Si la sección sale casi siempre
  oculta, es el comportamiento esperado de la omisión.
- [Lo anunciado puede cambiar de fecha o cancelarse] → El sync del calendario reemplaza la ventana y la
  verificación de MusicBrainz actualiza `first_release_date`; Explorar solo refleja el catálogo.
- [Dos definiciones de "futuro" (Inicio y Explorar)] → Documentado en `explore.md` y `home.md`.
- [`current_date` de Postgres] → Desfase de ±1 día irrelevante para un riel editorial.

## Migration Plan

Sin migraciones ni datos que rellenar. Rollback: revertir el commit.

## Open Questions

Ninguna.
