## Why

Las Fases 1 y 2 dejaron compartible todo lo del bloque A, pero solo como enlace, y hay que ir a buscar el botón. Instagram, el canal
donde más circulan estas imágenes, no muestra vista previa de enlaces: necesita una historia. Y una persona rara vez piensa en compartir
justo cuando termina algo que vale la pena. Esta es la tercera y última fase de `add-share-user-actions`
(`docs/05-features/sharing.md` §9), y cierra el bloque A.

## What Changes

- **Formato Historia** (1080×1920) para todo lo que tiene Enlace, con la misma marca. La carátula sigue en 250 px sin ampliar, sobre un
  vinilo dibujado que llena el ancho, y el contenido respeta las zonas seguras. Migración `0082`: `story` en `share_event.format`.
- **Selector de formato en la hoja:** Enlace o Historia, con su vista previa y su descarga. En el móvil, "Compartir…" manda la imagen como
  archivo si el navegador puede, que es la única vía web hacia Instagram Stories.
- **Ofrecimiento en momentos con significado:** un enlace "Compartir" dentro de un aviso, nunca un modal, al publicar una reseña, al
  hacer pública una lista y al completar un Camino público. Valorar o registrar una escucha no ofrece nada.
- **Compartir en los menús ⋯:** en las acciones rápidas de un disco (discografía, búsqueda, géneros, filas de listas) y en las tarjetas de
  listas y Caminos propios públicos. Los datos se piden al abrir la hoja: mostrar el menú no cuesta consultas.
- **API nueva** `GET /api/share/payload/[kind]/[ref]`.
- **Riesgo de caché corregido:** reseñas, comentarios, listas, Caminos, colecciones, huellas y perfiles dejan de usar la caché
  inmutable, porque moderación o su dueño pueden cerrarlos y una copia en un CDN seguiría visible hasta un año.

Fuera de esta fase: Publicación y Cuadrado (bloque B), y el ofrecimiento al completar un recorrido de discografía, que no tiene página
pública hasta `add-discography-lamina`.

## Capabilities

### New Capabilities

Ninguna.

### Modified Capabilities

- `share-images`: formato Historia y caché corta para lo que no es catálogo.
- `share-sheet`: selector de formato, archivo en el menú nativo, ofrecimiento y menús ⋯.
- `share-events`: formato `story`.

## Impact

- **Base de datos:** migración `0082` (solo el `CHECK` de `format`).
- **Código:** `src/services/share/` (marco Historia, renderizador), ruta de imágenes, `src/app/api/share/payload/`, `ShareSheet`,
  `OwnShareSheet`, `AlbumQuickActions`, `MyListCardMenu`, `CaminoCardMenu`, `ReviewComposer`, `ListDetail`, `CaminoManager`.
- **Dependencias:** ninguna.
- **Docs:** `sharing.md`, `business-rules.md`, `04-api/contracts.md`, `03-data/sql-model.md`.
