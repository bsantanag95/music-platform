## Why

Con el bloque A cerrado, Compartir ya lleva lo que una persona hace a otras redes. El bloque B es la innovación: mostrar el gusto como
gráfico (`docs/05-features/sharing.md` §4). El Top N va primero porque es el formato más conocido, se arma en segundos y deja la base
de las Láminas de autor: modelo, editor, página pública y formatos Publicación y Cuadrado. Esta es la primera de tres fases.

## What Changes

- **Lámina Top N:** Top 5 (uno destacado y cuatro en filas), Top 10 (dos filas de cinco) y Grilla 3×3 sin números, de álbumes o canciones.
- **Modelo:** `user_list` con `kind = 'top'` y dos columnas (formato y mostrar notas), migración `0083`. Hereda audiencia, ítems ordenados,
  moderación y exportación; el resto de las superficies de listas ya filtran por `kind = 'standard'`.
- **Editor en `/me/laminas`:** crear, ordenar con teclado y toque, cambiar formato, título y audiencia, y buscar con el buscador local-first.
- **Página pública** `/users/<u>/laminas/<id>`, con metadatos y botón Compartir.
- **Notas opcionales y apagadas por defecto:** encenderlas es la decisión explícita del dueño de mostrar esas notas, con su puntaje.
- **Formatos Publicación (1080×1350) y Cuadrado (1080×1080)**, más Enlace e Historia. Mismo marco, escala y firma.
- **Carátulas:** una Lámina armada por una persona puede juntar hasta 10, en un ADR nuevo. El resto de las imágenes sigue en 4.
- **Feed:** una Lámina nueva entra como una lista nueva, con su audiencia (D14).
- **Lo propio:** "Hacer pública y compartir" y la descarga privada también sirven para una Lámina.

Fuera de esta fase: armar desde valoraciones, favoritos o listas, filtros y títulos sugeridos (Fase 2); "Arma la tuya" con registro dirigido
(Fase 3); artistas como ítems, estante en el perfil y guardar Láminas ajenas.

## Capabilities

### New Capabilities

- `top-laminas`: modelo, editor, página pública, notas y reglas de una Lámina Top N.

### Modified Capabilities

- `share-images`: formatos Publicación y Cuadrado, imagen de una Lámina y tope de carátulas.
- `share-sheet`: formatos según el objeto.
- `share-events`: tipo `top` y formatos `post` y `square`.
- `personal-share-image`: una Lámina también tiene imagen privada y gesto.
- `cover-art-mirror`: excepción ampliada a las Láminas de autor.
- `activity-feed`: una Lámina nueva entra al feed.

## Impact

- **Base de datos:** migración `0083` (`kind`, columnas, `CHECK` de `share_event`).
- **Código:** `src/services/laminas/` nuevo, `/api/me/laminas`, páginas `/me/laminas` y `/users/[username]/laminas/[id]`, `src/services/share/`
  (`TopFrame`, objetivo, renderizador), hoja de compartir, `src/services/feed/feed.ts`, menú de cuenta.
- **Dependencias:** ninguna.
- **Docs:** ADR nuevo, `sharing.md`, `data-licensing.md`, `domain-model.md`, `business-rules.md`, `04-api/contracts.md`, `03-data/sql-model.md`.
