## Why

`redefine-content-hierarchy` fija el **álbum como la unidad cultural central** — la obra
sobre la que gira la crítica y lo social. Pero el **landing anónimo** todavía comunica
"tracker social de música": el hero dice "registrá todo lo que escuchás / guardá favoritos
y armá listas / seguí a otros oyentes", y lo primero que ve un visitante nuevo es un muro
de carátulas decorativo + actividad de la comunidad (ratings y comentarios sueltos) +
comentarios populares. La identidad "el álbum es una obra, acá se lo valora y se lo reseña"
—la diferenciación frente a Spotify/Apple Music— no aparece en la primera impresión.

`/explore` (`add-album-discovery`) ya construyó la capa editorial de álbumes (colecciones
curadas, mejor valorados), pero vive detrás de un enlace de navegación; el landing no la
asoma.

## What Changes

- **Reencuadre del copy del hero anónimo** (`heroLine1-3`, `anonSubtagline`): de
  "registrá / guardá / seguí" a la relación consciente con la música y el álbum como obra
  —valorarlo una vez, reseñarlo cuando deja algo, volver a él, descubrir obras por
  personas—. La estructura del hero y su CTA de registro no cambian.
- **Nuevo bloque de álbumes en el landing anónimo**, inmediatamente debajo del hero,
  reutilizando componentes de `/explore`:
  - **Colecciones editoriales** (`listFeaturedCollections`) — solo cuando la superficie de
    descubrimiento está habilitada (`isExploreEnabled()`), para no enlazar a contenido que
    la ruta redirige.
  - **Mejor valorados de la comunidad** (`listTopRated`) — rail de álbumes reales; se
    muestra solo con suficientes álbumes elegibles (umbral ya existente).
  - Cada sub-bloque colapsa por su cuenta; si ninguno tiene contenido, el bloque entero
    desaparece.
- **Sin nuevo bloque en el Inicio autenticado**: ese lidera a propósito con el contenido
  propio (feed, rastro); la capa editorial de álbumes ahí queda para otra iteración.
- **Sin migración, sin endpoint nuevo**: los datos salen de servicios ya existentes
  (`@/services/discovery/discovery`), resueltos en el Server Component del Inicio.

## Capabilities

### New Capabilities

_Ninguna._

### Modified Capabilities

- `home`: la composición del Inicio sin sesión incluye ahora, debajo del hero, un bloque
  editorial de álbumes (colecciones curadas cuando el descubrimiento está habilitado, y los
  álbumes mejor valorados de la comunidad), que colapsa cuando no hay contenido. El copy de
  la propuesta de valor del hero se reencuadra hacia el álbum como obra.

## Impact

- **Modificado** `src/components/home/AnonymousHome.tsx` — resuelve
  `listFeaturedCollections` (gateado por `isExploreEnabled()`) y `listTopRated` en su
  `Promise.all`, y renderiza `<CollectionRail>` + `<AlbumRail>` debajo de `<AnonHero>`.
- **i18n** `messages/{es,en}/home.json` — `heroLine1-3` y `anonSubtagline` reescritos;
  nuevas claves `featuredAlbumsHeading`, `topRatedHeading`, `collectionItems`,
  `albumCoverLabel` (o reutilizar las de `catalog.explore`).
- **Tests** `src/components/home/AnonymousHome.test.tsx` — el bloque aparece con datos y
  colapsa sin ellos; el flag apaga las colecciones editoriales; los tests de copy del hero
  que asserten los textos viejos.
- **Docs** `docs/05-features/home.md` — el bloque editorial de álbumes del landing anónimo
  y el reencuadre del hero.
- Sin cambios en el Inicio autenticado, en `/explore`, en el esquema ni en el feed.
