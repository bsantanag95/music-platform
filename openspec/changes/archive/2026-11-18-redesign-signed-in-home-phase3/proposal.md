## Why

Tras las Fases 1 y 2, la cabecera, el estante «Lo último que escuchaste» y «De quienes sigues» del Inicio con sesión ya usan el
sistema de la portada pública, pero el resto de la página sigue como antes: «Retoma una lista» en la columna de 768 px (y puede
proponer una lista vacía), comunidad y listas públicas en filas densas, comentarios populares a lo ancho, lanzamientos en el riel con
flechas, y nada del catálogo curado (una cuenta nueva ve menos discos que un visitante sin sesión). Además, la actividad de la
comunidad muestra la actividad propia como si fuera ajena. Es la Fase 3 y última del rediseño (`mockups/home-signed-in-2026-11/propuesta.html`).

## What Changes

- **«Retoma una lista»** pasa a ser una fila al pie de «Lo último que escuchaste» (o una sección propia si no hay escuchas) y solo
  propone una lista **con al menos un elemento**; sin listas con elementos, no aparece.
- **Lanzamientos como horario** («Recientes» / «Próximos», como en la portada) con el selector **«De tus artistas | Populares»**,
  bajo `HomeSectionHeading`, en el contenedor ancho. Se conservan la selección, los topes, la vista inicial y la invitación a seguir
  artistas. El riel con flechas deja de usarse en Inicio.
- **«Para seguir explorando»**: las colecciones curadas en mosaico (`CollectionMosaic`), cuando `/explore` está habilitado.
- **«Mejor valorados»** (riel de álbumes mejor valorados por la comunidad) **solo para cuentas sin actividad**, justo después de la
  comunidad que ocupa el lugar del feed.
- **«La comunidad»** como en la portada: tarjetas de actividad (solo si la persona sigue a alguien; si no, ya están arriba) con los
  comentarios populares y las listas públicas en paneles y la tarjeta «Conoce a quienes escuchan» (`PeopleCard`).
- En Inicio, la actividad de la comunidad **excluye la actividad de la propia persona**. `/activity` no cambia.
- El cuerpo entero queda en el contenedor ancho; desaparece la columna de 768 px del Inicio con sesión.

## Capabilities

### New Capabilities

_Ninguna._

### Modified Capabilities

- `home`: orden y composición de la parte baja con sesión (colecciones y, para cuentas sin actividad, mejor valorados, que antes
  estaban vedados al Inicio con sesión); «Retomar una lista» solo con listas con elementos; la actividad de la comunidad de Inicio sin
  la actividad propia.
- `home-release-calendar`: con sesión, el selector «De tus artistas | Populares» se presenta sobre el horario en lugar del riel.

## Impact

- **Componentes:** `AuthenticatedHome`, `RecentListensShelf` (fila de retomar lista), `ResumeList`, `HomeReleases` (horario con
  selector), `ReleaseSwitcher` (cuerpo de horario) y `ReleaseRail` (sin uso en Inicio; se elimina si no queda otro uso),
  `CommunityActivity`, `PopularComments`, `PublicLists`, `PeopleCard`, `CollectionMosaic`, `AlbumRail`.
- **Datos:** `getMostRecentEditedList` descarta listas sin elementos; `listCommunityActivity` gana una opción para excluir al
  propio lector (solo la usa Inicio); `listFeaturedCollections` y `listTopRated` (ya existentes) se piden con sesión. Sin cambios de
  esquema, API ni migraciones.
- **i18n:** títulos y bajadas nuevas en `messages/{es,en}/home.json`; regenerar `src/i18n/client-messages.json`.
- **Docs:** `docs/05-features/home.md` (jerarquía con sesión, lanzamientos, cierre del plan de tres fases).
- Sin dependencias nuevas.
