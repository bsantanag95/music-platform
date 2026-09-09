## Why

El feed distingue hoy dos pesos: **con texto** (comentario, escucha con nota) vs. **de sola
presencia** (favorito, lista, rating, escucha sin nota). Eso mezcla en un mismo bucket
señales de valor muy distinto: un rating de álbum sin texto pesa igual que un favorito de
canción o una escucha suelta. La dirección `redefine-content-hierarchy` (D9, Fase 2) define
una **jerarquía de 4 tiers** por intención (entidad + tipo de acción), y trae la **reseña de
álbum** al feed como el acto expresivo de primer nivel que hoy falta.

## What Changes

- **Modelo de presentación de 4 tiers** (reemplaza el criterio binario "con texto / sola
  presencia"):
  1. **Expresivo** — comentario · escucha con nota · **reseña de álbum** · evento de lista.
     Cita/panel, nunca colapsa.
  2. **Señal de opinión** — rating de **álbum** sin texto · favorito de **álbum**. Fila con
     carátula y la marca de valoración/favorito prominente; agrupación leve (3+).
  3. **Presencia cotidiana** — rating de **canción** · favorito de **canción o artista** ·
     escucha sin nota · reacción. Fila mínima de baseline; corridas de 3+ se colapsan.
  4. **Ambiente** — seguir artista · seguir usuario · entrada de colección física.
     **Reservado**: estos eventos todavía NO se muestran en el feed principal; el tier se
     define ahora y los eventos llegan con sus propios cambios.
- **La reseña de álbum entra al feed** como fuente nueva (tier 1): autor + álbum + título
  opcional + cuerpo + fecha de última edición. `kind=review` se suma al filtro por tipo.
- **El tier depende de si el objetivo es álbum o canción**: un rating de álbum es tier 2, el
  mismo rating sobre una canción es tier 3; ídem favoritos.
- **Agrupación por tier**: tier 1 nunca colapsa; tier 2 colapsa corridas de 3+ del mismo
  tipo y autor en una fila leve; tier 3 mantiene el colapso actual.
- **Sin cambios** en el alcance de audiencia/bloqueo/perfil, ni en la paginación, ni en los
  filtros `q` / `authorId`.

## Capabilities

### Modified Capabilities

- `activity-feed`: el alcance del feed suma la **reseña de álbum** como fuente; la
  jerarquía de presentación pasa de dos pesos a **cuatro tiers** por intención, con reglas
  de agrupación por tier y el tier 4 reservado para eventos ambiente que aún no se surfacean.

## Impact

- **`src/services/feed/feed.ts`**: nueva fuente `review` en `listFeed` (mismo patrón que
  `comment` — sin audiencia, filtrado por visibilidad de perfil + bloqueo); `FEED_KINDS`
  suma `"review"`; `listMyRecentActivity` puede sumar `review` (a decidir en design).
- **`src/lib/api/schemas.ts`**: `FeedReviewSchema` en la unión `FeedEntrySchema`
  (y opcionalmente `RecentActivityEntrySchema`).
- **`src/components/feed/`**: `feed-entry-weight.ts` → `feed-entry-tier.ts`
  (`feedEntryTier(entry): 1 | 2 | 3 | 4`); `feed-grouping.ts` pasa a agrupar por tier;
  `FeedActivityList.tsx` mapea tier → tratamiento; `FeedList.tsx` (clamp) sin cambio de
  contrato. Nueva fila de reseña.
- **i18n** `messages/{es,en}/feed.json` (verbo "reseñó", encabezado de cita de reseña).
- **Docs** `docs/05-features/activity-feed.md`.
- **Fuera de alcance (cambios propios):** los eventos tier 4 en el feed
  (`add-feed-ambient-events` o equivalente); el **pico de rotación** (`add-feed-rotation-peak`);
  la **convergencia de la red** (`add-network-convergence`).
