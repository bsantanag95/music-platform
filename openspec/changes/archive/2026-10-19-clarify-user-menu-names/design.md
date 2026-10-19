## Context

El menú de usuario sale de una sola fuente, `src/components/layout/user-menu-items.ts`, que
consumen el desplegable de escritorio y el panel móvil (`UserMenu.tsx`) y la pantalla Red de
ajustes. Hoy el grupo `library` mezcla once accesos sin títulos, con dos destinos para la
misma idea (`/me/artist-journeys` y `/me/caminos`) y el feed adentro. La barra general
(`Header.tsx`) tiene Explorar, Listas, Caminos y Actividad, así que "Listas", "Caminos" y
"Actividad" nombran una superficie pública y otra personal distinta.

Los dos listados de progreso ya existen y son autosuficientes:

- `/me/artist-journeys/page.tsx` renderiza `ArtistJourneyList` (buscador, orden, filtro, tres
  modos, menú de tarjeta).
- `/me/caminos/page.tsx` renderiza `CaminosSection` con dos pestañas en `?tab=` (`mine`,
  `tracked`) definidas en `components/camino/caminos-tabs.ts`, y adentro `MyCaminosList` o
  `TrackedCaminosList`.

Los textos viven en `messages/{es,en}/*.json` por namespace (`common`, `artistJourney`, `camino`,
`quickActions`, `catalog`, `feed`, `users`, `home`, …).

## Goals / Non-Goals

**Goals:**

- Un único destino "Progreso" con tres pestañas que reutilicen los listados actuales sin
  reescribirlos.
- Un vocabulario visible consistente en es y en, que se aplique cambiando mensajes y no lógica.
- Menú con títulos de grupo, generado desde la misma fuente de datos de hoy.

**Non-Goals:**

- Renombrar rutas, endpoints, tablas, tipos, claves de mensajes o `kind` del feed.
- Cambiar el comportamiento de los listados, del tracking o del feed.
- Reordenar o rediseñar `/activity`, ni fusionar `/caminos` en los filtros de `/lists`.

## Decisions

### D1. Unificar en la interfaz, no en el modelo

Recorrido (`artist_journey`) y Camino (`user_list` con `kind = 'custom_journey'`) siguen siendo
entidades distintas, con sus propias APIs y servicios. Solo se unifica el punto de entrada. La spec
`camino` ya descartó mezclar orígenes en un listado ordenable (semánticas de estado y acciones
distintas), y las pestañas lo respetan.
*Alternativa descartada:* un listado único con filtro por origen. Reabre exactamente la asimetría
que la spec cerró.

### D2. `/me/progress` como página nueva; las rutas viejas redirigen

`src/app/[locale]/me/progress/page.tsx` es un Server Component: `requirePageUser`, parsea `?tab=`
(`discographies` | `lists` | `following`, por defecto `discographies`), carga **solo** los datos de
la pestaña activa (`listMyArtistJourneys`, `listMyCaminos` o `listTrackedLists`, como hoy) y
renderiza el listado existente dentro de una barra de pestañas. `CaminosSection` y `caminos-tabs.ts`
se generalizan a `ProgressSection` y `progress-tabs.ts` con los tres valores. El mecanismo de
pestañas en `?tab=` es el mismo, así que no hay patrón nuevo.

`/me/artist-journeys/page.tsx` y `/me/caminos/page.tsx` pasan a ser `redirect()` de next-intl hacia
la pestaña equivalente (`mine` → `lists`, `tracked` → `following`). Las rutas de detalle no cambian.
Sus breadcrumbs y los `router.push` tras borrar (`ArtistJourneyManager`, `CaminoManager`) apuntan a
`/me/progress?tab=…`.
*Alternativa descartada:* reutilizar `/me/caminos` como hub. El nombre de la ruta es justo lo que
este cambio quita de la vista, y `/me/progress` es coherente con el resto de rutas en inglés.

### D3. El vocabulario se cambia en los mensajes, con las mismas claves

Se editan los valores de `messages/es/*.json` y `messages/en/*.json` (tabla del Requirement
"Vocabulario visible de progreso" de `progress-hub`). Las claves se conservan (`common.artistJourneys`,
`camino.newCamino`, etc.) para no tocar consumidores. Solo se agregan claves nuevas donde no hay
equivalente: `common.progress`, `common.menuGroups.music`, `common.menuGroups.social`,
`common.community`, las etiquetas y la descripción de las pestañas del hub, y la sección
"Para completar" de `/lists`. Las claves que quedan sin uso (`common.artistJourneys`,
`common.caminos` en el menú) se borran si ningún otro consumidor las lee.
*Alternativa descartada:* renombrar las claves al vocabulario nuevo. Es mucho diff mecánico sin
efecto visible, y las claves describen el concepto de dominio, que no cambia.

Elecciones de vocabulario:

- **"Completar discografía"** como acción que crea un recorrido: nombra el propósito
  (completismo) y no choca con "Seguir" (artista) ni con "Seguir mi progreso" (lista ajena).
- **"Lista para completar"** como Camino: es una lista (el usuario ya entiende listas) cuyo rasgo
  distintivo es el progreso, y comparte el verbo con "Completar discografía".
- **"Comunidad"** para `/activity`: libera "Actividad" para el feed de seguidos, que es lo que
  el usuario mira a diario.

### D4. Títulos de grupo como dato en `user-menu-items.ts`

`UserMenuGroup` pasa de `identity | library | network | tools | account` a
`identity | music | social | tools | account`. `music` absorbe `library` menos `artists` y `feed`.
`social` absorbe `network` más `artists` y `feed`. Se agrega `USER_MENU_GROUP_LABELS`:
`Partial<Record<UserMenuGroup, string>>` con la clave de mensaje del título (solo `music` y
`social`). `UserMenuList` renderiza el título como `<p>` no interactivo (sin foco), en el estilo de
rótulo pequeño (`font-data`, mayúsculas espaciadas, `text-paper-muted`). La pantalla Red de ajustes
filtra por superficie `settings`, así que sigue mostrando solo seguidores, seguidos, solicitudes y
bloqueos, sin títulos.

Los ítems `artistJourneys` y `caminos` se reemplazan por uno, `progress` → `/me/progress`. El orden
de `music` es Diario, Valoraciones, Favoritos, Pendientes, Colección física, Listas, Progreso. El de
`social` es Actividad, Artistas seguidos, Seguidores, Seguidos, Solicitudes.

### D5. Barra general: Explorar · Listas · Comunidad

Se quita el `Link` a `/caminos` de `generalLinks` y se cambia la etiqueta de `/activity` a
`common.community`. La barra pierde un enlace, lo que además da margen al ancho que motivó
`fix-header-overflow`.

### D6. "Para completar" en `/lists` reutiliza la consulta de `/caminos`

La vitrina sin filtros de `src/app/[locale]/lists/page.tsx` agrega una sección después de
"Populares", con `discoverCaminos({}, 1, 8)` y tarjetas del mismo molde que la página `/caminos`
(mosaico, título, dueño, conteo de trackeo). El "Ver todas" lleva a `/caminos`. Se carga en el mismo
`Promise.all` que las demás secciones, y cuenta para el estado vacío global (`anySection`).
*Alternativa descartada:* un filtro "Con progreso" en el modo explorar de `/lists`. Requiere tocar
`listDiscoverLists` y su contrato, y el usuario solo pidió que el descubrimiento no compitiera en la
barra.

### D7. Inicio

`components/home/QuickLinks.tsx` reemplaza los accesos a recorridos y Caminos por uno, "Progreso"
(`/me/progress`), con el ícono de recorridos. El de colección usa la etiqueta "Colección física". La
vista previa del feed ("Tu feed") pasa a "Actividad de quienes sigues".

## Risks / Trade-offs

- [Pestaña por defecto vacía: quien solo tiene Caminos aterriza en Discografías vacía] → El estado
  vacío de Discografías explica cómo empezar, y las pestañas con contenido siguen visibles al lado.
  Elegir la pestaña según los datos obligaría a cargar los tres listados en cada visita.
- ["Actividad" en el menú puede leerse como actividad propia] → El título de grupo "Social" y el
  título de la página ("Actividad de quienes sigues") lo acotan. La actividad propia sigue en
  `/activity`, pestaña "Tu actividad".
- [Tests que afirman etiquetas literales ("Mis valoraciones", "Feed", "Caminos")] → Se actualizan
  en el mismo cambio. Los tests de rol buscan por nombre accesible, así que fallan de forma visible
  y no silenciosa.
- [Enlaces externos o marcadores a `/me/artist-journeys` y `/me/caminos`] → Redirección del lado
  del servidor que conserva la pestaña.
- [Claves de mensaje con nombre viejo (`camino.newCamino` con valor "Nueva lista para completar")]
  → Deuda de legibilidad aceptada (D3). Un comentario en `camino.json` no es posible (JSON), así
  que `docs/05-features/caminos.md` documenta la correspondencia.

## Migration Plan

Sin migraciones ni cambios de API. Despliegue normal. Rollback: revertir el commit, ya que las
redirecciones no dejan estado.

## Open Questions

- ¿"Lista para completar" convence, o prefieres otro nombre para el Camino ("lista de progreso",
  "reto")? Cambiarlo después es solo editar mensajes.
- ¿La URL `/caminos` del descubrimiento debería pasar a `/lists/to-complete`? Quedó fuera para no
  tocar rutas. Sería una ruta nueva más una redirección.
