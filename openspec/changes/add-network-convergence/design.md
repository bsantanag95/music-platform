## Context

`redefine-content-hierarchy` D9 / IQ4 define la **convergencia de la red** como la capa
"Relevante" del feed: detectar que **varias personas distintas de tu red están teniendo
una relación con la misma obra** en una ventana corta. Umbral resuelto: **≥ 3 personas
distintas de la red + misma obra + 7 días**; interacción = entrada de diario, rating,
reseña o favorito; resultado = **una sola síntesis social**, nunca filas sueltas. Ponderar
tipos de interacción entre sí queda "pendiente de afinar".

Estado actual relevante:

- `listFeed` (`src/services/feed/feed.ts`) compone el feed cronológico uniendo N fuentes
  por `Promise.all` y fusionando en memoria. Ya resuelve: seguidos con relación `accepted`
  (`user_follow`), filtro de bloqueo (`BLOCKED_SQL`), visibilidad por audiencia
  (`listen_entry`/`favorite` tienen `audience`; `rating`/`review` son públicos implícitos),
  y el artista principal acreditado (`PRIMARY_ARTIST_SQL`).
- `taste-fingerprint` (`stats.ts`) y `profile-in-rotation` (`in-rotation.ts`) son el
  precedente de "señal calculada bajo demanda para una superficie": `cache()` por request,
  sin tabla materializada, sin endpoint ni fetcher cuando nada cliente la consume, la
  sección no se renderiza si el resultado es vacío. `in-rotation.ts` también muestra el
  patrón de subquery escalar correlacionada con el nombre de tabla explícito
  (`"release_group"."id"`) para el artista.
- `listen_entry`, `favorite`, `rating`, `review`: objetivo polimórfico
  `artist_id | release_group_id | recording_id` (`CHECK num_nonnulls = 1`), cada uno con
  índice por columna de objetivo. `listen_entry`/`favorite` fechan por `created_at`;
  `rating`/`review` por `updated_at` (el valor vigente).
- `/me/feed` (`page.tsx`) es un Server Component que resuelve `listFeed` + `listFeedAuthors`
  y monta `<FeedList>` (cliente, paginación incremental contra `/api/me/feed`).

## Goals / Non-Goals

**Goals:**

- Un panel en la cabecera de `/me/feed` con hasta unas pocas obras sobre las que **≥ 3
  seguidos distintos** interactuaron en **7 días**, cada una como **una síntesis** con los
  nombres, enlazada a la obra.
- Interacción = diario / rating / reseña / favorito, contadas **por igual** en Fase 1.
- Visibilidad **idéntica al feed**; la actividad del propio lector **no cuenta**.
- Cálculo bajo demanda (`cache()`), sin tabla materializada, sin endpoint ni fetcher.
- Umbrales y ventana como constantes con nombre, calibrables sin cambio de spec.
- Cero migración, cero cambios en `listFeed` / `/api/me/feed` / esquema.

**Non-Goals:**

- **Ponderar** unos tipos de interacción más que otros (reseña > registro) — D9 lo deja
  "pendiente de afinar"; Fase 1 cuenta por igual.
- **Suprimir** del listado cronológico las entradas individuales que alimentan una
  convergencia — el panel es aditivo; la supresión es una refinación posterior.
- **Roll-up canción → álbum**: `recording` y `release-group` se cuentan como objetivos
  separados (una convergencia sobre un single es señal legítima; agregarla al álbum
  reintroduce el sesgo de género que la dirección evita).
- Panel en el preview de feed de Inicio — esa superficie ya está acotada; queda para después.
- Una pestaña "Destacado" — es un panel, no una vista nueva.
- Popularidad / tendencia global (descartada en `vision.md`).
- Notificaciones cuando se forma una convergencia.
- Paginación del panel o endpoint REST.

## Decisions

### D1 — Qué cuenta como interacción

Una fila `(user_id, objetivo, fecha)` por cada:

| Fuente | Fecha | Filtro de visibilidad |
|---|---|---|
| `listen_entry` | `created_at` | `audience IN ('followers','public')` |
| `favorite` | `created_at` | `audience IN ('followers','public')` |
| `rating` | `updated_at` | público implícito |
| `review` | `updated_at` | público implícito |

En los cuatro casos: `user_id` ∈ **seguidos con relación aceptada del lector, menos los
bloqueados en cualquier dirección** (se calcula una vez, no con `BLOCKED_SQL` repetido), y
la fecha `>= now - CONVERGENCE_WINDOW_DAYS`, y el objetivo es `release_group_id` **o**
`recording_id` no nulo (nunca `artist_id`). El `user_id` del propio lector **no** aparece
en el conjunto de seguidos, así que su actividad queda fuera por construcción.

*Alternativa descartada:* ponderar (reseña ×3, rating ×2, escucha ×1). D9 lo difiere
explícitamente; sin datos reales el peso es arbitrario. El umbral cuenta **personas
distintas**, no interacciones, así que 5 escuchas de una persona no inflan nada.

### D2 — Umbral: 3 personas distintas, ventana de 7 días

`COUNT(DISTINCT user_id) >= CONVERGENCE_MIN_PEOPLE` (Fase 1: **3**) sobre las interacciones
del mismo objetivo dentro de `CONVERGENCE_WINDOW_DAYS` (Fase 1: **7**). Se muestran hasta
`CONVERGENCE_MAX_ITEMS` (Fase 1: **5**) obras, ordenadas por cantidad de personas desc,
luego por interacción más reciente desc. Todas las constantes viven en el módulo del
servicio.

### D3 — Una síntesis por obra, nunca filas sueltas

El panel renderiza **una fila por obra convergente**: carátula + título enlazado + artista
+ una línea con hasta `CONVERGENCE_NAME_SAMPLE` (Fase 1: **3**) nombres de personas y "y N
más" cuando corresponde, más la cifra "{N} personas que seguís esta semana". Nunca
"Ana escuchó X · Pedro valoró X · Juan reseñó X" como filas separadas. El tipo concreto de
interacción de cada persona **no** se muestra en el panel (la síntesis es "tu red está con
esta obra", no un desglose); el detalle está en el listado cronológico de abajo.

### D4 — Aditivo: no se suprime nada del listado cronológico

Las entradas de diario / rating / reseña / favorito que alimentan una convergencia
**siguen apareciendo** en el feed cronológico bajo el panel. Razones: (a) suprimir en un
feed fusionado en memoria y paginado por páginas ampliadas es frágil y caro; (b) el panel
ya entrega el valor "una síntesis, no tres filas"; (c) la entrada individual lleva detalle
que la síntesis descarta (la nota de Ana, las ★ de Pedro). La supresión/colapso queda como
refinación posterior con datos reales (ver Open Questions).

### D5 — Ubicación: panel en la cabecera de `/me/feed`

`<NetworkConvergence>` se renderiza en `page.tsx` **encima de `<FeedList>`**, dentro del
`<main>`. Es la capa "Relevante", visualmente separada del listado "Social". Si no hay
convergencia, el componente devuelve `null` y no deja hueco (mismo patrón que
`InRotation` / `FingerprintSection`). No va en el preview de Inicio en Fase 1.

### D6 — Cálculo: un servicio `cache()`d, una sentencia SQL

`src/services/feed/convergence.ts`:

```ts
export const getNetworkConvergence = cache(
  async (viewerId: string): Promise<{ items: ConvergenceItem[] }> => { … },
);
```

1. Seguidos aceptados del lector menos bloqueados → `visibleFolloweeIds`. Si vacío →
   `{ items: [] }` sin tocar las otras tablas.
2. Una sentencia `db.execute(sql\`WITH interactions AS (UNION ALL de las 4 fuentes),
   converged AS (GROUP BY release_group_id, recording_id HAVING COUNT(DISTINCT user_id) >=
   N ORDER BY people DESC, last_at DESC LIMIT M) SELECT … \`)` que ya trae, por obra:
   `people` (cifra), `last_at`, `title`/`cover` (LEFT JOIN a `release_group` / `recording`),
   `artist_name` (subquery escalar sobre `credit` con el nombre de tabla explícito) y
   `people_sample` (`json_agg` de un `DISTINCT ON (user_id)` sobre la CTE `interactions`,
   ordenado por fecha desc, acotado en JS a `CONVERGENCE_NAME_SAMPLE`).
3. Mapear las filas a `ConvergenceItem` y validar la forma.

`ConvergenceItem`:

```ts
interface ConvergenceItem {
  target: { type: "release-group" | "recording"; id: string; title: string; artistName: string | null; coverThumbUrl: string | null };
  peopleCount: number;                       // COUNT(DISTINCT user_id) real
  peopleSample: { username: string; displayName: string | null }[];  // hasta 3
  lastInteractionAt: string;                 // ISO, para copy "esta semana" / orden
}
```

Sin endpoint ni fetcher: la página lo resuelve una vez server-side, no hay paginación
(mismo criterio que `fingerprint` / `in-rotation`).

### D7 — Copy de tono cultural

- Encabezado del panel: **"En tu red esta semana"** / "In your network this week".
- Por obra: título enlazado · artista, y debajo, en `font-data` muted:
  `{nombres} · {count, plural, one {# persona que seguís} other {# personas que seguís}}`.
  `{nombres}` = hasta 3 display-names unidos con coma, y `y {n} más` cuando `peopleCount`
  supera la muestra.
- Sin "tendencia", sin "🔥", sin insignia de número grande, sin ranking global. La única
  cifra es "N personas que seguís".

## Risks / Trade-offs

- **[Coste del `UNION ALL` de 4 tablas]** → Cada fuente filtra por `user_id = ANY(seguidos)`
  + fecha `>=` con índices por `(user_id, created_at)` / objetivo; la ventana de 7 días y el
  conjunto acotado de seguidos mantienen el volumen chico. `cache()` evita recomputar.
  Si con volumen real pesa, la arquitectura admite materializar sin cambiar la interfaz.
- **[Panel aditivo ⇒ la obra aparece dos veces (panel + filas abajo)]** → Deliberado (D4).
  El panel y el listado responden preguntas distintas ("¿en qué coincide mi red?" vs "¿qué
  pasó, en orden?"). La supresión queda para una iteración con datos.
- **[Convergencia sobre `recording` infla con singles muy escuchados]** → El umbral es
  **personas distintas**, no escuchas; 3 personas distintas sobre el mismo tema en 7 días
  es señal real. Contar `recording` aparte de `release-group` evita el sesgo de rollup.
- **[Nombres en el panel exponen quién escuchó qué]** → Solo se listan personas cuya
  interacción el lector **ya podía ver** en el feed (misma matriz de visibilidad). El panel
  no revela nada nuevo, solo lo agrupa.
- **[Tercer "En rotación"-like: perfil (30 d) · pico de feed (7 d, personal) · convergencia
  (7 d, red)]** → Copys y encabezados distintos: "En rotación" (tu hábito), "En tu red esta
  semana" (coincidencia de la red). Nunca se numeran ventanas al usuario.

## Migration Plan

Sin migración de base de datos. El servicio y el componente son aditivos; si
`getNetworkConvergence` fallara, el `<main>` de `/me/feed` puede aislarlo con su propio
boundary (o simplemente no renderiza el panel). Rollback = revertir el commit. Sin feature
flag: el panel solo aparece cuando hay ≥ 3 personas convergiendo, así que se auto-oculta
hasta que la comunidad tenga densidad.

## Open Questions

- **OQ1 — ¿Se cuentan objetivos `recording` además de `release-group`, o solo álbumes? →
  RESUELTA: ambos, por separado.** Una convergencia sobre un single/tema es señal social
  legítima y contar solo álbumes reintroduce el sesgo de género que la dirección evita.
  Sin roll-up canción→álbum (eso es otra heurística).
- **OQ2 — ¿El panel suprime o colapsa las entradas individuales que lo alimentan en el
  listado cronológico? → RESUELTA: no en Fase 1** (D4). El panel entrega la síntesis;
  las filas de abajo llevan detalle que la síntesis descarta. Revisar con datos reales si
  la duplicación molesta.
- **OQ3 — ¿El panel va también en el preview de feed de Inicio? → RESUELTA: no en Fase
  1.** Esa superficie ya está acotada por su contenedor de scroll; sumar un panel encima
  compite por un espacio escaso. Evaluar después.
