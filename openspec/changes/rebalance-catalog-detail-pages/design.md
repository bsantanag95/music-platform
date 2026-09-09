## Context

`redefine-content-hierarchy` decidió (D5, D6, proposal §"Modified Capabilities") que en
Fase 1 se rebalanceen las páginas de detalle para que el álbum sea la unidad central.

Estado actual:

- **Canción** (`src/app/[locale]/(catalog)/song/[id]/page.tsx`): encabezado con
  `variantType` + duración, luego `MarkAsListened` / `FavoriteButton` / `AddToListButton`,
  luego créditos (lista completa), apariciones (todas las ediciones), y `SocialSection`
  completo (`DualRating` de estrellas + `Comments`). Los álbumes aparecen enterrados en la
  sección "apariciones".
- **Artista** (`.../artist/[id]/page.tsx`): `ArtistHeader` → acciones → `ArtistMemberships`
  → `AlbumGrid` (discografía) → `SocialSection` con `DualRating`. La discografía va cuarta.
- `SocialSection` monta `DualRating` para los tres tipos de objetivo; `Reviews` solo para
  `release-group`.
- `rating` acepta objetivos `artist` / `release_group` / `recording` (triple-FK + CHECK).
  Las valoraciones **no tienen audiencia** (siempre visibles).
- `listen_entry.reaction` ∈ `liked | loved | obsessed | neutral | disliked | null`, con
  `audience` propia (`private | followers | public`).
- No existe servicio de "reacción agregada" ni de "historial de escuchas de una canción
  para el usuario".

## Goals / Non-Goals

**Goals:**

- Página de canción **mínima** que lidera con el/los álbum(es) contenedores.
- Reacción cualitativa como expresión primaria en canción; estrellas detrás de "más".
- Reacción **agregada pública** visible en la canción.
- Historial de escuchas propio de esa canción (para el usuario en sesión).
- Página de artista **discografía-forward**; opinión de artista como nota/contexto, sin
  estrellas.
- Cero migración, cero borrado de datos, cero cambio en el feed.

**Non-Goals:**

- "Seguir artista" (`artist-following`) — Fase 2.
- Re-crear la spec archivada `ratings-and-comments` completa — este cambio captura solo lo
  que se ve en las páginas de canción y artista.
- Tocar la página de álbum (ya la resolvió `add-album-review`); solo se verifica no
  regresión.
- Quitar del modelo el rating de canción o de artista — se conserva, solo se despresenta.
- Endpoints nuevos con mutación — la reacción se edita desde el diario, no desde la canción.
- Agregado de reacción que respete `followers` para seguidores — Fase 1 muestra solo el
  agregado **público** (más simple, sin lógica de relación en una página de catálogo).

## Decisions

### D1 — `catalog-song` es capability nueva, no una modificación

No hay spec de presentación de la página de canción (solo `catalog-recording-ingestion`,
que es ingesta). Se crea `catalog-song` con el alcance mínimo. Así el contrato de "qué es
una página de canción" queda explícito y testeable.

### D2 — Layout de la página de canción (D6)

Orden vertical:

1. **Breadcrumbs** (Inicio › Artista › Álbum principal › Canción) — sin cambio.
2. **Encabezado**: título + artista acreditado (link). La etiqueta de variante
   (`re_recording` / `remix` / `live`) se mantiene pero como metadato pequeño, no como
   eyebrow protagonista.
3. **Álbum(es) que la contienen** — bloque **prominente**, primera sección: tarjetas de
   álbum (carátula + título + año) enlazando a `/album/{id}`, ordenadas por
   `first_release_date`. Si la canción aparece en varios, se listan todos; el primero (más
   temprano, de estudio si aplica) se marca como "aparición principal".
4. **Acciones**: `MarkAsListened` (primaria, "Registrar escucha"), `FavoriteButton`,
   `AddToListButton`.
5. **Tu historial de escuchas** — solo si hay sesión y ≥1 escucha propia de esta canción:
   lista compacta de fechas + contexto + reacción propia. Enlaza a `/me/diary` filtrado.
6. **Reacción de la comunidad** — el agregado público (ver D4).
7. **Comentarios** — `Comments` se conserva (nota conversacional corta, ya existe para
   `recording`). **No** `DualRating`, **no** `Reviews`.
8. **Créditos** y **apariciones completas** (todas las ediciones) — al final, plegados
   o como sección secundaria de "ficha técnica". No son el foco.

### D3 — Estrellas de canción detrás de una divulgación ("más")

El control de estrellas de canción vive dentro de un `<details>` ("Añadir una valoración de
estrellas") **colapsado por defecto**, debajo de la reacción de la comunidad. Reusa la
lógica de `DualRating` (guardar/borrar rating de `recording`) en un envoltorio nuevo
`SongStarDisclosure` — no se duplica la llamada a la API, solo la presentación. Si el
usuario ya tiene estrellas puestas, el `<details>` arranca abierto (no ocultar un dato que
ya existe).

*Alternativa descartada:* quitar del todo las estrellas de canción. Es irreversible y hay
usuarios que las quieren (D5 del roadmap); primero se prueba la degradación.

### D4 — Reacción agregada pública de la canción

Nuevo `getRecordingReactionSummary(recordingId)` en
`src/services/catalog/recording-reactions.ts`:

```
SELECT reaction, count(*)::int AS n
FROM listen_entry
WHERE recording_id = $1 AND audience = 'public' AND reaction IS NOT NULL
GROUP BY reaction
```

Devuelve `{ total, byReaction: Record<ListenReaction, number>, top: ListenReaction | null }`.
Se muestra como una línea de tono cultural: *"9 personas la registraron · sobre todo
**obsessed**"* — **sin** porcentajes ni gráfico, coherente con "En rotación" y con el
principio de no-gamificación. Si `total === 0`, la sección no se renderiza.

Módulo separado de `diary.ts` para no arrastrar el import-set del diario a la página de
canción y para dejar claro que es lectura agregada, no del diario personal.

### D5 — Historial de escuchas propio de la canción

Nuevo `listMyListensForRecording(userId, recordingId)` (en `diary.ts`, junto a
`listMyDiary`): las entradas de diario propias cuyo `recording_id` es esta canción,
ordenadas por fecha desc, con `listenContext`, `reaction`, `audience`, `body`. Se renderiza
solo con sesión y ≥1 entrada. Es "tu relación con la canción" en un vistazo, y la razón por
la que la canción sigue siendo entidad real.

### D6 — Página de artista: discografía-forward

Nuevo orden en `artist/[id]/page.tsx`:

1. Breadcrumbs.
2. `ArtistHeader` (foto/monograma, nombre, tipo, bio).
3. **`AlbumGrid` (discografía agrupada)** — sube de cuarto a segundo. Es la identidad del
   artista.
4. Acciones: `MarkAsListened` / `FavoriteButton` / `AddToListButton`.
5. `ArtistMemberships` (integrantes / bandas).
6. **Notas de la comunidad** — `Comments` reencuadrado (ver D7). **No** `DualRating`.

La spec `catalog-artist` "Discografía agrupada" no fija su posición relativa; este cambio
añade un requisito de **orden** (discografía antes que membresías y que la opinión).

### D7 — Opinión de artista como nota/contexto, sin estrellas

- `SocialSection` recibe un prop `mode: "full" | "notes"` (o el artista deja de usar
  `SocialSection` y monta `Comments` directo). En modo `notes`: **no** `DualRating`, **no**
  agregado de estrellas; el encabezado y el placeholder del editor de comentarios usan
  copy de "nota / contexto / empezá por aquí" (`catalog.artist.notesHeading`,
  `notesPlaceholder`).
- El endpoint de rating de artista **sigue existiendo** (no se rompe el modelo ni datos
  viejos); simplemente la página no lo expone. Un rating de artista creado antes queda
  inerte en la UI pero intacto en la BD.

*Alternativa descartada:* bloquear en la API el rating de artista. Es un cambio de contrato
mayor y arriesga romper clientes/tests; la degradación de presentación es suficiente para
Fase 1.

### D8 — Todo server-rendered, sin endpoints nuevos

La reacción agregada y el historial son lectura pura; se calculan en el Server Component de
la página. La reacción se **edita desde el diario** (`MarkAsListened` → `ListenEntryForm`),
no desde la canción. No se añade `GET /api/songs/[id]/...`. Menos superficie, menos tests.

## Risks / Trade-offs

- **[Regresión para usuarios que valoran canciones con estrellas]** → Las estrellas siguen
  ahí, solo detrás de "más"; si el usuario ya valoró, el panel arranca abierto. El dato
  nunca se pierde. Es exactamente la degradación reversible que pide el roadmap.
- **[Un rating de artista viejo queda "huérfano" en la UI]** → Intacto en BD; si más
  adelante se decide mostrar algo de artista, el dato está. Documentado.
- **[La reacción agregada pública puede quedar vacía mucho tiempo]** → La sección
  simplemente no se renderiza (mismo criterio que "En rotación" / estantes del perfil). No
  es un vacío visible.
- **[Dos formas de "opinar" en canción: reacción (diario) y estrellas (catálogo)]** → Es
  deliberado y el roadmap lo asume: la reacción describe el hábito, la estrella el juicio.
  La jerarquía visual (reacción arriba, estrellas plegadas) comunica cuál es la principal.
- **[Página de canción pierde peso de SEO]** → Aceptado explícitamente en D6: la inversión
  rica va al álbum. La canción conserva título, artista, álbumes y enlaces — suficiente
  para indexar y navegar.

## Migration Plan

Sin migración de base de datos. Despliegue directo: las páginas son Server Components; si
un servicio nuevo fallara, degradar a no renderizar esa sección (no romper la página).
Rollback = revertir el commit. Los ratings de artista/canción existentes no se tocan.

## Open Questions

- **OQ1 — Ficha técnica de la canción → RESUELTA: plegada (`<details>`) por defecto.**
  Créditos completos + todas las ediciones dentro de un `<details>` colapsado al final de
  la página. Mantiene el foco en el álbum y la comunidad; los datos técnicos quedan
  accesibles para quien los busca.
- **OQ2 — Acciones del artista → RESUELTA: se conservan `MarkAsListened` y
  `FavoriteButton`** (y `AddToListButton`). Son acciones de catálogo/diario, no de opinión.
  Solo se retira el control de estrellas del artista y su agregado.
