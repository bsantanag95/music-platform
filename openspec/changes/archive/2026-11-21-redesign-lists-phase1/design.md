## Context

`/lists` (`src/app/[locale]/lists/page.tsx`) tiene dos estados.

**Vitrina (sin filtros).** Es un `main` de `max-w-6xl` (1152 px) con:

- la miga de pan y un `<h1>` de 30–36 px, con «Crear lista» a la derecha si hay sesión;
- el `CommunityListsToolbar` (búsqueda, chips de tipo que se desplazan y el select de orden);
- dos columnas desde `lg`: las secciones a la izquierda y `ListsContextRail` (280 px) a la derecha.

Las secciones son Destacadas, De la gente que sigues, Populares y Recientes, con `SectionHeader` de 20 px y tarjetas en estantería. El
riel muestra «Tus listas» o la invitación a crear cuenta, y «Para completar».

**Estado filtrado.** Una sola `CommunityExploreGrid`, sin riel.

**Origen.** La auditoría del 2026-11-21 comparó tres direcciones (`mockups/lists-2026-11/`: A · Cajones, B · Lector y C · Fichero). El
usuario eligió **B con el exhibidor y la banda de A** y decidió tres cosas:

1. **Vista previa:** la primera lista llega resuelta del servidor; al elegir otra se piden sus elementos. Sin JavaScript, cada fila
   abre la lista.
2. **Teléfono:** tocar una fila abre la lista. No hay vista previa.
3. **«Para completar»** es una pestaña del lector, no un módulo aparte.

## Plan en tres fases

| Fase | Cambio | Alcance |
| --- | --- | --- |
| 1 | `redesign-lists-phase1` (este) | **Marco:** contenedor de 88rem, título de 40–64 px con frase de entrada y secciones con `SectionHeading`. **Filtros:** segmentos de tipo de 44 px, en su propia fila en el teléfono. |
| 2 | `redesign-lists-phase2` | **El lector:** filas con autor, tipo, elementos y guardadas, y pestañas (De la gente que sigues con sesión, Populares, Recientes y Para completar). Vista previa fija desde `lg`: la primera lista resuelta en el servidor y las demás con `GET /api/users/{username}/lists/{listId}` al elegirlas. En el teléfono, las filas abren la lista. Se retira el riel lateral: «Tus listas» pasa a la cabecera y la invitación sin sesión a una banda en el recorrido. El estado filtrado usa las mismas filas. |
| 3 | `redesign-lists-phase3` | **El exhibidor de Destacadas** (fundas en abanico y primeros elementos; con varias destacadas, una fila de exhibidores). **La banda «Arma tus propias listas»** con su forma final. **Estados** vacío y sin resultados con la forma nueva. Documentación. |

Cada fase se archiva, se fusiona y se publica antes de abrir la siguiente.

## Goals / Non-Goals

**Goals:**

- Mismo ancho, título y escala de secciones que Inicio y Explorar.
- Filtros completos y de 44 px en el teléfono.

**Non-Goals:**

- Tarjetas, filas, vista previa y riel (Fase 2).
- Destacadas y la banda (Fase 3).
- El estado filtrado por dentro.

## Decisions

### Marco y entrada, como Explorar
El `main` pasa a `mx-auto max-w-[88rem] px-4 sm:px-8 xl:px-12 pt-10 pb-16`; 40 px (`gap-10`) entre cabecera, filtros y contenido, y `gap-16 lg:gap-20` entre las secciones de la vitrina (la cabecera y el toolbar van juntos, como en Explorar). El grupo de miga de pan,
título y frase usa `gap-3`, como en Explorar.

- **Título:** el `<h1>` sube a `clamp(2.5rem,5vw,4rem)`. Con sesión, «Crear lista» sigue a la derecha del título.
- **Frase de entrada:** `lists.community.intro` dice qué hay sin enumerar secciones.
  - es: «Listas que la comunidad arma, ordena y recomienda: discos, artistas y canciones.»
  - en: "Lists the community builds, ranks and recommends: albums, artists and songs."
- **Riel:** sigue igual en esta fase (280 px a la derecha desde `lg`). La columna de las secciones crece con el contenedor.

### Encabezados de sección
`CommunityListSection` pasa `size="page"` a `SectionHeader`, que delega en `SectionHeading`. Destacadas, en `page.tsx`, hace lo mismo. Las
secciones quedan con 30–40 px de título y su descripción.

### Segmentos de tipo
En `CommunityListsToolbar`, la fila de chips pasa a un grupo segmentado (`role="group"` con enlaces o botones y `aria-pressed` o
`aria-current`, según el control actual), con fondo `ink-surface`, borde y el segmento activo en `paper` sobre `ink`.

- **Tamaño:** cada segmento mide `h-11` (44 px) y usa Space Grotesk a 15 px. El campo de búsqueda y el select de orden también suben a
  `h-11`.
- **Distribución:** desde `lg`, una sola fila `grid-cols-[minmax(0,1fr)_auto_auto]`. Por debajo, búsqueda y orden en la primera fila y los
  segmentos en una segunda, en `grid-cols-4` a todo el ancho.
- **Comportamiento:** no cambian la URL, los parámetros ni los textos.

*Alternativa descartada:* mantener los chips y solo agrandarlos. Seguirían desplazándose en el teléfono.

## Risks / Trade-offs

- **Contenedor ancho con el riel de 280 px.**
  - *Riesgo:* la columna de secciones crece a ~1000 px y las estanterías muestran más tarjetas por fila.
  - *Mitigación:* la estantería ya es responsiva; se verifica a 1440 que no queden tarjetas sueltas. La Fase 2 reemplaza la estantería.
- **Dos tamaños de encabezado mientras dura la transición.**
  - *Riesgo:* el estado filtrado sigue con su rótulo de resultados.
  - *Mitigación:* es otro tipo de encabezado y no compite con los de sección.

## Migration Plan

No hay datos ni API que migrar. Revertir el commit restaura el marco y los chips.

## Open Questions

Ninguna para esta fase. Para la Fase 2 queda por decidir dónde va «Tus listas» con sesión. La propuesta es una línea bajo el título:
«Retoma: <lista> · Mis listas · Guardadas».
