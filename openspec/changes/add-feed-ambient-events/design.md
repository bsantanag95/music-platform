## Context

`redefine-content-hierarchy` D9 — tier 4 "ambiente / automático": seguir artista, seguir
usuario, entrada de colección física. Tratamiento admitido: "agrupación agresiva **o fuera
del feed principal**". `rework-feed-tiers` dejó `feedEntryTier` con la rama `4` sin fuente
y el escenario "los eventos ambiente (tier 4) no aparecen en el feed en esta versión".

Estado actual:

- `network-convergence` y `profile-in-rotation` son el precedente de "superficie calculada
  bajo demanda para el feed/perfil": `cache()` por request, sin tabla materializada, sin
  endpoint ni fetcher, la sección devuelve vacío y no se renderiza.
- `/me/feed` (`page.tsx`) resuelve `listFeed` + `listFeedAuthors` + `getNetworkConvergence`
  y monta `<NetworkConvergence>` (panel superior) + `<FeedList>` (listado cronológico
  cliente con paginación incremental).
- Tablas: `artist_follow` (`user_id`, `artist_id`, `created_at`; **sin audiencia**),
  `user_follow` (`follower_id`, `followed_id`, `status` `pending|accepted`, `created_at`,
  `updated_at`), `collection_entry` (`user_id`, `release_group_id`, `format`, `note`,
  `audience`, `created_at`). Las tres con índice por `user_id` / `created_at`.
- `app_user.profile_visibility` ∈ `public | private`.
- La sección "Exploración" del perfil (`add-artist-following`) ya muestra los
  `artist_follow` de un perfil **sin filtrado por audiencia** (la relación usuario→artista
  no tiene audiencia; información de bajo riesgo).

## Goals / Non-Goals

**Goals:**

- Una franja compacta al pie de `/me/feed` con los eventos ambiente recientes de la red
  del lector, agrupados por autor y tipo (una línea por persona y tipo).
- Visibilidad correcta por fuente; la actividad del propio lector nunca aparece.
- Cálculo bajo demanda (`cache()`), sin migración, sin endpoint, sin fetcher.
- Cero cambios en el listado cronológico ni en su maquinaria (`feedEntryTier`,
  `groupFeedRuns`, `FeedEntry`, `FEED_KINDS`, `/api/me/feed`).
- Ventana y topes como constantes con nombre.

**Non-Goals:**

- Interleaving de los eventos ambiente en el listado cronológico (se eligió la franja
  aparte).
- Notificaciones ("Ana te empezó a seguir" en vivo) — es otra superficie.
- Eventos de "dejar de seguir" o "quitar de la colección" — solo altas.
- Agrupar entre autores ("Ana y Beto siguieron a Radiohead") — eso es convergencia, otra
  feature. Acá el agrupado es **por autor**.
- Paginación de la franja o endpoint REST.
- Mostrar el evento de seguir a un perfil **privado** que el lector no sigue.

## Decisions

### D1 — Franja aparte, al pie, de-enfatizada

`<FeedAmbientStrip>` se renderiza en `page.tsx` **debajo de `<FeedList>`**. Es la posición
de coda: la actividad ambiente se alcanza tras el listado principal, no compite por la
atención. Visualmente menor —encabezado chico, texto muted `font-data`, sin celda de
carátula—. Si no hay eventos, devuelve `null` (sin encabezado ni hueco), como
`NetworkConvergence`.

*Alternativa descartada:* interleaving en el stream cronológico con filas tier 4 mínimas.
Obliga a tocar `FeedEntry` / `feedEntryTier` / `groupFeedRuns` / `FEED_KINDS` / el endpoint
y a modificar dos requirements grandes de `activity-feed`. La franja aparte entrega el
mismo valor con una superficie nueva y acotada.

### D2 — Tres fuentes, agrupación por autor y tipo

`getFeedAmbientEvents(viewerId)` (`src/services/feed/ambient.ts`), `cache()`:

1. Seguidos con relación aceptada del lector menos bloqueados → `followeeIds`. Vacío →
   `{ groups: [] }`.
2. `cutoff = now - AMBIENT_WINDOW_DAYS` (14).
3. Tres consultas en paralelo, cada una acotada a `user_id ∈ followeeIds` y
   `created_at >= cutoff`:
   - **`artist_follow`** join `artist` → `{ authorId, author…, artistId, artistName, at }`.
     Sin filtro de audiencia (público implícito).
   - **`user_follow`** (`follower_id ∈ followeeIds`, `status = 'accepted'`,
     `updated_at >= cutoff`) join `app_user` (followed) → `{ authorId, author…,
     followedUsername, followedDisplayName, at }`. **Filtro**: `followed.profile_visibility
     = 'public'` **o** el lector sigue a `followed` con relación aceptada; `followed.id <>
     viewerId`; sin bloqueo lector↔`followed`. Fecha = `updated_at` (cuándo pasó a
     `accepted`).
   - **`collection_entry`** (`audience IN ('followers','public')`) join `release_group` →
     `{ authorId, author…, releaseGroupId, releaseTitle, format, at }`.
4. Agrupar cada fuente **por `authorId`** en un `AmbientGroup`:

```ts
interface AmbientGroup {
  kind: "follow-artist" | "follow-user" | "collection";
  author: { username: string; displayName: string | null };
  count: number;                 // total de ítems de ese autor y tipo
  sample: { label: string; href: string | null }[];  // hasta AMBIENT_SAMPLE (3)
  lastAt: string;                // ISO, el más reciente del grupo
}
```

   `sample` ordenado por fecha desc; `label`/`href` = nombre de artista + `/artist/{id}`,
   username + `/users/{username}`, o título de álbum + `/album/{id}`.
5. Todos los grupos juntos, ordenados por `lastAt` desc, cortados a `AMBIENT_MAX_GROUPS`
   (8). Devuelve `{ groups }`.

Constantes con nombre en el módulo: `AMBIENT_WINDOW_DAYS = 14`, `AMBIENT_SAMPLE = 3`,
`AMBIENT_MAX_GROUPS = 8`.

### D3 — `user_follow`: solo objetivos que el lector ya podría ver

Mostrar "Ana empezó a seguir a Beto" solo cuando el lector **ya tiene forma de ver a
Beto**: perfil público, o relación de seguimiento aceptada lector→Beto. Si Beto es privado
y el lector no lo sigue, el evento se omite (el lector lo vería igual desde la actividad de
Beto si lo siguiera). El objetivo nunca es el propio lector (ese caso es "Ana te empezó a
seguir", territorio de notificación, fuera de alcance). Bloqueo lector↔objetivo lo excluye.

*Alternativa descartada:* mostrar todos los follows de los seguidos sin mirar al objetivo.
Filtra de menos: expone la existencia de perfiles privados y a quién sigue alguien de forma
más amplia de lo que el producto muestra hoy.

### D4 — Presentación: una línea por grupo, verbo por tipo

`<FeedAmbientStrip>` (Server Component). Encabezado `t("ambient.title")` ("También en tu
red"). Por grupo, una línea `font-data text-xs` muted:

- `follow-artist`: `{autor} · {t("ambient.followedArtists", { names, count })}` →
  "siguió a Radiohead, Pink Floyd y 2 más".
- `follow-user`: `{autor} · {t("ambient.followedUsers", { names, count })}` →
  "empezó a seguir a @beto y @juan".
- `collection`: `{autor} · {t("ambient.addedToCollection", { titles, count })}` →
  "sumó Rumours y Tusk a su colección".

`{names}`/`{titles}` = hasta `AMBIENT_SAMPLE` labels enlazados unidos con coma; cuando
`count` supera la muestra, `t("ambient.andMore", { count })` ("y N más"). El autor enlaza a
su perfil. Sin carátula, sin fecha por ítem (un solo marcador `lastAt` relativo por línea,
opcional). Sin insignias ni contadores destacados.

### D5 — Sin tocar el listado cronológico

`FeedEntry`, `FEED_KINDS`, `feedEntryTier`, `groupFeedRuns`, `FeedActivityList`,
`/api/me/feed` y sus tests quedan **exactamente igual**. La rama `4` de `feedEntryTier`
sigue sin fuente en el stream cronológico y su docstring ya la describe como "todavía NO
llega al feed [cronológico]". La franja es la realización del tier 4 como superficie
separada.

## Risks / Trade-offs

- **[Tres consultas más en el render de `/me/feed`]** → Cada una acotada a 14 días y a los
  seguidos; índices por `(user_id, created_at)`. `cache()` evita recomputar. Se suman al
  `Promise.all` existente, sin serializar.
- **[La franja al pie puede no verse si el feed es largo]** → Es deliberado (D1): la
  actividad ambiente es de-enfatizada. Está en el HTML inicial; quien recorre el feed la
  encuentra.
- **[`user_follow` y privacidad]** → D3 filtra a objetivos que el lector ya podría ver. No
  se expone nada nuevo, solo se agrupa. Los follows a perfiles privados no seguidos no
  aparecen.
- **[Cuarta superficie "en rotación"-like: convergencia, pico, rotación de perfil, y ahora
  ambiente]** → La franja ambiente tiene copy y forma propios ("También en tu red",
  agrupado por autor, verbos de seguimiento/colección) y vive al pie, no compite.
- **[La colección física es contenido curatorial, quizá merece más que una línea]** →
  Fase 1: se trata como ambiente (tier 4, según D9). Si con uso real la colección pide más
  presencia, se promueve en un cambio posterior.

## Migration Plan

Sin migración. Servicio y componente aditivos; si `getFeedAmbientEvents` fallara, la franja
no se renderiza (o su boundary la aísla). Rollback = revertir el commit. Sin feature flag:
la franja solo aparece con eventos recientes de la red.

## Open Questions

- **OQ1 — ¿Ventana de 14 días, o alinear con la convergencia/pico en 7? → RESUELTA: 14.**
  Los eventos de seguimiento y colección son mucho más escasos que las escuchas; 7 días
  dejaría la franja casi siempre vacía. Constante ajustable.
- **OQ2 — ¿La franja va al pie (debajo de `FeedList`) o como bloque colapsable arriba? →
  RESUELTA: al pie** (D1). Es la posición de de-énfasis que corresponde al tier 4.
- **OQ3 — ¿La entrada de colección muestra el formato (vinilo/CD/cassette)? → RESUELTA: no
  en la línea agrupada** (mantenerla corta); el formato está en la página de la colección
  del autor. Revisable.
