## Context

`SongPage` (`src/app/[locale]/(catalog)/song/[id]/page.tsx`) monta, en un `main` de `max-w-6xl`, la miga con Compartir y una cabecera en
rejilla de áreas: `AlbumCover` (200 px en escritorio, 96 px en el teléfono), `SongIdentity` (antetítulo «Canción», título de 36 px,
artistas) con `GenreChips`, `SongFacts` (duración, escrita por, primera aparición, versión), `SongCommunity` (franja compartida
`CommunityStrip` o una línea) y `SongRelationPanel` en la columna derecha (anónimo: «Valora y registra tus escuchas» + «Iniciar
sesión»). Debajo, `SongTrackStrip` (franja con anterior · disco · siguiente), Composición, Créditos, Apariciones, Versiones y
Comentarios.

Álbum y artista acaban de estrenar su portada a sangre (`modernize-album-page-phase1..3`, `modernize-artist-page-phase1..3`). La
auditoría del 2026-11-24 comparó A · Escenario, B · Pista y C · Ficha (`mockups/song-2026-11/`); el usuario eligió la cabecera de **C**
(«se distingue visualmente de la vista del álbum») y todo lo demás de **A** con las recomendaciones (mockup `d-mezcla.html`). Las dos
preguntas abiertas se toman como las resolvía A: «Aparece en» como franja de carátulas, y la línea de vida de versiones de B se
descarta.

## Plan en tres fases

| Fase | Cambio | Alcance |
| --- | --- | --- |
| 1 | `modernize-song-page-phase1` (este) | **Tarjeta:** carátula, identidad, ficha en dos columnas (disco, pista, producción, «N versiones →»), «Recorrer el disco» y «Valorar esta canción» / panel en la columna lateral, comunidad sin vacíos, 88rem, teléfono compacto. |
| 2 | `modernize-song-page-phase2` | **Créditos y disco:** créditos en dos columnas (Intérpretes · Producción y sonido) con la columna «En el disco» (todas las pistas de la edición representativa, esta marcada, con duración) y escala de títulos de sección. |
| 3 | `modernize-song-page-phase3` | **Apariciones, versiones y cierre:** «Aparece en» como franja de carátulas con «Primer lanzamiento», versiones con año y duración en lugar de «Ver versión» y ancla `#versiones`, comentarios con la escala nueva. |

Cada fase se archiva, se fusiona y se publica antes de abrir la siguiente.

## Goals / Non-Goals

**Goals:** cabecera densa y distinta de la del álbum; nada vacío ni en cero para el visitante; créditos más arriba que hoy en el
teléfono.

**Non-Goals:** Fases 2 y 3, URL, disco principal, datos, filas del panel con sesión, carátula por encima de 250 px.

## Decisions

### Una tarjeta, no una portada
La cabecera es un `<header>` con `rounded-lg border border-ink-border bg-ink-surface` y rejilla
`lg:grid-cols-[168px_minmax(0,1fr)_17rem]` (carátula · identidad y ficha · columna lateral con filete a la izquierda). Sin fondo
desenfocado: es lo que la distingue de la portada del álbum. La miga y Compartir quedan encima, fuera de la tarjeta.
*Alternativa descartada:* la portada de A a menor escala — el usuario prefirió que la canción no repita la portada del disco.

### Identidad
Antetítulo «Canción» en mono; `<h1>` en `clamp(1.875rem,3.4vw,2.75rem)` (30–44 px), artistas en `font-display` ámbar debajo. Los
géneros pasan de fichas a una fila de la ficha.

### Ficha en dos columnas
`SongFacts` se presenta como `dl` en rejilla `sm:grid-cols-[auto_minmax(0,1fr)_auto_minmax(0,1fr)]` (dos pares por fila; uno en el teléfono y entre 1024 y 1279 px, donde la columna central es estrecha),
solo con las filas que tienen dato, en este orden: Duración · Disco (el principal, enlazado) · Escrita por · Pista («8 de 8»,
de la tira) · Género (enlaces) · Primera aparición · Producción · Versión (la línea de `song-versions`, cuando la hay) · Versiones
(«17 versiones →», ancla a la sección; la Fase 3 le pone el `id`, hasta entonces apunta al `id` actual de la sección).

- **Primera aparición:** si es el disco principal, solo la fecha («29 mar 1982», o el año sin mes); si es otro, su título enlazado,
  su tipo y el año, como hoy («Manchild (single/EP) · 2025»).
- **Producción:** las personas de `credits.groups.production` con rol `producer`, hasta 2, enlazadas; sin productores, la fila no va.
- **Versiones:** el total de `loadVersions` (todos los grupos); sin versiones, la fila no va.

### Recorrer el disco en la tarjeta
`SongTrackStrip` gana una variante compacta para la columna lateral: título «Recorrer el disco», la pista anterior (chevron, número,
título, enlazada) y la siguiente, o «Inicio del disco»/«Fin del disco» sin enlace. El disco y «N de M» ya los dice la ficha. Sin tira
(pista fuera de la edición representativa), el bloque no va y la fila Pista tampoco. En el teléfono va en una fila: anterior a la
izquierda, siguiente o fin a la derecha.

### Acción principal: Valorar para el visitante, el panel con sesión
Sin sesión no se monta `SongRelationPanel`: la columna lateral muestra el botón ámbar «Valorar esta canción» hacia `/auth/login` y la
frase «Con una cuenta puedes valorarla, registrar tus escuchas y guardarla en tus listas.» (oculta en el teléfono). Con sesión, el
panel entero va en la columna lateral, debajo de «Recorrer el disco», sin su caja (la tarjeta ya es la superficie) y sin cambios en
sus filas. Mismo patrón que `AlbumRateInvite`.

### Comunidad sin vacíos
`SongCommunity` no se dibuja cuando no hay valoraciones, reacciones públicas, favoritas ni listas (hoy dice «Todavía sin actividad de
la comunidad»). Con algo de actividad, sigue igual (franja o línea de poca actividad), debajo de la ficha dentro de la tarjeta.

### Teléfono
Tarjeta en dos columnas (carátula de 88 px · identidad) y debajo, a todo el ancho, la ficha en una columna con menos interlineado,
«Recorrer el disco» en una fila y la acción. Objetivo medido en el mockup: créditos a 644 px a 390 px; en el producto, ≤ 680.

## Risks / Trade-offs

- [El panel con sesión alarga la tarjeta en escritorio] → La columna lateral crece hacia abajo; la ficha queda arriba a la izquierda.
  Se verifica con sesión que la tarjeta no supera ~560 px.
- [Disco y «Recorrer el disco» dicen algo parecido] → La ficha nombra el disco y la posición; la columna lateral solo navega.
- [Quitar el panel al visitante cambia la spec del panel] → Igual que el álbum y el artista.

## Migration Plan

Sin datos ni API; revertir el commit restaura la cabecera anterior.

## Open Questions

Ninguna bloqueante.
