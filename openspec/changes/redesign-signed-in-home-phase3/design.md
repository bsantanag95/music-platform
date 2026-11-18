## Context

Después de `redesign-signed-in-home-phase2`, `AuthenticatedHome` es: `SignedInHero` → `YearInvitationCard` → contenedor ancho con
`RecentListensShelf` y `FeedPreview` (o la comunidad en tarjetas si no sigue a nadie) → y, todavía en la columna de 768 px,
`ResumeList`, `CommunityActivity` (filas, solo con seguidos) + `PublicLists`, `PopularComments` y `HomeReleases` (riel con
`ReleaseSwitcher`). La portada sin sesión ya tiene las piezas que faltan: `CollectionMosaic`, `AlbumRail layout="scroll"` con ★
promedio, `CommunityActivity layout="cards"`, `PopularComments`/`PublicLists variant="panel"`, `PeopleCard` y `ReleaseTimetable`.

Decisiones tomadas con el usuario (2026-11-18):

1. **«Mejor valorados» solo para cuentas sin actividad** (sin escuchas, valoraciones, comentarios ni reseñas: la misma condición
   que la variante de bienvenida de la cabecera).
2. **La actividad propia sale de la comunidad solo en Inicio**; la pestaña Comunidad de `/activity` sigue igual.

## Goals / Non-Goals

**Goals:**
- Todo el Inicio con sesión en el contenedor ancho y con `HomeSectionHeading`, como la portada.
- Una cuenta nueva ve al menos el mismo catálogo curado que un visitante sin sesión.
- «Retoma una lista» nunca propone una lista vacía.
- Sin cambios de API, esquema ni dependencias.

**Non-Goals:**
- `/activity`, `/explore` y la portada sin sesión: no cambian.
- La selección del calendario de lanzamientos (filtros, topes, vista inicial): no cambia, solo su presentación con sesión.

## Decisions

### Orden de la parte baja
Cuenta con uso: estante (con la fila de retomar lista al pie) → «De quienes sigues» → Lanzamientos → «Para seguir explorando» → «La
comunidad». Cuenta sin actividad: comunidad en el lugar del feed → «Mejor valorados» → Lanzamientos → «Para seguir explorando» → «La
comunidad» (solo paneles). Cada sección colapsa sin espacios cuando no tiene contenido. Se mantiene el texto
`noCommunityContentYet` cuando no hay ni actividad ni listas públicas.

### «Retoma una lista» como fila del estante
`getMostRecentEditedList` filtra en SQL las listas con al menos un elemento (`innerJoin` con `user_list_item`; mismo efecto que el `EXISTS` de
«Listas públicas recientes»), así que una lista vacía nunca gana por ser la más reciente. `ResumeList` gana `variant="row"`: una fila
con el mosaico 2×2, «Retoma una lista» como antetítulo, el título, `Tipo · N elementos` y «Seguir →», que `RecentListensShelf` monta
al pie del estante. Si la persona no tiene escuchas pero sí una lista con elementos, `ResumeList` va como sección propia con
`HomeSectionHeading`. *Alternativa descartada:* una columna al lado de los lanzamientos (mockup C): el horario necesita el ancho
completo para sus dos partes y la columna quedaba casi vacía.

### Lanzamientos: horario con selector
`ReleaseSwitcher` pasa a renderizar `ReleaseTimetable` en lugar de `ReleaseRail`, con el `tablist` a la derecha del
`HomeSectionHeading` y la invitación a seguir artistas debajo del horario; la lógica de vistas (abre en «De tus artistas» con ≥ 3
discos, oculta «Populares» vacía, invitación con < 3) no cambia. `HomeReleases` con `personalReleases` usa esa presentación;
`ReleaseRail` queda sin uso en Inicio y se elimina junto con sus textos de flechas si no tiene otro consumidor. El horario de la
vista personal mezcla recientes y próximos de la selección personal igual que la anónima (`splitTimetable`).

### Catálogo curado
`listFeaturedCollections` (solo con `isExploreEnabled()`) y, para cuentas sin actividad, `listTopRated` + `albumArtistNames`, con el
mismo armado que `AnonymousHome` (★ promedio, `layout="scroll"`, «Ver en Explorar»). Para no duplicar ese armado, se extrae a una
función compartida en `src/components/home/` que ambos Inicios llaman. El test que prohibía `AlbumRail`/`CollectionRail` en
`AuthenticatedHome` se reemplaza por uno que comprueba que «Mejor valorados» solo aparece sin actividad.

### La comunidad
Sección «La comunidad» como en la portada: con seguidos, `CommunityActivity layout="cards"` (7) en 2/3 y, en 1/3,
`PopularComments variant="panel"`, `PublicLists variant="panel"` y `PeopleCard`; sin seguidos (las tarjetas ya están arriba), solo
los paneles, en rejilla de dos o tres columnas. `listCommunityActivity` gana `{ excludeViewer: true }` en sus filtros
(`appUser.id <> viewerId` en cada fuente); Inicio la pide así, tanto arriba (sin seguidos) como abajo.

## Risks / Trade-offs

- [Más consultas en el render con sesión (colecciones, mejor valorados)] → Las mismas que la portada; mejor valorados solo para
  cuentas sin actividad; colecciones solo con `/explore` habilitado.
- [Excluir lo propio puede dejar la comunidad vacía en una instancia con pocos usuarios] → La sección colapsa y queda el texto de
  comunidad vacía.
- [Quitar el riel cambia la interacción conocida de lanzamientos] → Es la presentación que ya usa la portada; el selector se
  conserva.

## Migration Plan

Sin migraciones ni cambios de API. Revertir el commit basta.

## Open Questions

_Ninguna._
