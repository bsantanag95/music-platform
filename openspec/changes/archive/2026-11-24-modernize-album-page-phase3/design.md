## Context

- **Reseñas** (`(tabs)/reviews/page.tsx`): monta `ReviewIndex` (cabecera con orden y lista; sin reseñas, un `EmptyState` compacto
  «Todavía no hay reseñas de este álbum. / Cuando alguien reseñe el disco aparecerá aquí.») y, debajo, `ReviewComposer` (sin sesión,
  una fila «¿Ya lo escuchaste? Cuenta qué te pareció.» + «Inicia sesión para reseñar»; con sesión y sin reseña propia, la misma frase
  + «Escribir reseña», que despliega el formulario).
- **Comentarios** (`social/Comments.tsx`, compartido por álbum, artista y canción): sin sesión, una línea «Inicia sesión para
  comentar» y, sin comentarios, otra «Todavía no hay comentarios.».
- **Pestañas** (`AlbumTabs`): «Reseñas» lleva siempre su contador, también 0.
- **Franja** (`DiscographyStrip`): `h2` en `text-lg` (18 px); «Comentarios» va en `text-xl` (20 px).

El plan está en el diseño archivado de `modernize-album-page-phase1`. Reseñas y Comentarios siguen separados.

## Goals / Non-Goals

**Goals:** una sola invitación por lugar, ningún cero visible, jerarquía de títulos coherente.

**Non-Goals:** unificar reseñas y comentarios, la barra de la franja, el formulario y el índice con reseñas.

## Decisions

### Reseñas vacías: el compositor dentro del estado vacío
`ReviewIndex` acepta `emptyAction?: ReactNode`; sin reseñas, dibuja un solo bloque con el título «Todavía nadie reseñó este disco» y
`emptyAction` en lugar de la descripción. La página, cuando el índice llega vacío, pasa `ReviewComposer` en modo `compact` como
`emptyAction` y no lo repite debajo. `ReviewComposer compact` dibuja solo la acción (sin la frase «¿Ya lo escuchaste?…», que ya dice el
bloque): «Inicia sesión para reseñar» sin sesión, «Escribir reseña» con sesión (al abrir, el formulario aparece debajo del bloque como
hoy, con el mismo ancla `#your-review`). Con reseñas, todo queda como hoy.
*Alternativa descartada:* esconder el estado vacío y dejar solo la invitación: la pestaña quedaría sin decir que no hay reseñas.

### Comentarios sin sesión: una frase
`Comments`, sin sesión y sin comentarios, dibuja una sola frase: «Todavía no hay comentarios.» seguida del enlace «Inicia sesión para
comentar» (`SECONDARY_LINK`). Con comentarios, el enlace queda arriba de la lista como hoy; con sesión, nada cambia. Afecta igual a
artista y canción, que repetían lo mismo; sus tests se ajustan.

### Pestaña sin «0»
`AlbumTabs` muestra el contador de Reseñas solo con `reviewCount > 0`.

### Escala
`DiscographyStrip` pasa su `h2` a `text-xl`, como «Comentarios».

## Risks / Trade-offs

- [Cambiar `Comments` toca artista y canción] → Mismo texto y enlace, solo en una línea; los tests de las tres páginas lo cubren.
- [El compositor en modo compacto dentro del vacío] → Mismo componente y ancla; el formulario abierto aparece debajo del bloque.

## Migration Plan

Sin datos ni API; revertir el commit restaura los textos anteriores.

## Open Questions

Ninguna bloqueante. Unificar reseñas y comentarios queda como decisión del usuario para un cambio aparte.
