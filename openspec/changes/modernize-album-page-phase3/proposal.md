## Why

La auditoría de la ficha de álbum (2026-11-24, `mockups/album-2026-11/`) contó tres invitaciones a iniciar sesión y varios vacíos que
hablan de ausencia: la pestaña Reseñas muestra una caja «Todavía no hay reseñas de este álbum» y, debajo, otra fila «¿Ya lo escuchaste?
Cuenta qué te pareció · Inicia sesión para reseñar»; Comentarios dice «Inicia sesión para comentar» y además «Todavía no hay
comentarios»; la pestaña se rotula «Reseñas 0». El título de la franja de discografía mide 18 px, menos que «Comentarios» (20 px).
El usuario eligió **A · Portada** y, para la pregunta abierta, se tomó la opción conservadora: Reseñas y Comentarios **siguen
separados**, pero cada uno con una sola invitación. Fases 1 y 2 publicadas (`main` d265d740). Esta es la Fase 3 y última.

## What Changes

- **Reseñas vacías en un solo bloque:** sin reseñas, la pestaña muestra un único bloque con «Todavía nadie reseñó este disco» y la
  acción que corresponde (sin sesión, «Inicia sesión para reseñar»; con sesión, «Escribir reseña»), en lugar de la caja vacía más la
  fila de invitación.
- **Comentarios sin sesión en una línea:** sin comentarios, una sola frase con el enlace («Todavía no hay comentarios. Inicia sesión
  para comentar.»); con comentarios, el enlace queda arriba de la lista como hoy. El componente es compartido: el cambio también se ve
  en la ficha de artista y en la de canción, que tenían la misma duplicación.
- **Sin «Reseñas 0»:** la pestaña muestra su contador solo cuando hay reseñas.
- **Escala:** el título de la franja de discografía pasa a la escala de «Comentarios».

### Goals

- Una sola invitación por lugar donde se puede opinar y ningún cero a la vista.

### Non-Goals

- Unificar reseñas y comentarios en una sección (decisión pendiente del usuario; se respeta la separación).
- La barra de desplazamiento de la franja (se mantiene por decisión de `refine-album-page-phase2`).
- Cambiar el formulario de reseña, el índice con reseñas o los temas de comentarios.

## Capabilities

### New Capabilities

_(ninguna)_

### Modified Capabilities

- `album-review`: la pestaña Reseñas sin reseñas muestra un solo bloque con la acción.
- `album-page-layout`: la pestaña Reseñas sin contador en 0; Comentarios sin sesión y sin comentarios en una sola frase; título de la
  franja en la escala de Comentarios.

## Impact

`src/app/[locale]/(catalog)/album/[id]/(tabs)/reviews/page.tsx`, `src/components/album/{ReviewIndex,ReviewComposer,AlbumTabs,
DiscographyStrip}.tsx`, `src/components/social/Comments.tsx` (compartido con artista y canción); mensajes `catalog.album.reviews` y
`social` (es/en); `client-messages.json`; tests de reseñas, pestañas, franja y comentarios; `docs/05-features/catalog-browsing.md`.
Sin API, esquema ni dependencias. Las páginas informativas no cambian.
