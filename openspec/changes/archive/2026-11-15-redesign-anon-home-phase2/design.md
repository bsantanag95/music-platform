## Context

Fase 2 de tres de la modernización de la portada pública (plan completo en el `design.md` de `2026-11-15-redesign-anon-home-phase1`;
mockup de referencia `mockups/home-2026-11/c-disqueria.html`). Tras la Fase 1, `AnonymousHome` es: hero a sangre completa (contenedor
`max-w-[88rem]`) y luego un `main` con `items-center gap-12 px-4 py-12` cuyos bloques van en `max-w-3xl`. Decisiones vigentes del usuario:
tipografías actuales; variantes nuevas solo para Inicio, `/explore` sin cambios; el Inicio con sesión no cambia.

Piezas existentes reutilizables:
- `AlbumRail layout="scroll"` con `artistNames` y `stats` (cifra sobre la carátula) y `headerless`: es el riel que `/explore` usa para
  «Mejor valorados», con `albumArtistNames()` y `★ <promedio>`.
- `SleeveStack`, `collectionLinkOf`/`collectionTitleOf` y `FeaturedCollection.coverThumbs` de `CollectionRail`.
- `CompactActivityRow` y los tipos `FeedRating | FeedComment | FeedReview` (con `target` y su carátula).

## Goals / Non-Goals

**Goals:** cuerpo a todo el ancho con jerarquía clara; colecciones sin apilado en móvil; comunidad legible como reseñas; acceso a Usuarios
siempre presente.

**Non-Goals:** `/explore`, Inicio con sesión, nuevos datos o consultas, el interior de lanzamientos, funciones y cierre (Fase 3).

## Decisions

### Un contenedor y un encabezado de sección propios de Inicio
`AnonymousHome` deja la columna `max-w-3xl` y envuelve el cuerpo en el mismo contenedor del hero (`max-w-[88rem]`, `px-4 sm:px-8 xl:px-12`),
con más separación entre secciones (`gap-16 lg:gap-24`). `HomeSectionHeading` (server): `h2` de 32–40 px (`font-display`), descripción
opcional de una línea y enlace «Ver …» a la derecha (abajo en móvil), con `id` para `aria-labelledby`. *Alternativa descartada:* agrandar
`SectionHeader`, que comparte `/explore` y cambiaría esa página.

Los bloques que se rediseñan en la Fase 3 (`HomeReleases`, `HowItWorks`, `AnonCta`) solo pasan al contenedor ancho y adoptan el encabezado
nuevo donde lo tienen; su interior (rieles y carrusel) ya es desplazable y simplemente muestra más tarjetas.

### Mosaico de colecciones: componente nuevo, solo Inicio
`CollectionMosaic` (server) recibe las colecciones destacadas y muestra hasta seis: desde `lg`, rejilla de 4 columnas con la primera en 2×2
(cuadrícula 4×2 de sus `coverThumbs`), cuatro medianas con `SleeveStack` y la sexta a lo ancho con una tira de miniaturas; con menos de seis
se degrada sin huecos (3–5: destacada + medianas; 1–2: medianas). Por debajo de `lg`, las mismas tarjetas en un riel horizontal con
`scroll-snap` (`RailScroller` si encaja, si no la misma mecánica). Enlaces con `collectionLinkOf`, títulos con `collectionTitleOf`.
*Alternativa descartada:* `CollectionRail layout="scroll"` tal cual — evita código nuevo pero repite la forma de `/explore` y pierde la
jerarquía del mosaico que se eligió en C.

### Mejor valorados con el riel de `/explore`
`AlbumRail layout="scroll" headerless` bajo un `HomeSectionHeading`, con `artistNames={await albumArtistNames(ids)}` y
`stats={ "★ 4,3" }`. **Desvío del mockup:** C mostraba un puntaje 1–100; `listTopRated` ordena y agrega por estrellas, y añadir un promedio
del puntaje detallado sería un dato y una regla nuevos. Se muestra el promedio de estrellas, que es lo que el ranking usa.

### Comunidad: tarjetas y paneles
`CommunityActivity` gana `layout="cards"` (por defecto `rows`, que sigue usando el Inicio con sesión). `ActivityCard`: carátula del objetivo
(`CoverThumb`), autor con `UserHoverCard` como en la fila actual, la nota en la **forma compacta** que `rating-display` fija para la
actividad de la comunidad (`★ 86/100` o `★ 4,5`, nunca ambos, número en tono neutro) y extracto de 2–3 líneas en comentarios y reseñas.
*Desvío del mockup:* C dibujaba la fila de estrellas y el puntaje juntos; la spec no lo permite en esta superficie.

### Corrección de la entrada de ejemplo de la Fase 1
`HeroSampleEntry` usaba `ScoreBadge` (escala de color de las imágenes compartidas) y mostraba `92` sin `/100`: incumple «La nota no se
codifica con color» y el formato `86/100` de `rating-display`. Pasa a fila de estrellas + `92/100` en `text-paper`, con una sola etiqueta
accesible. La primera tarjeta ocupa las dos columnas de la rejilla interior.
`PopularComments` y `PublicLists` ganan una variante `panel` (superficie `ink-surface`, borde, sin `max-w-3xl`). La columna lateral termina
con `PeopleCard` → `/users`, que sustituye al enlace de la Fase 1 en la cabecera del bloque (`showPeopleLink` se retira) y se muestra aunque
los tres bloques de la comunidad vengan vacíos. Desde `lg`, rejilla `2fr 1fr`; debajo, una columna.

## Risks / Trade-offs

- [Más superficies con borde pueden recargar la página] → Tarjetas solo en la actividad y paneles solo en la columna lateral; el resto
  sigue plano.
- [Mosaico con pocas colecciones] → Reglas de degradación explícitas y test por cantidad.
- [Bloques de la Fase 3 a ancho completo antes de su rediseño] → Sus interiores son rieles desplazables; se verifica a 1440 px que no
  queden estirados de forma rara.

## Migration Plan

Sin datos ni API; revertir el commit restaura la presentación anterior.

## Open Questions

Ninguna bloqueante. El mockup mostraba posiciones (#1, #2…) sobre «Mejor valorados»; se omiten salvo que se pidan, porque el riel no es un
ranking completo.
