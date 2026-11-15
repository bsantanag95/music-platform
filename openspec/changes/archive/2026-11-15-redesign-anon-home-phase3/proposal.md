## Why

Tras las Fases 1 y 2 (`redesign-anon-home-phase1`, `redesign-anon-home-phase2`), la portada sin sesión tiene hero y cuerpo a todo el ancho,
pero sus tres últimos bloques siguen como en la auditoría del 2026-11-14: los lanzamientos son un riel de 768 px con flechas encima de las
carátulas y tarjetas cortadas en los bordes; «Qué puedes hacer» es un carrusel que, a 1440 px, deja a la vista 3 de 9 funciones y explica el
doble puntaje solo con texto; y el cierre es una caja pequeña con un único botón. Es la Fase 3 y última de la dirección «C · Disquería», con
el préstamo de la propuesta A (lanzamientos como horario).

## What Changes

- **Lanzamientos como horario** (solo sin sesión): «Recientes» y «Próximos» lado a lado, una fila por disco con fecha, miniatura, título,
  artista y estado, seis por parte y el resto a un clic en la misma página. Misma selección, mismos filtros. El Inicio con sesión conserva su
  riel con el selector.
- **«Qué puedes hacer» sin carrusel:** tres demostraciones fijas (diario con contexto de escucha, doble puntaje, colección física con sus
  atributos) y las otras seis funciones en una lista con icono, título y una línea. Se elimina `FeatureCarousel`.
- **Cierre en panel** con el mosaico de carátulas de fondo, título, una línea y dos acciones: «Crear cuenta» (directo a `/auth/register`) y
  «Explorar el catálogo» (`/explore`, solo si el descubrimiento está habilitado).

### Goals

- Que todas las funciones y el doble puntaje se vean sin interacción.
- Lanzamientos legibles y densos, sin controles encima del contenido.
- Un final de página con peso y dos salidas claras.

### Non-Goals

- Cambiar la selección del calendario, sus filtros o el riel del Inicio con sesión.
- El pie global (su alto en móvil queda anotado como pendiente aparte).
- Tipografías (siguen las actuales).

## Capabilities

### New Capabilities

_(ninguna)_

### Modified Capabilities

- `home`: «carrusel de funcionalidades» pasa a «bloque de funcionalidades» en el requisito de contenido por sesión; requisitos nuevos para el
  bloque de funcionalidades y para el cierre de la portada sin sesión.
- `home-release-calendar`: requisito nuevo para presentar la selección anónima como horario en la portada sin sesión.

## Impact

`src/components/home/{AnonymousHome,HomeReleases,HowItWorks,AnonCta}.tsx`; nuevo `ReleaseTimetable.tsx` (`HowItWorks` pinta el bloque de funcionalidades y sus
demostraciones) en `src/components/home/`; se elimina `FeatureCarousel.tsx` si queda sin uso. Mensajes `messages/{es,en}/home.json`,
`client-messages.json`, tests de los componentes nuevos y de `AnonymousHome`, `docs/05-features/home.md`. Sin API, esquema ni dependencias
nuevas. La Ayuda describe funciones pero no la portada: no requiere cambios en páginas informativas.
