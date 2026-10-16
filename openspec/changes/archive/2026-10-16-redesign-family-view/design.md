## Context

`/explore?familia=` reutiliza `FilteredAlbumList` (el mismo componente de décadas, géneros, novedades y próximos) con el orden
compartido `best` de `listAlbumsFiltered`: valoración agregada si el disco tiene `MIN_RATINGS_PER_ALBUM` valoraciones, luego año
descendente, luego id. Medido en scratch: 32 discos con valoraciones sobre 47.344 con género; 14 discos con fecha futura; de los
3.373 discos de estudio de Rock, 193 tienen carátula resuelta y 3.157 nunca se han intentado resolver (las tarjetas sin carátula
resuelta la piden al mostrarse con `LazyCoverImage`, así que la primera visita las ve llenarse de a poco: tras unos segundos 19 de
24 de la primera página de estudio tenían imagen). Los géneros de una familia están en `genre_family_member`: en Rock, `rock`
(5.975 discos), `hard rock` (2.295), `psychedelic rock` (2.223), `blues rock` (2.097)…

## Goals / Non-Goals

**Goals:**
- Que la primera página de una familia sea lo mejor que tenemos, no lo último que entró.
- Que de la vista de familia se pueda ir hacia dentro (géneros y su página completa) sin volver a la portada.
- Que el primer disco quede a la vista, sin dos filas de chips antes.

**Non-Goals:**
- Un ranking de popularidad real (no hay señal para eso hoy; si existe más adelante, entra en el orden).
- Cambiar décadas, novedades, próximos o la página de género más allá del orden y la cabecera compartidos.
- Resolver carátulas en bloque.

## Decisions

1. **El orden compartido `best` se rehace; no se crea otro.** Valoración (umbral) → premio (ganador antes que nominado, directo o
   como disco ancla) → `category = 'studio'` primero → carátula resuelta → año descendente → id, y antes de todo, los lanzamientos
   con fecha posterior a hoy van al final (un disco por salir pertenece a "Próximos", no a "lo mejor"). Cada término es una
   columna o una subconsulta indexada; se omite el rango del calendario de `albumSignalOrder` (es para próximos lanzamientos). Se
   deja la lista explícita en la consulta en vez de importar `albumSignalOrder`, para no arrastrar términos que no aplican. Afecta
   a todo uso de `best`: décadas, familias, géneros y la pestaña de álbumes de la página de género; "popular", "newest", "oldest" y
   "az" no cambian. La prueba de rendimiento es medir el listado de Rock (17.317 discos) antes y después. **Medido:** con el premio como
   subconsulta correlacionada por fila (`n.release_group_id = rg.id or n.anchor_release_group_id = rg.id`) el listado tardaba
   ~1,5 s contra ~0,3 s de ordenar por columnas; con **subconsultas no correlacionadas** (`rg.id in (select … union select …)`,
   que Postgres evalúa una vez como conjunto) vuelve a ~0,35–0,4 s, igual que el orden por columnas, y se conserva el premio.
2. **Se renombra "Mejor valorados" a "Destacados" en el selector de los listados** (`sortBest`). Los rieles "Mejor valorados" de la
   portada siguen llamándose así: ahí sí ordenan por valoración con umbral.
3. **"Todos" sigue siendo el filtro por defecto.** Con el orden nuevo, los discos de estudio con carátula ya salen primero sin
   cambiar la semántica de la URL (ausencia de `tipo` = todos). No se toca el valor por defecto de `tipo`.
4. **Géneros de la familia**: `listFamilyGenres(familyKey, 12)` cuenta, por género de estilo de la familia, los discos con ese género
   efectivo, y devuelve los 12 mayores (slug, nombre y conteo interno, que no se muestra: lección del cambio de tarjetas de familia).
   Cada chip enlaza a `/genre/<slug>`, la ficha completa (descripción de Wikipedia, subgéneros, artistas, listas). La consulta tarda
   ~0,4 s en frío: se guarda 6 horas en memoria por familia con el mismo patrón de `family-covers.ts`, que se extrae a un helper
   (`ttl-cache.ts`: TTL, promesa en vuelo y un error no se cachea) y lo usan los dos. El género raíz (`rock` dentro de Rock) entra
   como cualquier otro: es justo el acceso a la ficha de la familia.
5. **Sin rótulo sobre el título.** Se retira `kicker` de `FilteredAlbumList` en todos sus usos (década, familia, género, novedades,
   próximos): la miga de pan ya lo dice y el sistema de diseño no admite un eyebrow sobre el encabezado. Se eliminan los mensajes
   `kickerDecade`, `kickerFamily`, `kickerGenre` y `kickerReleases` si ya no los usa nada.
6. **Selector de familias plegado, solo en la vista de familia.** `siblings` gana la opción `collapsed`: un `<details>` nativo
   ("Otras familias") bajo la fila de géneros, cerrado por defecto, sin JavaScript. Las décadas (13 chips) conservan la fila visible.
7. **Orden de la cabecera**: título → géneros de la familia → "Otras familias" (plegado) → filtros de tipo y orden → rejilla. Sin
   texto escrito a mano.

## Risks / Trade-offs

- **Cambiar `best` mueve la pestaña de álbumes de la página de género**: es lo deseado (el mismo problema), pero cambia lo que ve
  hoy cualquiera que use ese orden.
- **Carátulas**: solo 193 de 3.373 discos de estudio de Rock tienen carátula resuelta; el orden las sube, pero tras ~8 páginas el
  listado vuelve a mostrar discos sin resolver. Mejora sola cuanto más se visite y se resuelva.
- **Costo del orden**: subconsultas por fila sobre decenas de miles de discos; se mide y, si hace falta, se recorta (decisión 1).
- **Un género raíz con el nombre de la familia** repite el nombre de la familia en el primer chip; se acepta a cambio de dar acceso
  directo a la ficha.
