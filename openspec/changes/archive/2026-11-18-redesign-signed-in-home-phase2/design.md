## Context

Tras `redesign-signed-in-home-phase1`, el Inicio con sesión abre con `SignedInHero` a lo ancho y sigue con la columna de 768 px:
`YearInvitationCard`, `FeedPreview` (o `OnboardingPrompt` sin seguidos), `RecentSelfActivity`, `ResumeList`, comunidad + listas,
comentarios populares y lanzamientos. `FeedPreview` y `RecentSelfActivity` usan `ScrollablePreviewList`: altura fija (512 / 320 px),
scroll interno y páginas de 10 contra `/api/me/feed` y `/api/me/recent-activity`, con `FeedActivityList` (filas por peso; tiers en
`feed-entry-tier.ts`, rachas y uniones en `feed-grouping.ts`).

El plan de tres fases está en `openspec/changes/archive/2026-11-18-redesign-signed-in-home-phase1/design.md` y en
`docs/05-features/home.md`. Decisiones de la Fase 1 que aplican aquí: el estante tiene **solo escuchas** y **reemplaza** «Tu rastro
reciente». Decisiones tomadas con el usuario para esta fase (2026-11-18):

1. **Tarjetas + resumen.** Las entradas con contenido van en tarjetas; los eventos de poco valor, en una línea por persona.
2. **«Ver más actividad» lleva a `/me/feed`.** Inicio muestra un tramo fijo; la página no crece sin fin.
3. **Sin seguidos, comunidad en tarjetas** en el lugar del feed, con la invitación a buscar gente en el encabezado.

## Goals / Non-Goals

**Goals:**
- Ningún contenedor con scroll interno en Inicio.
- Ver de un vistazo lo último que la persona escuchó, sin abrir el diario.
- Que el feed de Inicio se lea como el de la portada pública (tarjetas, carátulas) y que los eventos de poco valor no lo inunden.
- Sin cambios de API, esquema ni dependencias.

**Non-Goals:**
- `/me/feed` y `/activity`: no cambian (siguen con `FeedActivityList`).
- Retomar lista, lanzamientos, colecciones, comunidad de abajo y «Mejor valorados» (Fase 3), y sacar la actividad propia de la
  comunidad (Fase 3).
- «Lo escuché» de un toque en el estante.

## Decisions

### Contenedor del cuerpo
`AuthenticatedHome` envuelve los bloques propios (estante y feed) en el mismo contenedor que el cuerpo de la portada
(`max-w-[88rem]`, `gap-16 lg:gap-24`), con `HomeSectionHeading` para cada sección (título 32–40 px, bajada y «ver todo»). Los
bloques de la Fase 3 quedan debajo, todavía en su columna, hasta esa fase.

### «Lo último que escuchaste»: `listMyRecentListens` + `RecentListensShelf`
Consulta nueva en `src/services/home/home.ts`: las escuchas propias (sin filtro de audiencia: es contenido propio) ordenadas por
`created_at` desc, **una por objetivo** (las 60 escuchas más recientes, deduplicadas por objetivo en memoria, quedándose con la más reciente), hasta
8, con título, artista acreditado, carátula (la del álbum; para una canción, la de su álbum vía las mismas expresiones SQL que usa el
feed), contexto de la escucha y la valoración propia del objetivo (`LEFT JOIN rating` por usuario y objetivo). Las escuchas de
artista entran con la imagen del artista si la hay; si no, el disco de reserva de `CoverThumb`.

`RecentListensShelf` (server) es un estante de 6–8 columnas desde `lg` y un riel con desplazamiento horizontal y `scroll-snap` por
debajo (≈42 % del ancho por carátula), como el riel de colecciones en móvil. Cada elemento: carátula enlazada a la entidad, título,
artista y una línea con tu valoración en **forma compacta** (`★ 86/100` o `★ 4,5`, `rating-display`) si existe o, si no, la etiqueta
del contexto («Primera escucha», «Repetición», «Redescubrimiento»), y la fecha relativa. No se muestra si no hay escuchas.
*Alternativa descartada:* reutilizar `listMyRecentActivity` filtrando escuchas: pagina por fuente con `pageSize + 1` y no deduplica
por objetivo; con repeticiones del mismo disco el estante saldría con huecos o duplicados.

### «De quienes sigues»: selección en `home-feed-cards.ts`
Función pura `selectHomeFeedCards(entries, limit = 7)` sobre la primera página de `listFeed` (se pide con `pageSize = 30` para tener
material tras quitar los eventos de poco valor; el feed ya respeta audiencias y bloqueos):

- **Tarjeta:** escucha (con o sin nota), valoración, reseña, comentario y favorito de **álbum**. Una **racha** —escuchas consecutivas
  de una misma persona, sin otra entrada de tarjeta entre ellas— se une en una sola tarjeta de racha («registró 4 escuchas», con un mosaico 2×2
  de hasta 4 carátulas y sus títulos). Las uniones existentes de `feed-grouping.ts` no se reutilizan: están pensadas para filas.
- **Resumen:** seguimientos de personas y de artistas, eventos de lista y de lista para completar, colección, pendientes y favoritos
  de canción o artista. Se agrupan **por persona y tipo** dentro del tramo cubierto por las tarjetas mostradas (desde la entrada más
  reciente hasta la de la última tarjeta), en el orden de su entrada más reciente: «Ana armó 6 listas para completar · empezó a
  seguir a 2 personas», con un enlace «Ver en el feed» a `/me/feed`.
- Se recorre en orden hasta llenar `limit` tarjetas; lo que queda fuera del tramo no se resume.

Presentación: rejilla de 3 columnas desde `lg` (2 en `sm`, 1 en móvil), la primera tarjeta a dos columnas, `ActivityCard`
extendida a los nuevos tipos (escucha: el contexto como etiqueta y la nota como extracto; favorito de álbum: etiqueta
«Marcó como favorito»; racha: mosaico 2×2, el número de escuchas y los títulos), la nota en forma compacta de `rating-display`. Debajo, las líneas de
resumen y el botón «Ver más actividad» (`/me/feed`). Sin entradas de tarjeta en la primera página, el bloque muestra el texto vacío
actual y el enlace a `/me/feed`. *Alternativa descartada:* cargar más en el lugar (decisión 2).

### Sin seguidos: la comunidad en el lugar del feed
Cuando `hasFollows` es falso, el lugar del feed muestra `CommunityActivity layout="cards"` (7 entradas) bajo el encabezado «Lo que se
escucha en la comunidad», con la bajada explicando que es la actividad de toda la comunidad mientras no se siga a nadie y un enlace
«Buscar gente» a `/users`; el bloque de comunidad de más abajo no se monta en ese caso (se pide una sola vez, con el límite mayor).
Si la comunidad también está vacía, queda el encabezado con la invitación. `OnboardingPrompt` se elimina.

### Retiro del scroll interno
`FeedPreview` deja de usar `ScrollablePreviewList`; `RecentSelfActivity` se elimina. Si `ScrollablePreviewList` y sus claves de
consulta (`homeFeedPreview`, `homeRecentActivity`) quedan sin uso, se eliminan; las invalidaciones de `quick-actions-changes.ts` que
las nombren se actualizan. Al registrar desde el campo de la cabecera, el diálogo ya refresca la página al cerrar, así que el estante
y «Última vez» se actualizan sin estado de cliente.

## Risks / Trade-offs

- [Una página de 30 entradas puede no llenar 7 tarjetas si los seguidos solo hacen eventos de poco valor] → Se muestran las que haya;
  el resumen cubre el resto y «Ver más actividad» lleva al feed completo.
- [Dos presentaciones del mismo feed (tarjetas en Inicio, filas en `/me/feed`)] → La selección es una función pura con pruebas, y la
  tarjeta reutiliza las piezas del feed (`RelativeDate`, `UserHoverCard`, `targetHref`, iconos de tipo).
- [Con más de 60 escuchas repetidas seguidas el estante sale con menos de 8 discos] → Lectura acotada por
  `idx_listen_entry_user_created`; un caso raro y sin pérdida de datos (el diario tiene el resto).
- [Quitar `OnboardingPrompt` pierde «Explorar catálogo»] → La búsqueda está en el Header y la Fase 3 trae colecciones y mejor
  valorados al Inicio.

## Migration Plan

Sin migraciones ni cambios de API. Revertir el commit basta.

## Open Questions

_Ninguna._
