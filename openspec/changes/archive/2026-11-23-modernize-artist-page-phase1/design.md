## Context

La página de artista (`src/app/[locale]/(catalog)/artist/[id]/(tabs)/layout.tsx`) monta, en un `main` de `max-w-6xl`: miga de pan
con Compartir; una cabecera en rejilla `[1fr_18rem]` con la foto 4:3 (`ArtistPhoto`), la identidad con antetítulo de tipo
(`ArtistIdentity`), los géneros (`GenreChips`), la ficha en `<dl>` (`ArtistFacts`), el resumen de Wikipedia (`ArtistSummary`), el
bloque de comunidad de tres tarjetas (`ArtistCommunity`) y el panel «Tu relación» (`ArtistRelationPanel`) en la columna derecha;
luego la barra de pestañas fija (`ArtistTabs`), el contenido de la pestaña y los comentarios.

La auditoría del 2026-11-21 comparó tres direcciones (`mockups/artist-2026-11/`: A · Índice, B · Estantería, C · Ficha) y el
usuario armó una cuarta, **D · Mezcla** (`d-mezcla.html`), con estas decisiones:

1. **(22 nov)** La cabecera a sangre de B, pero que funcione sin una foto que sirva de portada. Pestañas horizontales como hoy (no
   un índice lateral: cada sección en su espacio). En Integrantes, la alineación estilo Metal Archives de hoy con la línea de tiempo
   de A encima; «Ver alineación» abre esa pestaña. La discografía mantiene su orden (año ascendente), su agrupación y su vista por
   defecto (carátulas para los discos de estudio, lista para el resto), y lo que se elige a mano se conserva.
2. **(23 nov)** La portada sale **siempre** de las carátulas de la discografía, y debe encajar con uno o dos discos. La foto actual
   se mantiene como retrato, **circular**.

Datos de la base local (2026-11-22): de 909 artistas con discografía, 699 tienen foto, 324 tienen carátulas y 154 no tienen ni
foto ni carátulas.

## Plan en tres fases

| Fase | Cambio | Alcance |
| --- | --- | --- |
| 1 | `modernize-artist-page-phase1` (este) | **Cabecera:** portada de carátulas a todo el ancho (muro, abanico o disco dibujado), retrato circular con respaldos, nombre grande, ficha en dos líneas con el tipo y la comunidad, «Seguir a {artista}» para el visitante y el panel «Tu relación» en la columna derecha con sesión, resumen fuera de la cabecera, contenedor de 88rem. |
| 2 | `modernize-artist-page-phase2` | **Integrantes:** «La banda a lo largo del tiempo» (una barra por integrante con sus períodos, voz e instrumentos en dos tonos, eje de años) sobre la alineación estilo Metal Archives, que no cambia; solo grupos con períodos fechados. **Biografía:** el texto completo con una ficha lateral (primer y último álbum, número de álbumes, integrantes actuales y antiguos). |
| 3 | `modernize-artist-page-phase3` | **Discografía:** la barra en dos filas (secciones; buscar, agrupar y vista), con el orden, la agrupación y la vista por defecto de hoy; el título de la carátula ya no choca con la etiqueta de tipo; una carátula que falla muestra el disco dibujado en vez del icono de imagen rota; escala de títulos de Discografía y Comentarios. |

Cada fase se archiva, se fusiona y se publica antes de abrir la siguiente.

## Goals / Non-Goals

**Goals:** una cabecera con impacto en cualquier artista, haya o no foto o carátulas; menos alto antes de las pestañas; mismo
marco que el resto del sitio.

**Non-Goals:** Integrantes y Biografía (Fase 2), la discografía (Fase 3), tamaño de las fotos de Commons, tipografías.

## Decisions

### Fondo de la portada: una función pura decide el modo
`artist-stage.ts` exporta `stageBackdrop(covers)` → `{ mode: "wall" | "fan" | "none", covers }`, con `covers` las miniaturas de la
discografía **principal** con carátula resuelta (`coverResolved` y `coverThumbUrl` de `loadDiscography`), en el orden de la
discografía (año ascendente), sin repetir disco:

- **8 o más → muro:** rejilla de 9 columnas (5 en el teléfono) que repite las carátulas hasta llenar 45 celdas (9 × 5 en escritorio, 5 × 9 en el teléfono),
  con un velo de tinta encima (degradado de arriba hacia abajo) para que el texto se lea.
- **1 a 7 → abanico:** de fondo, la primera carátula ampliada con `blur(60px)` y opacidad .55 (solo color); a la derecha, hasta
  5 fundas superpuestas con giro de ±3° por paso. Con una sola, un disco de vinilo asoma de la funda para que el abanico no quede
  cojo. En el teléfono el abanico sube a la esquina superior derecha, junto al retrato, para no quedar detrás del texto.
- **0 → disco dibujado:** fondo de tinta con un vinilo trazado en CSS.

El umbral de 8 es el mínimo con el que un muro de 9 columnas no repite una carátula en la misma fila. La función es pura y lleva
tests de propiedades (cualquier número de carátulas cae en un modo; el abanico nunca pasa de 5; el muro no deja celdas vacías).
*Alternativa descartada:* la regla de cuatro estados según la foto (apaisada → fondo; vertical → retrato), que exigía guardar el
ancho y alto de cada foto de Commons y dejaba la portada a merced del encuadre.

### Las carátulas de fondo siguen siendo miniaturas que identifican la obra
Se usan las mismas miniaturas de 250 px (espejo propio o Cover Art Archive, `cover-art.ts`) que ya muestra la discografía, nunca
la resolución completa: en el muro cada celda mide menos de 250 px y va atenuada; en el abanico las fundas no pasan de 280 px de
alto y el fondo desenfocado no deja ver la imagen. Es el mismo tratamiento que el muro de la portada de Inicio y sigue la decisión de
`docs/03-data/data-licensing.md` (uso de baja resolución para identificar el contenido); se añade allí un párrafo. Las capas son
`aria-hidden` y van como `background-image` de elementos vacíos, sin texto alternativo que repetir.

### Retrato: foto circular, si no carátula cuadrada, si no iniciales
`ArtistPhoto` pasa a un círculo de 148 px (96 en el teléfono) con borde fino. El crédito de la foto (autor y licencia, enlazados)
va en la esquina inferior derecha de la portada, en mono pequeño, como exige la licencia. Sin foto, el retrato es la carátula del
disco mejor valorado (`bestRatedId` de la discografía) o, si no lo hay, la del disco principal más reciente, en cuadrado con
esquinas redondeadas y enlazada al disco; sin carátulas, las iniciales del nombre sobre un círculo de superficie.

### Identidad y ficha
- `<h1>` en la escala de las portadas rediseñadas (`clamp(2.5rem, 6vw, 5.5rem)`, `font-display`), descripción en serif debajo.
- El antetítulo de tipo desaparece: el tipo («Banda», «Solista»…) abre la línea de la ficha.
- `ArtistFacts` conserva `artistFactRows` (mismas filas y orden) pero se presenta en dos líneas separadas por `·`: géneros como
  fichas, tipo, origen o nacimiento, actividad o primer disco, integrantes («Ver alineación →») y premios; debajo, enlaces externos
  y En vivo. Los rótulos de cada fila (`dt`) quedan para lectores de pantalla (`sr-only`), de modo que la ficha se sigue anunciando
  como lista de definiciones.
- La comunidad se suma como última parte de la primera línea: «312 oyentes · 120 seguidores · 12 listas», con «<5» y su texto
  para lectores de pantalla, omitiendo cada cifra en 0 y la parte entera si todas son 0. El detalle de favoritos va en el `title`
  y el texto accesible de Seguidores. «Listas» enlaza a las listas como hoy.

### Acción principal: Seguir para el visitante, el panel con sesión
Sin sesión no se monta `ArtistRelationPanel`: la columna derecha de la portada muestra el botón ámbar «Seguir a {artista}», que
lleva a `/auth/login` (como la invitación actual del panel: el inicio de sesión no tiene hoy un retorno genérico y abrir uno queda fuera de este cambio), y una frase («Necesitas una cuenta para seguir artistas y registrar tus escuchas.»).
Con sesión, el panel entero ocupa esa columna (18rem) sobre una superficie opaca, sin cambios en sus filas. En el teléfono la acción
o el panel van después de la ficha y antes de las pestañas.

### Resumen fuera de la cabecera
`ArtistSummary` y `HiddenOnTab` dejan el layout. El enlace a Wikipedia sigue en la línea de enlaces y la pestaña Biografía muestra
el texto completo con su atribución (sin cambios en esta fase).

### Marco
`main` pasa a `max-w-[88rem]` con `px-4 sm:px-8 xl:px-12`; la portada sale del contenedor (márgenes negativos hasta el borde de la
ventana) y su contenido se alinea con el de la página. La barra de pestañas fija conserva sus variables de altura.

## Risks / Trade-offs

- [El muro carga hasta 24 miniaturas más arriba del pliegue] → Son las mismas URL que la discografía pide justo debajo (caché del
  navegador), de 250 px; el muro usa como mucho 24 carátulas distintas y repite el resto.
- [Texto sobre carátulas con mucho contraste] → Velo de tinta graduado y texto sobre la mitad inferior; se verifica el contraste
  con carátulas claras (p. ej. discos de portada blanca).
- [Quitar el resumen esconde la biografía] → La pestaña Biografía sigue en la barra y Wikipedia en los enlaces; la Fase 2 la
  mejora.
- [Un visitante pierde la invitación del panel] → El botón Seguir lleva al inicio de sesión, como hoy; la frase explica para qué.

## Migration Plan

Sin datos ni API; revertir el commit restaura la cabecera anterior.

## Open Questions

Ninguna bloqueante.
