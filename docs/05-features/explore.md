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
| Colecciones destacadas | `user_list_featured` (listas de `@exploracion`, por `rank`) | ancla anti-arranque-en-frío; tarjetas de lista (`CollectionRail`) |
| Explorar por género | familias de géneros con álbumes (vista `release_group_effective_genre`, cambio `add-genre-taxonomy`) | tarjetas con nombre, número de álbumes y una barra de tamaño relativo (escala de raíz cuadrada) → `/explore?familia=rock`; las familias secundarias detrás de "N familias más" (`<details>`, sin JS) (`FamilyGrid`) |
| Novedades | `release_group` studio/single_ep por `first_release_year` desc | riel horizontal |
| Explorar por década | `first_release_year` agrupado por década | histograma del catálogo: una columna por década en orden cronológico, altura proporcional a sus álbumes, cada columna → `/explore?decada=1990`; en móvil, barras horizontales de la más reciente a la más antigua (`DecadeHistogram`) |
| Mejor valorados | `rating` agregado por álbum | riel horizontal; ver umbrales abajo |
| Más reseñados | `review` contado por álbum | riel horizontal; ver umbrales abajo |

Cada sección lleva bajo el título una línea que dice qué reúne o con qué regla (la de Mejor valorados
cita `MIN_RATINGS_PER_ALBUM`). Los rieles de álbumes de la portada son **horizontales**
(`AlbumRail` con `layout="scroll"`, `RailScroller`): una fila con `scroll-snap`, flechas desde `sm`
que se apagan en cada extremo, y degradados de borde como capas aparte (una `mask-image` recortaría
el menú "…" de las tarjetas, que en el riel se abre con `positioning="fixed"`). La grilla de dos
filas (`layout="grid"`, el predeterminado) sigue en la página de género y en la Inicio anónima.

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

Idempotente. Crea la cuenta `@exploracion` y sus colecciones destacadas. **Las colecciones
que define el script hoy son semilla derivada de datos** (novedades, un disco por década) —
garantizan que el riel editorial no esté vacío en cualquier BD poblada. Reemplazá
`COLLECTIONS` en `scripts/seed-discovery.ts` por picks curados de verdad (por `mbid`)
cuando tengas curaduría humana; el script salta los álbumes que no estén en el catálogo
local con un aviso.

Limpieza: `DELETE FROM app_user WHERE username = 'exploracion';` (cascade).

### Administración editorial

La superficie `/[locale]/admin` (permiso `editorial.publish`) opera **solo** sobre las listas de
`@exploracion`: lista las colecciones de la cuenta curadora y permite publicarlas como contenido
oficial (`is_official`) o retirarlas (`official_withdrawn_at`). Las listas de otros usuarios no
aparecen en esa consola y rechazan la publicación oficial. La "destacada" del riel editorial
(`user_list_featured`) es independiente de la marca oficial.

## No incluido en Fase 1

Feed de reseñas, personalización/afinidad, pestañas no-álbum, UI de administración de
curaduría, combinación de cortes (década + familia a la vez), "seguir artista".
