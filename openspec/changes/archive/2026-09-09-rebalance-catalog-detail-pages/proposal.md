## Why

La dirección `redefine-content-hierarchy` (Fase 1) establece que **el álbum es la unidad
cultural central**. El perfil ya lo refleja (álbumes favoritos, "en rotación"). Falta el
otro lado: las **páginas de detalle del catálogo** todavía tratan artista, álbum y canción
como destinos de peso equivalente, con el mismo bloque social (rating de estrellas +
reseñas + comentarios) en los tres. En canción eso empuja a un juicio crítico de 5
estrellas que no describe bien el vínculo de hábito; en artista, un "rating de artista"
tiene poco sentido y la discografía queda enterrada bajo membresías y acciones sociales.

## What Changes

- **Página de canción mínima** (D6): la canción sigue siendo entidad real pero su página es
  ligera y **lidera con el/los álbum(es) que la contienen**. Deja de tener el bloque social
  completo. Muestra: título + artista acreditado, álbum(es) contenedores (prominente), tu
  historial de escuchas de esa canción, y una **reacción agregada pública**
  (`liked / loved / obsessed / neutral / disliked`).
- **Rating de canción degradado a secundario** (D5): en canción, la expresión primaria es
  la **reacción cualitativa** (que ya se registra desde el diario). Las **estrellas quedan
  detrás de un control "más"** — opcionales, no protagonistas. No se elimina el rating de
  canción del modelo; se le baja el volumen en la presentación.
- **Página de artista reordenada a "discografía-forward"**: la **discografía agrupada sube
  justo debajo del encabezado**, antes de membresías y de cualquier acción social. El
  artista se lee por su obra.
- **Opinión sobre artista reformulada como nota / contexto** (sin veredicto): en artista se
  **retira el control de estrellas y el agregado de estrellas**. Los comentarios se
  conservan, presentados como "nota / contexto / empezá por aquí", no como reseña con
  rating.
- **El álbum no cambia**: las estrellas y la reseña siguen siendo primarias en la página de
  álbum (ya resuelto por `add-album-review`). Este cambio solo verifica que no hay
  regresión.
- **Sin migración**: `rating` sigue aceptando objetivos de artista y canción; solo cambia
  qué se renderiza. Los ratings de artista/canción existentes se conservan (dato intacto,
  presentación distinta).

## Capabilities

### New Capabilities

- `catalog-song`: la página de detalle de canción — su alcance mínimo (D6), el
  protagonismo del/los álbum(es) contenedores, el historial de escuchas propio, la reacción
  agregada pública, y el rating de estrellas como control secundario detrás de una
  divulgación ("más").

### Modified Capabilities

- `catalog-artist`: la página se reordena a discografía-forward (discografía debajo del
  encabezado, antes de membresías y acciones); la opinión sobre el artista se reformula
  como nota/contexto sin estrellas ni agregado de rating.

## Impact

- **Nuevo** `src/services/catalog/recording-reactions.ts` — resumen de reacciones públicas
  de una canción (`GROUP BY reaction` sobre `listen_entry` con `audience = 'public'`). Sin
  esquema nuevo.
- **Nuevo** `src/services/diary/recording-history.ts` (o método en `diary.ts`) — historial
  de escuchas propias de una canción para el usuario en sesión.
- **Reescrito** `src/app/[locale]/(catalog)/song/[id]/page.tsx` — layout mínimo; sin
  `SocialSection` completo; nuevo `SongReactions` + `SongListenHistory` + `SongStarDisclosure`.
- **Reordenado** `src/app/[locale]/(catalog)/artist/[id]/page.tsx` — discografía primero;
  `SocialSection` de artista sin `DualRating` (nuevo prop o variante), comentarios como
  "notas".
- **Componentes**: `src/components/social/DualRating.tsx` gana una variante/omisión para
  artista; nuevos componentes de canción en `src/components/catalog/`.
- **Zod**: `RecordingReactionSummarySchema`, `RecordingListenHistorySchema` en
  `src/lib/api/schemas.ts`. Endpoints opcionales `GET /api/songs/[id]/reactions` para
  paridad (a decidir en design).
- **i18n**: `messages/{es,en}/catalog.json` (`song.*`, `artist.*`).
- **Docs**: `docs/05-features/` (páginas de catálogo), `docs/04-api/contracts.md` si se
  añaden endpoints.
- Sin cambios en `rating`, `listen_entry`, `comment`, `review` ni el feed.
