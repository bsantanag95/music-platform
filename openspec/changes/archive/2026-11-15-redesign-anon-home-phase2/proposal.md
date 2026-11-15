## Why

La Fase 1 (`redesign-anon-home-phase1`) dejó un hero a todo el ancho, pero debajo el cuerpo de la portada sin sesión sigue siendo la columna
de 768 px de la auditoría del 2026-11-14: a 1440 px se usa el 53 % de la pantalla, todas las secciones llevan el mismo título de 20 px, las
colecciones quedan en 4 + 2 huérfanas en escritorio y apiladas a ancho completo en móvil (~1400 px, el 26 % de la página), la actividad de la
comunidad son filas densas idénticas y el acceso a Usuarios desaparece si no hay actividad reciente. Es la Fase 2 de tres de la dirección
«C · Disquería».

## What Changes

- **Contenedor ancho** para todo el cuerpo de la portada sin sesión (el mismo de ~1400 px y márgenes fluidos del hero) y **títulos de sección
  de 32–40 px** con una línea de descripción y su enlace «Ver …», mediante un encabezado propio de Inicio.
- **Colecciones en mosaico** (solo Inicio): una colección grande con su cuadrícula de carátulas, cuatro medianas con su abanico de fundas y una
  sexta a lo ancho; en móvil, **riel horizontal** en lugar de apilarse. Enlace a todas las colecciones.
- **Mejor valorados** como riel desplazable con el artista y el promedio de estrellas sobre la carátula (el mismo riel que ya usa `/explore`).
- **Comunidad en dos columnas** (2/3 + 1/3 desde `lg`): actividad en tarjetas con carátula, autor, estrellas y puntaje detallado, y el extracto
  del comentario o la reseña; a la derecha, comentarios populares y listas públicas en paneles y una tarjeta **«Conoce a quienes escuchan»**
  que se muestra aunque no haya actividad.
- Lanzamientos, «Qué puedes hacer» y el cierre se colocan en el contenedor ancho con el nuevo encabezado, sin cambiar su interior (Fase 3).

### Goals

- Usar el ancho de la pantalla y dar a cada sección un peso visual claro.
- Que las colecciones no alarguen la página en móvil.
- Que la comunidad se lea como reseñas de personas, no como un registro.

### Non-Goals

- `/explore`, el Inicio con sesión y sus bloques compartidos: sin cambios visibles (las variantes nuevas solo las usa la portada sin sesión).
- Lanzamientos como horario, demostraciones de funciones y cierre: **Fase 3**.
- Datos nuevos: no se agregan promedios ni consultas; se usan los que ya devuelven los servicios.
- Tipografías: siguen siendo las actuales.

## Capabilities

### New Capabilities

_(ninguna)_

### Modified Capabilities

- `home`: requisitos nuevos para la presentación del cuerpo de la portada sin sesión (colecciones en mosaico con riel en pantallas angostas,
  mejor valorados con artista y promedio, comunidad en tarjetas y paneles) y para un acceso a personas que no depende de que haya actividad.

## Impact

`src/components/home/{AnonymousHome,CommunityActivity,PublicLists,PopularComments}.tsx`; nuevos `HomeSectionHeading.tsx`,
`CollectionMosaic.tsx`, `ActivityCard.tsx` y `PeopleCard.tsx` en `src/components/home/`; reutiliza `AlbumRail` (`layout="scroll"`),
`SleeveStack`, `collectionLinkOf` y `albumArtistNames`. Mensajes `messages/{es,en}/home.json`, `client-messages.json`, tests de
`AnonymousHome`, `CommunityActivity` y de los componentes nuevos, `docs/05-features/home.md`. Sin API, esquema ni dependencias nuevas; las
páginas informativas y legales no cambian.
