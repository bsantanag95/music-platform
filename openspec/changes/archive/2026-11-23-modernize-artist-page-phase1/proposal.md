## Why

La auditoría de la ficha de artista (2026-11-21, `/es/artist/iron-maiden-…` sin sesión a 1440 y 390 px; mockups en
`mockups/artist-2026-11/`) encontró una cabecera de 488 px que empuja las pestañas a 699 px en escritorio y a 1.559 px en el
teléfono, una columna «Tu relación» de 288 × 488 px que para un visitante solo dice una frase, un bloque de comunidad que
muestra «<5 · 0 · 0», 13 controles antes del primer disco y un contenido de 1152 px cuando el resto del sitio ya usa 1408.
La página no tiene impacto visual: la foto va en un recuadro 4:3 de 200 px. Se eligió la propuesta **D · Mezcla** (decisiones
del 22 y 23 de noviembre): la portada a sangre de la propuesta B hecha con las carátulas del propio artista, la foto actual como
retrato circular, las pestañas horizontales de hoy, la línea de tiempo de la alineación de la propuesta A y la discografía con su
orden y agrupación actuales. Esta es la Fase 1 de tres: la cabecera.

## What Changes

- **Portada de carátulas:** la cabecera pasa a ser una franja a todo el ancho cuyo fondo sale siempre de las carátulas de la
  discografía principal del artista: con 8 o más, un muro atenuado; con 1 a 7, el color desenfocado de la primera y las fundas
  en abanico (con una sola, el disco asoma de la funda); sin carátulas, un disco dibujado sobre tinta.
- **Retrato circular:** la foto de Commons pasa a un círculo junto al nombre, con su crédito en la esquina de la portada. Sin
  foto, la carátula del disco mejor valorado (o del más reciente) en cuadrado; sin ninguna de las dos, las iniciales.
- **Identidad y ficha compactas:** nombre en la escala de las portadas rediseñadas, descripción debajo, y la ficha en dos líneas
  (géneros, tipo, origen, actividad, integrantes y premios; luego enlaces y En vivo). El antetítulo de tipo pasa a la ficha.
- **Acción principal:** para un visitante, «Seguir a {artista}» con una frase, en lugar de la columna «Tu relación»; con sesión,
  el panel «Tu relación» sigue entero en la columna derecha de la portada.
- **Comunidad en una línea:** oyentes, seguidores y listas como una línea de la ficha que omite las cifras en 0, en lugar de tres
  tarjetas.
- **Resumen fuera de la cabecera:** el resumen de Wikipedia deja la cabecera; la pestaña Biografía lo sigue mostrando completo.
- **Marco:** la página pasa al contenedor de 88rem del resto del sitio.

### Goals

- Que la ficha de artista tenga el impacto de las portadas rediseñadas sin depender de que la foto tenga un buen encuadre.
- Que el contenido de las pestañas empiece mucho antes, sobre todo en el teléfono.

### Non-Goals

- **Fase 2:** la línea de tiempo «La banda a lo largo del tiempo» en Integrantes y la pestaña Biografía con su ficha lateral.
- **Fase 3:** la barra de la discografía, los errores de las carátulas (título que choca con la etiqueta de tipo, icono de imagen
  rota) y la escala de títulos de Discografía y Comentarios.
- Cambiar el orden, la agrupación o la vista por defecto de la discografía (se mantienen tal como están).
- Guardar el tamaño de las fotos de Commons: la regla nueva no lo necesita.
- Tipografías y colores.

## Capabilities

### New Capabilities

_(ninguna)_

### Modified Capabilities

- `artist-header`: portada de carátulas, retrato circular con sus respaldos, tipo dentro de la ficha, ficha en líneas, sin resumen.
- `artist-page-layout`: zonas de la página con la portada a todo el ancho; el bloque de comunidad de tres celdas desaparece.
- `artist-personal-panel`: el visitante ve «Seguir a {artista}» en lugar del panel; posición del panel en el teléfono.
- `artist-community-stats`: la comunidad pasa a una línea de la ficha que omite las cifras en 0.

## Impact

`src/app/[locale]/(catalog)/artist/[id]/(tabs)/layout.tsx`; `src/components/artist/{ArtistHeader,ArtistCommunity,
ArtistRelationPanel,ArtistTabs}.tsx` y un componente nuevo `ArtistStage.tsx` (fondo de carátulas y retrato) con su función pura de
selección (`artist-stage.ts`); `artist-data.ts` (carátulas de la discografía principal para la portada, ya presentes en
`loadDiscography`); mensajes `messages/{es,en}/catalog.json`; `client-messages.json`; tests de la cabecera, el panel y las páginas
del artista; `docs/05-features/catalog-browsing.md` y `docs/03-data/data-licensing.md` (uso de las miniaturas en la portada). Sin
API, esquema ni dependencias. Las páginas informativas no cambian: las carátulas siguen como miniaturas de 250 px para identificar
la obra del artista.
