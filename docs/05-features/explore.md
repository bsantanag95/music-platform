# Descubrimiento — `/explore`

Cambio: `add-album-discovery` (Fase 0 de `redefine-content-hierarchy`).

Superficie pública centrada en álbumes que responde *"¿qué obras debería conocer?"*,
separada del feed (*"¿qué hace mi red?"*). En Fase 1 solo álbumes; artistas / canciones /
listas son pestañas futuras.

## Secciones de la portada

Se componen en `src/services/discovery/discovery.ts` (`getExplorePage`), server-render,
sin tabla materializada. Cada sección se **omite** si no tiene contenido. En orden:

| Sección | Fuente | Presentación |
|---|---|---|
| Colecciones destacadas | `user_list_featured` vigentes (listas de `@exploracion`, por `weight` desc y `rank` asc, máximo 6; generadas semanalmente por plantillas, ADR 0033) | ancla anti-arranque-en-frío; tarjeta propia (`CollectionRail`): pila de hasta 6 fundas superpuestas que se abren al pasar el mouse (`enrichLists` con `coverLimit`), título en hasta dos líneas, descripción de la lista si la tiene y número de álbumes; con más de dos colecciones, tres columnas desde `lg` con la pila arriba del texto |
| Explorar por género | familias de géneros con álbumes (vista `release_group_effective_genre`, cambio `add-genre-taxonomy`) | tarjetas con nombre, número de álbumes y una barra de tamaño relativo (escala de raíz cuadrada) → `/explore?familia=rock`; la flecha solo aparece al pasar el mouse; las familias secundarias se despliegan desde una tarjeta "N familias más" dentro de la propia grilla (botón con `aria-expanded`, "Ver menos" para plegar) (`FamilyGrid`). Las cifras de familias y décadas llevan siempre separador de miles (`useGrouping: "always"`: con la regla del español quedaban "2112" junto a "17.317") |
| Novedades | `release_group` studio/single_ep con `first_release_date` completa en los últimos `NEW_RELEASE_WINDOW_DAYS` (90) días hasta hoy, con carátula, por fecha desc | riel horizontal con la fecha ("9 oct") en cada tarjeta y "Ver todo →" a `/explore?novedades=1`; se omite con menos de `MIN_ALBUMS_FOR_SECTION` (6); sin lanzamientos futuros ni fechas parciales (cambios `redefine-explore-new-releases` y `add-explore-new-releases-listing`) |
| Próximos lanzamientos | `release_group` studio/single_ep con `first_release_date` completa posterior a hoy y hasta hoy + `UPCOMING_WINDOW_DAYS` (180), con carátula, por fecha asc (cambio `add-explore-upcoming-releases`) | riel horizontal bajo Novedades, con la fecha ("24 oct") en cada tarjeta y "Ver todo →" a `/explore?proximos=1`; se omite con menos de `MIN_ALBUMS_FOR_SECTION` (6) |
| Premios | ceremonias cargadas desde `data/awards/` (cambio `add-music-awards`, ADR 0032) | una tarjeta por cada una de las últimas 5 ceremonias, con el ganador destacado (Álbum del año en los Grammy: carátula, título y artista; `listRecentCeremonies` lo resuelve en una consulta para todas) → `/awards/<premio>/<año>` y "Ver todos" → `/awards`; se omite sin ceremonias (`AwardsExploreSection`). Ver `awards.md` |
| Explorar por década | `first_release_year` agrupado por década | histograma del catálogo: una columna por década en orden cronológico, altura proporcional a sus álbumes y la cifra pegada sobre la barra, cada columna → `/explore?decada=1990`; las décadas iniciales por debajo del 2 % de la más grande (hoy, de los 1890s a los 1940s) van en una lista compacta "Antes" a la izquierda en lugar de barras mínimas idénticas; en móvil, barras horizontales de la más reciente a la más antigua (`DecadeHistogram`) |
| Mejor valorados | `rating` agregado por álbum | riel horizontal; ver umbrales abajo |
| Más reseñados | `review` contado por álbum | riel horizontal; ver umbrales abajo |

Cada sección lleva bajo el título una línea que dice qué reúne o con qué regla (la de Mejor valorados
cita `MIN_RATINGS_PER_ALBUM`). Los rieles de álbumes de la portada son **horizontales**
(`AlbumRail` con `layout="scroll"`, `RailScroller`): una fila con `scroll-snap`, flechas desde `sm`
que se apagan en cada extremo, y degradados de borde como capas aparte (una `mask-image` recortaría
el menú "…" de las tarjetas, que en el riel se abre con `positioning="fixed"`). La grilla de dos
filas (`layout="grid"`, el predeterminado) sigue en la página de género y en la Inicio anónima.

Las tarjetas de álbum de Explorar (rieles y listados) llevan bajo el título el **artista principal**
(primer crédito `primary`, `albumArtistNames`: una consulta para todos los álbumes de la página). Los
rieles por reglas muestran sobre la carátula la cifra que ubica al disco ahí: el promedio en Mejor
valorados ("★ 4,3") y el número de reseñas en Más reseñados ("12 reseñas"). Próximos lanzamientos (riel y
listado) muestra ahí la cuenta regresiva ("Hoy", "Mañana", "En 5 días"; `daysUntilRelease`, días de calendario UTC
como la fecha de la tarjeta). Los rieles no dibujan
barra de desplazamiento: se avanzan con las flechas o deslizando.

### Novedades y Próximos lanzamientos: rieles y listados completos

Las ventanas de Novedades (`<= hoy`) y Próximos lanzamientos (`> hoy`) no se solapan ni dejan hueco. Ambas
leen `release_group`: el sync del calendario de Inicio (ADR 0029) ya vincula al catálogo lo que muestra, así que
no se lee `release_calendar_entry`. **Qué aporta frente a Inicio**, que es el resumen: ventana de 180 días
(Inicio: 60–90), orden cronológico (Inicio: popularidad), sin tope por artista ni por familia de géneros, fecha
exacta en la tarjeta y un listado completo.

`/explore?novedades=1` lista todo lo que cumple la condición del riel de Novedades (misma ventana de
`NEW_RELEASE_WINDOW_DAYS`, para que riel y listado digan lo mismo), paginado, por fecha descendente, con filtro por
tipo y sin selector de orden ni umbral. Servicio: `listNewAlbums`, con la condición compartida con el riel
(`newReleasesCondition()`). Los dos listados se enlazan con cortes hermanos ("Novedades | Próximos
lanzamientos"), conservando el tipo. **Prioridad de los cortes en la URL:** década > familia > género >
`proximos` > `novedades`.

`/explore?proximos=1` lista todo lo elegible, paginado (`FILTERED_PAGE_SIZE`) y en orden cronológico
(`first_release_date`, `id`), con filtro por tipo (`?tipo=`) y **sin** selector de orden. No aplica el umbral de 6
del riel (con 1 o 2 futuros se muestra) y sin resultados cae al estado vacío. Tiene menor prioridad que década,
familia y género si se combinan en la URL. Servicio: `listUpcomingReleases` (riel) y `listUpcomingAlbums`
(listado), con la condición compartida `upcomingCondition()`.

### Umbrales de los rieles por reglas (`src/services/discovery/constants.ts`)

- **Elegibilidad del álbum** — `MIN_RATINGS_PER_ALBUM` (=3), `MIN_REVIEWS_PER_ALBUM` (=1):
  un álbum solo entra en el riel si supera ese conteo. Evita que un promedio alto con pocas
  señales domine.
- **Visibilidad del riel** — `MIN_ALBUMS_FOR_SECTION` (=6): el riel se muestra solo si hay
  esa cantidad de álbumes elegibles; debajo, se omite por completo.

Ajustar estos valores es editar la constante — no hay migración.

### Tarjetas de álbum

Cada tarjeta (`AlbumCard`) lleva en la esquina de la portada el menú "…" de acciones del disco
(cambio `extend-album-quick-actions`): registrar escucha, Favorito y Pendiente con su estado,
listas, calificar e ir al álbum, más las acciones que solo tenía el menú "···" anterior: "Ver en
listas", "Lo busco" y "Ya la tengo". Las marcas se piden al abrir el menú. La página pasa la
sesión a las tarjetas (antes las trataba a todas como anónimas).

## Listados filtrados

`/explore?decada=<año>`, `/explore?familia=<clave>` o `/explore?genero=<slug>` (un corte a la vez;
prioridad `decada` > `familia` > `genero`). La familia lista los álbumes con algún género efectivo de
ella; el género, los de ese género **o un subgénero** (CTE recursiva sobre "subgénero de"). Los
géneros efectivos incluyen los heredados del artista (3 primeros). Una clave o un slug desconocido
muestra el estado vacío; una década mal escrita (`?decada=abc`, `?decada=1995`) también, en lugar
de la pantalla de error. Las décadas válidas van de 1800 a 2100 (el catálogo tiene discos de los
1890s; antes el límite era 1900 y esa columna llevaba a un error). No hay endpoint dedicado.

La vista (`FilteredAlbumList`) tiene miga de pan (Inicio / Explorar / corte), un rótulo con el tipo
de corte (Década, Familia de géneros, Género) y:

- **Cortes hermanos**: las otras décadas o las otras familias, para saltar sin volver a la portada
  (conservan tipo y orden). El listado por género enlaza en su lugar a la página del género.
- **Tipo y orden** (`ExploreFilterBar`): el tipo es una fila de enlaces (`?tipo=studio|single_ep|
  compilation|live_other`, sin JS) y el orden un `<select>` (`?orden=mejor|populares|recientes|
  antiguos|az`, los mismos valores que la página de género). Contrato de URL en
  `src/services/discovery/explore-params.ts`: lectura tolerante (un valor inválido cae al
  predeterminado), solo se escriben los valores no predeterminados y cambiar tipo u orden vuelve a la
  página 1.
- **Paginación** server-side por `?page=` (anterior / "Página N" / siguiente), que conserva tipo y orden.
- Estado vacío con "Quitar filtros" si hay tipo u orden elegidos, o "Volver a Explorar" si no.

Cada género también tiene su propia página, `/genre/<slug>` (cambios `show-genres` y `redesign-genre-page`, ver
`genres.md`), con pestañas, filtros y orden. Comparte con estos listados la función `listAlbumsFiltered`
(`discovery.ts`): Explorar la llama con el tipo y el orden de la URL (sin ellos, el orden `best` de siempre).

## Flag de lanzamiento

`EXPLORE_ENABLED` (server-side, `src/lib/config/discovery.ts`):

- `EXPLORE_ENABLED=1` fuerza encendido, `=0` fuerza apagado.
- Sin la variable: encendido fuera de producción, **apagado en producción**.
- Apagado: el enlace a `/explore` no aparece en Header/Footer y la ruta redirige a Inicio.

Encender en producción cuando el seed tenga contenido suficiente.

## Contenido semilla

```
ALLOW_SMOKE_ON_REAL_DB=1 npx tsx --env-file=.env scripts/seed-discovery.ts
```

Idempotente. Crea la cuenta `@exploracion` y genera sus colecciones destacadas con las
**mismas plantillas** que `/explore` usa cada semana (ver abajo). Para regenerar solo las
colecciones, con la cuenta ya creada:

```
npx tsx --env-file=.env scripts/sync-explore-collections.ts [--template <clave>]
```

## Colecciones generadas por plantillas

Cambio `automate-explore-collections` ([ADR 0033](../02-architecture/adr/0033-colecciones-destacadas-generadas-por-plantillas.md)).
El riel no depende de un seed manual: plantillas en `src/services/discovery/collections/templates.ts`
producen listas públicas de `@exploracion` (`kind='standard'`, no oficiales), registradas en
`user_list_featured` con `source='template'`.

| Plantilla | Período | Contenido |
|---|---|---|
| `new-releases` | `evergreen` | "Novedades esenciales": studio/single_ep de los últimos `NEW_RELEASE_WINDOW_DAYS` con carátula |
| `top-rated-quarter` | trimestre (`2026-Q4`) | "Mejor valorados del N.º trimestre de AAAA": valoraciones del trimestre, ≥ `MIN_RATINGS_PER_ALBUM` |
| `one-per-decade` | `evergreen` | "Un disco por década": el studio más temprano de cada década, con carátula |
| `most-reviewed-month` | mes (`2026-10`) | "Lo más reseñado de <mes> de AAAA": reseñas visibles del mes |

- **Refresco semanal bajo demanda, sin cron.** Una visita a la portada de `/explore` programa con
  `after()` la regeneración de las plantillas cuya última corrida exitosa tiene más de
  `COLLECTION_REFRESH_DAYS` (7) días. Una corrida por plantilla a la vez (fila `running` de menos de 15
  minutos en `explore_collection_sync`, tomada bajo `pg_advisory_xact_lock`); un fallo se registra
  `failed`, conserva lo anterior y no detiene a las demás. `scripts/sync-explore-collections.ts` fuerza la
  corrida (primer llenado, o respaldo si el entorno corta tareas posteriores a la respuesta).
- **Reemplazo completo** de ítems, en el orden del selector, sin tocar `user_list` (su trigger de
  `updated_at` generaría eventos de feed). Con menos de `MIN_ALBUMS_FOR_SECTION` álbumes no se crea ni
  se modifica nada.
- **Períodos:** una lista nueva por período; al crearla, la del período anterior de la misma plantilla
  recibe `expires_at` y sale del riel (sigue pública y accesible por su URL).
- **Vigencia del riel:** `starts_at <= now()` y `expires_at` nulo o futuro; orden `weight` desc, `rank` asc,
  `starts_at` desc; tope `FEATURED_RAIL_LIMIT` (6). La sección "Destacadas" de Listas (`/lists`) usa la misma
  vigencia y orden.
- **Fuera de la consola y del feed:** las listas con `source='template'` no aparecen en `/admin` ni son
  actividad de feed (`notGeneratedCollectionCondition()`).

Limpieza: `DELETE FROM app_user WHERE username = 'exploracion';` (cascade).

### Administración editorial

La superficie `/[locale]/admin` (permiso `editorial.author` para entrar) opera **solo** sobre las listas de
`@exploracion`: lista las colecciones de la cuenta curadora y permite publicarlas como contenido
oficial (`is_official`) o retirarlas (`official_withdrawn_at`). Las listas de otros usuarios no
aparecen en esa consola y rechazan la publicación oficial. La "destacada" del riel editorial
(`user_list_featured`) es independiente de la marca oficial: una lista oficial no se destaca sola.

Desde el cambio `manage-explore-featured-console` ([ADR 0034](../02-architecture/adr/0034-consola-editorial-de-destacadas.md))
la consola tiene tres pestañas:

- **Listas:** el flujo borrador → propuesta → publicada → retirada de siempre.
- **Destacadas en Explorar:** todas las filas de `user_list_featured` (curadas y generadas), con su origen,
  vigencia y estado frente al riel (`En el riel`, `Fuera del tope`, `Programada`, `Vencida`, `Fuera del riel:
  lista retirada / oculta / no pública`). Quien tiene `editorial.publish` puede **destacar** una lista oficial
  publicada, **reordenar** (botones subir/bajar; el orden completo se envía de una vez), **programar** la
  vigencia (`desde`/`hasta`) y **quitar**. Quien solo tiene `editorial.author` la ve en lectura.
- **Generadas automáticamente:** por plantilla, estado (activa/pausada), última corrida y su error, cuándo
  vuelve a regenerarse y su colección vigente. `editorial.publish` permite **pausar** (la colección sale del
  riel y no se regenera), **reanudar** (vuelve la de su período vigente) y **regenerar ahora** (en segundo plano).

Reglas que impone el servicio, no la UI: solo se destaca una lista de `@exploracion`, de álbumes, pública,
visible, oficial y no retirada (`FEATURE_NOT_ELIGIBLE` / `FEATURE_NOT_PUBLISHED`). Una curada cuya lista se
retira, se oculta o deja de ser pública sale del riel sin perder su fila (vuelve al republicarla). Quitar una
**curada** borra su fila; quitar una **generada** la vence (para que no vuelva, se pausa la plantilla). Al
rotar el período, la lista nueva de una plantilla **hereda el peso y el rank** de la anterior, así el orden
editorial sobrevive. Cada destacar / quitar / reordenar / reprogramar queda en `editorial_action`.

## No incluido en Fase 1

Feed de reseñas, personalización/afinidad, pestañas no-álbum, UI de administración de
curaduría, combinación de cortes (década + familia a la vez), "seguir artista".
