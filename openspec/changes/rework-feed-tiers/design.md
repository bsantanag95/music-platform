## Context

El feed clasifica hoy cada entrada con un criterio binario (`isFeedEntryWithText`): "con
texto" (comentario, escucha con nota) → cita; "de sola presencia" (favorito, lista, rating,
escucha sin nota) → fila de baseline. `groupAmbientRuns` colapsa corridas de 3+ de sola
presencia del mismo tipo y autor.

`redefine-content-hierarchy` D9 define una jerarquía de **4 tiers** por intención:

| Tier | Contenido | Tratamiento |
|---|---|---|
| 1 Expresivo | reseña de álbum · escucha con nota · comentario · evento de lista | cita/panel, nunca colapsa |
| 2 Señal de opinión | rating de álbum sin texto · favorito de álbum | fila con carátula, marca de opinión prominente, colapso leve |
| 3 Presencia cotidiana | rating de canción · favorito de canción/artista · escucha sin nota · reacción | fila mínima, colapso de 3+ |
| 4 Ambiente | seguir artista · seguir usuario · colección física | agrupación agresiva o fuera del feed principal |

Estado actual de las fuentes: `listFeed` compone `listen` / `favorite` / `list` / `rating`
/ `comment`. La **reseña** (`review`, capability `album-review`) NO está en el feed. Los
eventos de seguimiento y colección tampoco.

## Goals / Non-Goals

**Goals:**

- Reemplazar el criterio binario por `feedEntryTier(entry): 1 | 2 | 3 | 4`.
- Traer la **reseña de álbum** al feed como fuente tier 1.
- Diferenciar tier 2 vs tier 3 por objetivo (álbum vs canción) para rating y favorito.
- Agrupación por tier: tier 1 nunca; tier 2 corridas de 3+; tier 3 como hoy.
- Definir el tier 4 en la spec, **sin** surfacearlo todavía en el feed principal.
- No tocar audiencia / bloqueo / paginación / filtros `q` / `authorId`.

**Non-Goals:**

- Eventos tier 4 en el feed (seguir artista/usuario, colección) → cambio propio.
- Pico de rotación (`add-feed-rotation-peak`) y convergencia de red
  (`add-network-convergence`).
- Rediseño visual de la fila de baseline, de la cita o del meter de rating — se conservan.
- Cambiar `listMyRecentActivity` más allá de, opcionalmente, incluir `review` propio.
- Deduplicar "reseñó" + "valoró" del mismo autor/álbum (ver OQ2).

## Decisions

### D1 — `feedEntryTier(entry)` reemplaza `isFeedEntryWithText`

`src/components/feed/feed-entry-weight.ts` pasa a `feed-entry-tier.ts` con:

```ts
export function feedEntryTier(entry: FeedEntry): 1 | 2 | 3 | 4 {
  switch (entry.kind) {
    case "review":  return 1;
    case "comment": return 1;
    case "list":    return 1;
    case "listen":  return hasNote(entry) ? 1 : 3;
    case "rating":  return entry.target.type === "release-group" ? 2 : 3;
    case "favorite":return entry.target.type === "release-group" ? 2 : 3;
    // tier 4 (follow*, collection) todavía no llega al feed
  }
}
```

`hasNote(entry) = entry.body != null && entry.body.trim() !== ""`. Se mantiene un helper
`isFeedEntryQuote(entry)` = `feedEntryTier(entry) === 1 && (kind comment | listen-with-note
| review)` para el ramo de cita (los eventos de lista son tier 1 pero no cita — fila de
título). La reacción de una escucha NO promueve de tier (sigue siendo tap, no texto).

### D2 — La reseña entra al feed (tier 1)

Nueva fuente `review` en `listFeed`, patrón idéntico a `comment`:

- `select` de `review` join `appUser` + `releaseGroup` (solo objetivo álbum), con
  `inArray(review.userId, authorIds)` + `BLOCKED_SQL` + `titleSearchCondition` sobre el
  álbum; sin filtro de audiencia (la reseña no tiene columna de audiencia, igual que
  rating/comment — la pertenencia a `authorIds` = relación aceptada ya cubre perfiles
  privados).
- Orden por `review.updatedAt desc` (refleja la edición vigente).
- **Una entrada por (usuario, álbum)**: `review` tiene índice único parcial por objetivo,
  así que naturalmente hay una sola reseña vigente — igual que el rating, no como el
  comentario. La entrada del feed refleja el estado vigente y su `updated_at`.
- `FEED_KINDS` suma `"review"` → el filtro `kind=review` funciona por el mismo camino.

`FeedReview` payload: `{ kind: "review", id, title: string | null, body: string, createdAt
(= updatedAt ISO), target (release-group, con artistName y coverThumbUrl), author }`.

### D3 — Presentación por tier en `FeedActivityList`

`FeedActivityList` deja de bifurcar por `isFeedEntryWithText` y bifurca por
`feedEntryTier`:

- **Tier 1 cita** (comentario / escucha con nota / reseña): la cita actual (borde
  izquierdo, sin caja). La **reseña** usa el mismo tratamiento de cita en redonda que el
  comentario (no es voz personal como la nota de escucha), con el **título de la reseña**
  —cuando existe— como metadato secundario junto al autor (mismo criterio que la vista de
  álbum: título "no protagonista pero con valor agregado", `add-album-review`). El clamp de
  6 líneas de `/me/feed` aplica al cuerpo de la reseña igual que a comentario/nota.
- **Tier 1 no-cita** (evento de lista): fila de título como hoy.
- **Tier 2** (rating/favorito de álbum): fila con celda de carátula; para rating, el meter
  de acento + valor; para favorito, una marca de favorito. Es la fila de baseline actual —
  el "tier 2" se distingue del 3 por **agruparse solo en corridas de 3+** y por conservar
  la celda de carátula prominente (un álbum siempre tiene contexto visual).
- **Tier 3** (rating/favorito de canción/artista, escucha sin nota): la fila mínima actual;
  reacción en la misma fila si la hay.
- **Tier 4**: no se renderiza (no llega al feed en este cambio).

La diferencia visual tier 2 ↔ tier 3 en Fase 2 es **de agrupación y de énfasis de la
marca**, no un rediseño de fila. Mantener la superficie estable; el valor está en que una
racha de ratings de canción se pliega y una de ratings de álbum no.

### D4 — Agrupación por tier (`feed-grouping.ts`)

`groupAmbientRuns` pasa a `groupFeedRuns`:

- **Tier 1**: nunca se agrupa; corta cualquier corrida.
- **Tier 2**: corridas de **3+** consecutivas del **mismo `kind`** (`rating` o `favorite`)
  y **mismo autor** → fila agrupada leve (autor + cantidad + títulos enlazados, un
  marcador de tiempo). Igual mecánica que hoy, aplicada a tier 2.
- **Tier 3**: corridas de **3+** consecutivas del mismo `kind` (`listen` sin nota,
  `rating`, `favorite`) y mismo autor → fila agrupada (como hoy).
- Una entrada de un tier distinto corta la corrida.

`GROUP_MIN = 3` se mantiene para ambos tiers. La distinción es que tier 2 agrupado se
presenta con un poco más de peso (mantiene mención de carátulas si el layout lo permite) —
detalle de implementación, no de spec.

### D5 — Tier 4 reservado, no surfaceado

La spec define el tier 4 y qué eventos le corresponden, y afirma que **en esta versión el
feed principal NO incluye** seguir artista, seguir usuario ni entradas de colección. Así el
modelo de 4 tiers queda completo y documentado, y los cambios que agreguen esas fuentes
(`add-feed-ambient-events` o equivalentes) solo tienen que "encender" el tier 4 sin
re-litigar la jerarquía.

### D6 — `listMyRecentActivity` (rastro reciente propio)

Hoy incluye `listen` / `rating` / `comment`. Se suma `review` (tu propia reseña es tu
actividad reciente, tier 1). `favorite` / `list` siguen fuera (decisión previa de esa
superficie, no se toca). `RecentActivityEntrySchema` suma `FeedReviewSchema`.

## Risks / Trade-offs

- **[MODIFIED de un requisito de spec muy grande]** → "Jerarquía de presentación del feed"
  tiene ~18 escenarios. El delta reproduce el requisito completo cambiando solo el párrafo
  "Peso de entrada" por el modelo de 4 tiers y ajustando 2-3 escenarios; el resto (anatomía
  de fila, rating, fecha, rastro reciente, solo lectura) se conserva textual.
- **[La reseña y el rating del mismo autor sobre el mismo álbum aparecen como dos filas]**
  → Aceptado en Fase 2 (OQ2). La reseña ya lleva las estrellas embebidas en su edición
  (`add-album-review`), así que a futuro se puede suprimir la fila de rating cuando existe
  reseña del mismo autor/álbum — se difiere para no complicar el merge de fuentes ahora.
- **[Diferencia visual tier 2 ↔ tier 3 sutil]** → En Fase 2 la diferencia es sobre todo de
  agrupación. Si con datos reales se ve que necesita más contraste visual, es un ajuste de
  componente sin tocar spec ni modelo.
- **[Coste de una query más en `listFeed`]** → `review` es una fuente más en el `Promise.all`
  existente; volumen chico (una reseña por usuario/álbum). Sin impacto de arquitectura.
- **[`kind=review` en un cliente viejo]** → El enum se amplía; un cliente que no lo conozca
  simplemente no lo ofrece. La unión Zod discriminada tolera el nuevo `kind` (falla
  `safeParse` solo si un cliente viejo valida contra el schema viejo — no es el caso, el
  schema vive en el repo).

## Migration Plan

Sin migración de base de datos. Todo es aditivo o de presentación. Despliegue directo; si
la fuente `review` fallara, el `Promise.all` de `listFeed` propaga el error como cualquier
otra fuente (mismo comportamiento actual). Rollback = revertir el commit.

## Open Questions

- **OQ1 — ¿La reseña entra al feed ahora? → RESUELTA: sí, en esta fase, como acción
  expresiva tier 1.** No depende conceptualmente de los eventos tier 4 (señales ambiente).
  `review` ya existe, tiene relación clara con usuario/álbum, se ordena por `updatedAt` y su
  presentación es similar a un comentario — fuente de bajo riesgo. Los eventos tier 4 se
  incorporan después.
- **OQ2 — ¿Se deduplica "reseñó ★4" + "valoró ★4" del mismo autor/álbum? → RESUELTA: no en
  Fase 2.** Se muestran ambos eventos. Deduplicar bien requiere definir reglas
  (¿la reseña siempre reemplaza al rating? ¿solo con el mismo valor? ¿qué pasa si el rating
  cambia después, o si la reseña se edita o borra?). La jerarquía ya mitiga: la reseña
  (tier 1) recibe más protagonismo que el rating. Suprimir la fila de rating cuando existe
  reseña del mismo autor/álbum queda como refinación posterior, con datos reales.
