## Why

`add-share-foundation` dejó la imagen del enlace, la hoja y la medición en catálogo y perfil, pero lo que la gente
hace en la app todavía no se puede compartir bien: una reseña, una lista o una colección pegadas en WhatsApp salen sin
vista previa, y un comentario ni siquiera tiene una dirección propia. Esta es la primera de tres fases de
`add-share-user-actions` (`docs/05-features/sharing.md` §9): cubre lo que ya es público y ya tiene página, sin tocar
audiencias ni crear datos nuevos.

## What Changes

- Imagen del enlace, metadatos y botón Compartir en la **reseña**, la **lista**, el **Camino**, la **colección** y la
  **huella de gusto** de un perfil, con las mismas reglas de la base: se calcula como visitante anónimo y lo que un
  anónimo no ve se comparte con la imagen genérica.
- El dueño también ve el botón en `/me/lists/<id>`, `/me/caminos/<id>` y `/me/collection`, porque esas son las páginas
  a las que llega: la vista pública lo redirige. Solo aparece si lo suyo es público; el flujo "Hacer pública y
  compartir" llega en la Fase 2.
- **Página nueva `/comment/<id>`**: dirección propia de un comentario raíz, con su cita, autor, objeto comentado e
  imagen propia, y "Ver la conversación". Un enlace con ancla no puede llevar imagen: el servidor no ve el ancla. Una
  respuesta redirige a su raíz.
- Botón Compartir en cada comentario raíz de artista, álbum y canción.
- `?thread=<raíz>` deja de ser exclusivo de artistas: álbum y canción también traen y muestran ese comentario, aunque
  no esté en la primera página.
- Medición: seis tipos nuevos de objeto en `share_event` (migración `0080`); al eliminar una cuenta se borran también
  los eventos de lo que era suyo.
- **Corrección de un hueco de moderación:** la vista ajena de una lista o un Camino hoy no filtra `moderation_status`,
  así que uno oculto se lee con la URL directa. Pasa a responder `404`.
- Documentación: `sharing.md` registra la división en fases y las decisiones de detalle; `business-rules.md` deja de
  decir que valoraciones y comentarios tienen audiencia propia (el código nunca la tuvo).

Fuera de esta fase: páginas de relación, compartir valoraciones y escuchas, "Hacer pública y compartir" y la descarga
privada del dueño (Fase 2); formato Historia, ofrecimiento en momentos clave y menús ⋯ (Fase 3).

## Capabilities

### New Capabilities

- `comment-permalink`: página propia de un comentario raíz (`/comment/<id>`), visibilidad, redirección de respuestas y
  enlace a la conversación.

### Modified Capabilities

- `share-images`: imágenes de reseña, comentario, lista, Camino, colección y huella; cita y nota en el marco.
- `share-sheet`: el botón llega a las páginas nuevas, a las de gestión del dueño y a cada comentario raíz.
- `share-events`: tipos nuevos de objeto y borrado con la cuenta de lo que era suyo.
- `lists`: la vista ajena no muestra una lista oculta por moderación.
- `camino`: la vista ajena no muestra un Camino oculto por moderación.

## Impact

- **Base de datos:** migración `0080` (solo reemplaza el `CHECK` de `target_kind`). Sin tablas nuevas.
- **Código:** `src/lib/share/kinds.ts`, `src/services/share/` (objetivos nuevos, cita y nota en el marco), ruta nueva
  `src/app/[locale]/comment/[commentId]/`, lectura del comentario en `src/services/social.ts`,
  `src/components/social/Comments.tsx`, páginas de reseña, lista, Camino, colección y huella, `account-lifecycle.ts`,
  `src/services/lists/lists.ts`, `src/services/camino/camino.ts`.
- **API:** `GET /api/share/image/[kind]/[ref]` y `POST /api/share/events` aceptan los tipos nuevos.
- **Dependencias:** ninguna.
- **Docs:** `sharing.md`, `business-rules.md`, `04-api/contracts.md`, `03-data/sql-model.md`.
