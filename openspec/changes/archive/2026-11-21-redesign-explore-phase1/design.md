## Context

La portada de `/explore` (`src/app/[locale]/(catalog)/explore/page.tsx`) monta, en un `main` de `max-w-7xl`: miga de pan, `<h1>` de 30 px,
`ExploreJumpNav` (fila de píldoras, no fija por decisión de `reorder-explore-sections`, que la dejó como Non-Goal) y nueve secciones
(`CollectionRail`, `PopularNow`, dos `MosaicGrid`, tres `AlbumRail`, `AwardsExploreSection`, `HallOfFameExploreSection`), cada una con su
`SectionHeader` de 20 px. La auditoría del 2026-11-21 comparó tres direcciones (`mockups/explore-2026-11/`: A · Mapa, B · Pasillos,
C · Muro); el usuario eligió **B con el índice tipográfico de C** y decidió:

1. **Índice sin cifras.** Se mantiene la decisión de `visual-genre-families`: el número de álbumes es un artefacto de qué se ha explorado
   (catálogo bajo demanda), así que ni el índice ni la cabecera muestran conteos ni total del catálogo.
2. **Barra de pasillos fija y con la sección activa marcada**, funcionando como enlaces sin JavaScript.
3. **Índice en géneros y décadas:** géneros con 6 familias en grande y el resto en índice; décadas en línea de tiempo con carátulas en
   escritorio e índice en el teléfono.

## Plan en tres fases

| Fase | Cambio | Alcance |
| --- | --- | --- |
| 1 | `redesign-explore-phase1` (este) | Contenedor de 88rem, frase de entrada, barra de pasillos fija con sección activa, títulos de sección de 30–40 px con encabezado compartido con Inicio, desborde de Popular a 390 px y rótulos a 11 px. |
| 2 | `redesign-explore-phase2` | **Colecciones** en mosaico (una destacada y cuatro más, la variante de Inicio), **Popular** con los álbumes como top con números grandes (artistas y canciones siguen en lista), **Géneros**: las 6 primeras familias principales en grande con sus carátulas y el resto (incluidas las secundarias) en un índice tipográfico sin cifras; **Décadas**: línea de tiempo con carátulas desde 1950 más «Antes de 1950» en escritorio, índice tipográfico en el teléfono. |
| 3 | `redesign-explore-phase3` | **Lanzamientos**: Novedades y Próximos como un horario de dos columnas con la cuenta regresiva (forma del de Inicio, datos del catálogo); **Premios** en una fila de ceremonias con el destacado como texto; **Salones** como dos tarjetas compactas; **Mejor valorados** sube detrás de Popular; la navegación rápida se ajusta a las secciones nuevas. |

Cada fase se archiva, se fusiona y se publica antes de abrir la siguiente.

## Goals / Non-Goals

**Goals:** navegación siempre a mano, jerarquía visible entre secciones, mismo ancho y escala que Inicio, sin desbordes.

**Non-Goals:** el interior de las secciones (Fases 2 y 3), las vistas filtradas, cifras de catálogo, tipografías.

## Decisions

### Barra de pasillos: el mismo `ExploreJumpNav`, fijo y con un observador
`ExploreJumpNav` conserva sus enlaces `#ancla` (server component) y se envuelve en una franja `sticky` bajo la cabecera global (64 px en
escritorio, 60 en pantallas angostas), con fondo `ink` translúcido y borde inferior. Un componente cliente mínimo (`JumpNavLinks`)
mide las secciones una vez por cuadro al desplazar o redimensionar (`requestAnimationFrame`; con `IntersectionObserver` las secciones
más altas que la pantalla no cambiaban de estado al pasar la línea) y pone `aria-current="true"` en el enlace de la
visible; en pantallas angostas desplaza la fila para que ese enlace quede a la vista (`scrollIntoView({ inline: "nearest" })`, sin mover
la página). Las secciones suben su `scroll-margin-top` para que ni la cabecera ni la barra tapen su título. Sin JavaScript queda la fila de
enlaces, sin marca. Estilo: pestañas de texto (Space Grotesk, subrayado ámbar en la actual), no píldoras mono.
*Alternativa descartada:* una barra nueva solo de cliente: perdería el funcionamiento sin JavaScript que la spec exige.

### Encabezado de sección compartido
`HomeSectionHeading` (Inicio, `redesign-anon-home-phase2`) pasa a `src/components/ui/SectionHeading.tsx` y lo usan Inicio y Explorar.
`SectionHeader` gana `size="page"`, que delega en `SectionHeading`. Los rieles compartidos (`AlbumRail`, `CollectionRail`) lo reciben
como `headingSize="page"` desde la portada; `MosaicGrid`, `PopularNow`, `AwardsExploreSection` y `HallOfFameExploreSection` solo los usa
Explorar, así que pasan directamente a `size="page"`. El valor por
defecto no cambia, así la página de género, el hub de colecciones y el resto de usos de esos componentes quedan igual.
*Alternativa descartada:* agrandar `SectionHeader` para todos — cambiaría páginas fuera del alcance.

### Marco y entrada
`main` pasa a `max-w-[88rem]` con `px-4 sm:px-8 xl:px-12` y separación `gap-16 lg:gap-24`. El `<h1>` sube a la escala de Inicio
(40–64 px) y gana una frase (`catalog.explore.intro`): qué se puede hacer, sin cifras.

### Correcciones
La lista de «Popular ahora» (`PopularNow`, `ol` en dos columnas) se sale 1,6 px a 390 px: su rejilla pasa a `minmax(0, 1fr)` y los
enlaces de fila a `min-w-0`. `FAMILY_STAMP_CLASS` (0,65 rem = 10,4 px) sube a 11 px; otros usos de 0,65 rem fuera de Explorar quedan
para su propia revisión.

## Risks / Trade-offs

- [Dos franjas fijas comen alto en el teléfono] → La barra mide ~44 px y se desplaza en horizontal; la cabecera ya es compacta allí.
- [El observador marca la sección equivocada en secciones cortas] → Margen calibrado (cabecera + barra) y prueba con las nueve secciones;
  la última sección se marca al llegar al final de la página.
- [Mover `HomeSectionHeading` toca Inicio] → Mismo marcado y estilos; los tests de Inicio cubren su uso.

## Migration Plan

Sin datos ni API; revertir el commit restaura la fila de píldoras y los títulos de 20 px.

## Open Questions

Ninguna bloqueante. La frase de entrada se redacta con la Ayuda como referencia para no prometer funciones que no existen.
