## Why

La Fase 1 (`redesign-signed-in-home-phase1`) dejó la cabecera del Inicio con sesión en el sistema de la portada pública, pero debajo
sigue la columna de 768 px con dos cajas de scroll interno: «Actividad de quienes sigues» (512 px) y «Tu rastro reciente» (320 px con
838 px de contenido), que atrapan el gesto en el teléfono. La auditoría del 2026-11-17 también mostró que el rastro se llena de
eventos de poco valor («Armó una lista para completar» en 6 de 13 entradas) y que lo que la persona escuchó no se ve de un vistazo.
La composición elegida (`mockups/home-signed-in-2026-11/propuesta.html`) pone **«Lo último que escuchaste»** antes de **«De quienes
sigues»**, este último en tarjetas. Es la Fase 2 de tres.

## What Changes

- El cuerpo del Inicio con sesión, hasta los bloques de descubrimiento, pasa al contenedor ancho (`max-w-[88rem]`) con
  `HomeSectionHeading`, como la portada pública. Los bloques de debajo (retomar lista, comunidad, comentarios, lanzamientos) cambian
  en la Fase 3.
- **«Lo último que escuchaste»** (nuevo): estante de carátulas con los últimos objetivos **distintos** anotados como escucha (hasta
  8), cada uno con tu valoración en forma compacta si existe o, si no, el contexto de la escucha, y la fecha relativa; «Ver diario».
  Riel horizontal en móvil. Solo aparece si la persona tiene escuchas.
- **«Tu rastro reciente» se retira de Inicio** (el rastro completo sigue en el diario, en el perfil y en la pestaña «Tú» de
  `/activity`). **BREAKING** para la spec: se elimina el requisito del rastro en Inicio.
- **«De quienes sigues»** en tarjetas: las entradas con contenido (escuchas, valoraciones, reseñas, comentarios y favoritos de álbum)
  como tarjetas con carátula grande, la primera a lo ancho, hasta 7; una racha de escuchas seguidas de una misma persona va en una
  sola tarjeta. Los eventos de poco valor del mismo tramo (seguimientos, listas y listas para completar, colección, pendientes,
  favoritos de canción o artista) se resumen en **una línea por persona**. Al final, «Ver más actividad» lleva a `/me/feed`.
- **Sin scroll interno** en ningún bloque de Inicio: se retira `ScrollablePreviewList` de Inicio y el requisito de carga incremental
  con contenedor de altura fija. **BREAKING** para la spec.
- **Sin seguidos**: en lugar de la caja «Todavía no sigues a nadie», el mismo lugar muestra «Lo que se escucha en la comunidad» con la
  actividad de la comunidad en tarjetas y la invitación a buscar gente en el encabezado; el bloque de comunidad de más abajo no se
  repite.

## Capabilities

### New Capabilities

_Ninguna._

### Modified Capabilities

- `home`: orden de los bloques con sesión; nuevo requisito del estante «Lo último que escuchaste» y de la actividad de quienes sigues
  en tarjetas con resumen; se retiran «Rastro reciente del propio usuario en Inicio» y «Carga incremental en los bloques de Inicio»;
  el lugar del feed sin seguidos pasa a la comunidad en tarjetas.

## Impact

- **Componentes:** `AuthenticatedHome`, `FeedPreview` (tarjetas + resumen), `ActivityCard` (escucha, favorito de álbum y racha de
  escuchas además de valoración/comentario/reseña), nuevo `RecentListensShelf` y la selección `home-feed-cards.ts`; se eliminan de Inicio
  `RecentSelfActivity`, `OnboardingPrompt` y `ScrollablePreviewList` (y este último del código si no queda otro uso).
- **Datos:** nueva consulta `listMyRecentListens(userId, limit)` en `src/services/home/home.ts` (escuchas propias, una por objetivo,
  con la valoración propia). `listFeed` se pide con una página algo mayor para llenar 7 tarjetas. Sin cambios de esquema ni
  migraciones; `GET /api/me/recent-activity` y `GET /api/me/feed` no cambian (los siguen usando `/activity` y `/me/feed`).
- **i18n:** claves nuevas en `messages/{es,en}/home.json` y retiro de las que queden sin uso; regenerar `src/i18n/client-messages.json`.
- **Docs:** `docs/05-features/home.md` (jerarquía con sesión y notas técnicas de la carga incremental). La Ayuda no describe estos
  bloques.
- Sin dependencias nuevas.
