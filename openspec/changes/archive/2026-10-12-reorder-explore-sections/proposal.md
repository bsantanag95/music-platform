## Why

La portada de `/explore` ya tiene 8 secciones y su orden creció por acumulación. Dos problemas: lo que más valida el
catálogo (Mejor valorados y Más reseñados, la voz de la comunidad) queda al final de una página larga, y el histograma
de Década, la entrada de menor intención, interrumpe el flujo entre Premios y los rieles de comunidad. Además, con 8
secciones no hay forma de saltar a una sin hacer scroll.

## Goals

- Ordenar las secciones por lo que la persona viene a buscar: anclas editoriales y de navegación primero, lo que
  ocurre ahora en el medio, la voz de la comunidad después y la navegación por época como cierre.
- Una fila de navegación rápida bajo el título para saltar entre secciones.

## Non-Goals

- No cambiar el contenido, las reglas de elegibilidad ni los umbrales de ninguna sección.
- No hacer la navegación rápida fija ("sticky"), ni resaltar la sección activa al hacer scroll.
- No mover Premios según la estación del año (subirlo mientras una ceremonia sea reciente): queda para cuando haya
  una ceremonia nueva en el catálogo.
- No tocar los listados filtrados (`?decada=`, `?familia=`, `?genero=`, `?novedades=`, `?proximos=`).
- Sin migraciones, sin dependencias nuevas, sin cambios de contratos REST.

## What Changes

- Nuevo orden de la portada: Colecciones destacadas → Exploración por género → Novedades → Próximos lanzamientos →
  Premios → Mejor valorados → Más reseñados → Exploración por década. Solo Década cambia de lugar (pasa del puesto 6 al
  final); las demás conservan su orden relativo.
- Nueva fila de navegación rápida ("En esta página") bajo el título, con un enlace por cada sección que se renderiza,
  hacia su ancla. Se omite si hay menos de 4 secciones visibles.
- Colecciones, Género y Década ganan un `id` de ancla (`colecciones`, `generos`, `decadas`); las demás ya lo tienen.
- Se actualizan el spec `album-discovery`, `docs/05-features/explore.md` y las cadenas es/en.

## Capabilities

### New Capabilities
<!-- ninguna -->

### Modified Capabilities
- `album-discovery`: cambia el orden de composición de `/explore` (requisito "Superficie de descubrimiento de
  álbumes") y se añade el requisito "Navegación rápida de Explorar".

## Impact

- Código: `src/app/[locale]/(catalog)/explore/page.tsx`, `src/components/discovery/{CollectionRail,FamilyGrid,
  DecadeHistogram}.tsx` (solo el `id`), nuevo `src/components/discovery/ExploreJumpNav.tsx`,
  `messages/{es,en}/catalog.json`.
- Pruebas: componente de navegación rápida.
- Docs: `docs/05-features/explore.md`; spec `album-discovery`.
