## Context

La página de canción es una página compacta sin pestañas (`song/[id]/page.tsx`): cabecera, tira de pistas,
Composición y Créditos de esta grabación, Apariciones, Versiones y Comentarios. La página de álbum dejó en
`refine-album-page-phase1` las piezas compartidas `SEGMENT_GROUP`, `SEGMENT_OPTION`, `SECONDARY_LINK` y `Chevron`.

## Decisions

### D1. Pestañas de versiones: estilo común, semántica de pestañas

Las pestañas son pestañas ARIA reales (`role="tab"`, `aria-selected`, foco con flechas). Se conserva todo eso y solo
cambia el estilo: `SEGMENT_OPTION` agrega la variante `aria-selected:` junto a `aria-pressed:` y `aria-current:`, así
que el mismo módulo cubre botones, enlaces y pestañas. La cifra va tras el nombre en gris ("Otras grabaciones 2"), como
las secciones del artista y los filtros de Ediciones.

### D2. Artista comodín

MusicBrainz usa un artista especial llamado "[unknown]" para créditos sin artista conocido. Se detecta por el nombre
exacto (`[unknown]`) y se muestra "Artista desconocido" sin enlace: su página de artista no dice nada.

### D3. Títulos de sección

Composición y Créditos de esta grabación pasan a tener su `h2` como las demás secciones (`font-display text-lg`) y la
caja solo envuelve el contenido. Es el mismo ritmo que Apariciones y Versiones.

### D4. `SongwriterNames` compartido

Los autores usan `SECONDARY_LINK`. El cambio llega también a la Composición de la pestaña Créditos del álbum, que es lo
buscado (allí también eran ámbar en reposo).

## Risks / Trade-offs

- **Detección por nombre**: un artista real llamado literalmente "[unknown]" se mostraría como desconocido; no existe
  fuera del comodín de MusicBrainz.
