## Context

### Estado actual

- El catálogo solo se alcanza por **búsqueda de texto** (`catalog-search`,
  `header-search`). No hay browse, ni por década, ni por género, ni ranking.
- **Listas** (`lists`, `list-discovery`, `list-saves`) ya son un sistema completo:
  `user_list` (mono-tipo `artist`/`release-group`/`recording`, audiencia, portadas
  enriquecidas vía `enrichLists`), `user_list_pin` (fijar propias), `list_save`
  (guardar/seguir ajenas), pestaña "Descubrir" en `/me/lists` (cronológica, de comunidad,
  requiere sesión).
- Datos disponibles hoy en el catálogo local: **2649 release-groups**, 94 % con
  `first_release_year` (1961–2026), **3358 tags de género** cubriendo el 98 % de los
  release-groups (`release_group_tag`). `rating` / `review` / `favorite` /
  `collection_entry` existen pero son escasos.
- La carátula se resuelve a nivel release-group (`findOrResolveCover`, `cover_thumb_url`).
- `taste-fingerprint` fijó el patrón: cálculos de agregación **bajo demanda, sin tabla
  materializada**.
- `Header.tsx` muestra navegación `/me/*` solo con sesión; el buscador va junto al logo.
  El footer tiene un grupo "Explorar" con Inicio / Buscar / Usuarios / Cómo funciona.

### Restricciones

- Migraciones SQL crudas (ADR 0005); `schema.ts` espejo manual.
- Descubrimiento **no algorítmico-personalizado** — editorial y por reglas, igual que
  `list-discovery`.
- `/explore` es público (con y sin sesión): es superficie de descubrimiento y de captación.

## Goals / Non-Goals

**Goals:**

- Una superficie `/explore` de álbumes con contenido desde el día 1 (ancla editorial +
  browse por datos de catálogo) y rieles por reglas que aparecen solos cuando hay datos.
- Reutilizar el sistema de listas para la curaduría editorial — el mínimo de modelo nuevo.
- Dejar `/explore` como contenedor extensible (artistas, canciones, listas después).

**Non-Goals:**

- Personalización; pestañas no-álbum; UI de administración; filtros combinados; tablas
  materializadas; piezas posteriores de `redefine-content-hierarchy`.

## Decisions

### D1 — Curaduría editorial = listas públicas de un usuario curador (opción A)

**Decisión.** No se crea una entidad `editorial_collection`. El contenido editorial son
`user_list` normales (`entity_type='release-group'`, `audience='public'`) propiedad de una
**cuenta curadora** sembrada: `app_user` con un `username` reservado (p. ej.
`exploracion`), `password_hash = NULL` (no puede iniciar sesión), `profile_visibility =
'public'`, `display_name` localizable en la UI.

**Por qué.** El sistema de listas ya resuelve todo lo que una colección editorial necesita:
ítems ordenados manualmente, portadas enriquecidas (`enrichLists`), página de detalle con
tres modos de vista, guardar/seguir. Una entidad nueva duplicaría ese trabajo. La cuenta
curadora es una fila de datos, no código.

**Alternativa considerada.** Entidad `editorial_collection` dedicada. Rechazada: más
migración, más servicio, más UI, para replicar `user_list`.

**Alternativa considerada.** Colecciones "sin dueño" (columna `curated` en `user_list` con
`owner_id` nullable). Rechazada: rompe la FK `NOT NULL` y todos los joins que asumen dueño.

### D2 — Tabla `user_list_featured (list_id, rank)`, no una columna en `user_list`

**Decisión.** La señal "destacada + orden" vive en una tabla propia:

```sql
CREATE TABLE user_list_featured (
    list_id     UUID PRIMARY KEY REFERENCES user_list (id) ON DELETE CASCADE,
    rank        SMALLINT NOT NULL UNIQUE CHECK (rank > 0),
    created_at  TIMESTAMPTZ NOT NULL DEFAULT now()
);
```

- **Presencia de fila = destacada**; ausencia = no destacada. No hay estados imposibles.
- `rank` **NOT NULL** dentro de la tabla, **UNIQUE** (orden editorial inequívoco), `> 0`.
- El riel editorial lee `user_list JOIN user_list_featured ORDER BY rank`.

**Por qué una tabla y no `user_list.featured_rank SMALLINT NULL`.** `user_list` tiene un
trigger `trg_user_list_updated_at` (`BEFORE UPDATE FOR EACH ROW`) que bumpea `updated_at`
en **cualquier** `UPDATE`, y `updated_at` dispara eventos de feed. Un `UPDATE user_list SET
featured_rank = …` desde el seed generaría un evento de "lista actualizada" en el feed de
todos los seguidores de la lista — exactamente lo que la decisión prohíbe. El proyecto ya
resolvió este mismo problema con `user_list_pin` ("tabla aparte para no tocar
`user_list.updated_at`"). Mismo patrón acá.

**`featured` es solo una señal de distribución.** No modifica visibilidad, permisos,
edición, lectura, métricas ni comportamiento de `user_list` en ninguna superficie —
`user_list` ni se toca. Solo permite que superficies que **opten explícitamente** por
consumir la curaduría destacada (hoy, únicamente `/explore`) seleccionen y ordenen listas.
Una lista con fila en `user_list_featured` se comporta como cualquier lista pública en
`/me/lists` ajena, "Descubrir", `list_save`, feed y home.

**Nota sobre la aprobación previa.** Se había acordado `featured_rank SMALLINT NULL` como
columna; la tabla aparte cumple lo mismo (un dato para "destacada + orden", sin booleano,
sin estados imposibles, con unicidad y `> 0`) y además no arriesga el trigger de feed.

### D3 — Secciones de `/explore` y degradación grácil

**Decisión.** Seis secciones independientes (álbumes, Fase 1), en este orden. **Novedades,
Explorar por década y Explorar por género son tres rieles distintos** — cada uno con su
propia lógica de navegación (novedades no navega a ningún lado; década y género abren un
listado filtrado con parámetros distintos).

| Sección | Fuente | Se muestra si |
|---|---|---|
| Colecciones destacadas | `user_list JOIN user_list_featured ORDER BY rank` | hay ≥1 |
| Novedades | `release_group` (`studio`/`single_ep`) por `first_release_year` desc | siempre (hay 2489 con año) |
| Explorar por década | décadas derivadas de `first_release_year` | siempre |
| Explorar por género | top N de `release_group_tag` por conteo | hay ≥1 género con datos |
| Mejor valorados | `rating` agregado por release-group | ver umbrales abajo |
| Más reseñados | `review` contado por release-group | ver umbrales abajo |

**Dos umbrales, nombrados distinto (OQ3 resuelta).** Se separan porque son conceptos
diferentes:

- **`MIN_RATINGS_PER_ALBUM = 3`** — *elegibilidad del álbum*: un álbum entra en "Mejor
  valorados" solo si tiene ≥3 valoraciones. Evita que un `5.0` con 1 voto quede por encima
  de un `4.8` con 80. (Más adelante probablemente un ranking bayesiano/ponderado; 3 es
  razonable para la fase actual.) El equivalente para reseñas es
  **`MIN_REVIEWS_PER_ALBUM = 1`**.
- **`MIN_ALBUMS_FOR_SECTION = 6`** — *visibilidad del riel*: la sección aparece solo si hay
  ≥6 álbumes elegibles. Debajo de eso, el riel **se omite por completo** — no se muestra
  vacío ni con "todavía no hay datos" (eso sería ruido en una superficie de descubrimiento).

Ambos umbrales viven en constantes del servicio, ajustables sin migración.

**Por qué este orden.** Lo editorial y lo de catálogo (siempre con contenido) van primero;
los rieles sociales, que empiezan ocultos, van al final y aparecen cuando la comunidad
crece — la superficie "madura" sola.

### D4 — Listados filtrados por década / género dentro de `/explore`

**Decisión.** `/explore?decada=1990` y `/explore?genero=rock` (un parámetro a la vez).
Renderiza una grilla paginada de `AlbumCard`, orden determinista: por valoración agregada
cuando el álbum tiene ≥ `MIN_RATINGS_PER_ALBUM`, luego por `first_release_year` desc,
desempate por `id`. Sin combinar filtros en Fase 1.

**Por qué en la misma ruta y no `/explore/decada/[x]`.** Menos superficie de ruta nueva; el
estado vive en el query string (enlazable, sobrevive recarga), mismo patrón que `?q=` en
`/search`. Migrar a segmentos de ruta después es transparente.

### D5 — Todo server-render; endpoints solo si hacen falta

**Decisión.** `/explore` y sus listados filtrados se renderizan en Server Components
llamando directamente a los servicios de `src/services/discovery/`. Se añade
`GET /api/discovery/*` **solo** para la paginación incremental de los listados filtrados
(si el diseño de UI lo pide); las secciones de la portada de `/explore` no paginan (número
fijo de ítems por riel).

**Por qué.** Es el patrón del proyecto (páginas de catálogo, perfil, home). Evita duplicar
read-models en un endpoint que nadie más consume.

### D6 — Flag de configuración para el lanzamiento

**Decisión.** Una variable de entorno (`EXPLORE_ENABLED`, server-side) controla: (a) si el
enlace a `/explore` aparece en Header y Footer; (b) si la ruta responde — apagada,
`/explore` redirige a Inicio. Encendida por defecto en desarrollo, apagada en producción
hasta que el seed tenga suficiente contenido.

**Por qué.** El propio D7 lo recomienda: "feature flag hasta tener contenido semilla
suficiente". Es un gate simple, no un sistema de flags.

### D7 — Seed por script, no por migración de datos

**Decisión.** `scripts/seed-discovery.ts` (idempotente, re-ejecutable):
1. Upsert de la cuenta curadora por `username` (`exploracion`).
2. Para cada colección definida en el script: upsert de la `user_list` (por dueño+título),
   resolución de cada álbum por `mbid` contra el catálogo local, `INSERT ON CONFLICT DO
   NOTHING` de los ítems que existan, aviso por los que falten, y upsert de la fila
   `user_list_featured (list_id, rank)`.

**Por qué script y no `INSERT` en la migración.** La curaduría se ajusta iterando; una
migración de datos es inmutable. El script solo puede referenciar álbumes ya ingeridos, así
que es naturalmente incremental. La migración aporta solo la columna.

## Risks / Trade-offs

- **[Rieles por reglas vacíos hacen ver `/explore` pobre]** → Degradación grácil (D3): los
  rieles sociales no se muestran hasta tener datos; la portada nunca queda sin contenido
  gracias a lo editorial + catálogo. El flag (D6) tapa el caso extremo.

- **[Las listas del curador aparecen en "Descubrir" y "Listas públicas recientes"]** → **No
  se excluyen** (OQ1 resuelta con "no"): son listas públicas legítimas y una lista puede
  ser a la vez pública, reciente, editorial y destacada — no hay conflicto, y excluirlas
  crearía dos ecosistemas ("listas normales" vs "listas editoriales especiales") que D1
  descarta. El único cuidado es **evitar duplicación visual excesiva dentro de un mismo
  viewport de `/explore`** (una colección destacada no debería repetirse tres secciones
  más abajo) — eso es composición de `/explore`, no una exclusión del read-model general.

- **[Agregación de "mejor valorados" / "más reseñados" sin materializar]** → Consultas
  `GROUP BY release_group_id` con `HAVING count >= MIN_*_PER_ALBUM`, acotadas a top ~20,
  con índices en `rating.release_group_id` / `review.release_group_id` (ya existen). A la
  escala actual (miles de filas) es trivial; si crece, se materializa en un cambio
  posterior.

- **[Géneros de MusicBrainz son ruidosos]** (`release_group_tag` tiene tags libres) → El
  browse por género usa un **top-N por conteo** y una lista blanca opcional de géneros
  "canónicos" para los chips; el resto queda accesible pero no destacado. Afinable en el
  servicio.

- **[La cuenta curadora sin `password_hash` rompe supuestos de auth]** → `password_hash`
  ya es nullable (cuentas solo-OAuth). La cuenta no tiene `auth_identity` ni sesión posible.
  Se verifica que los flujos de login/registro no la tocan.

- **[Décadas con pocas fechas exactas]** → `first_release_year` cubre el 94 %; los álbumes
  sin año simplemente no aparecen en el browse por década (aparecen en el resto).

## Migration Plan

1. **`drizzle/0018_user_list_featured.sql`**: `CREATE TABLE user_list_featured (list_id
   UUID PRIMARY KEY REFERENCES user_list(id) ON DELETE CASCADE, rank SMALLINT NOT NULL
   UNIQUE CHECK (rank > 0), created_at TIMESTAMPTZ NOT NULL DEFAULT now())`. Espejo en
   `schema.ts` (`userListFeatured` + tipo). `user_list` no se toca.
2. **Servicios** `src/services/discovery/`: read-models de portada y de listados filtrados.
3. **Zod + (opcional) API** para paginación de los listados filtrados.
4. **UI**: ruta `explore/page.tsx`, componentes de sección, reutilización de `AlbumGrid`.
5. **Navegación + flag**: Header, Footer, lectura de `EXPLORE_ENABLED`.
6. **Script** `scripts/seed-discovery.ts` + colecciones iniciales (definidas en el propio
   script).
7. **Docs**: sql-model, contracts (si hay endpoints), nota de operación.
8. **Operación** (no despliegue): correr `seed-discovery.ts`; encender `EXPLORE_ENABLED`
   cuando el contenido alcance.

**Rollback.** La columna es aditiva y nullable. Apagar `EXPLORE_ENABLED` oculta la
superficie por completo sin tocar datos. Revertir el código no requiere bajar la columna.

## Resolved Questions

- **OQ1 — ¿excluir de "Descubrir" y "Listas públicas recientes" las listas con fila en
  `user_list_featured`?** → **No.** Una lista destacada es una lista pública legítima;
  excluirla crearía dos ecosistemas que D1 descarta. El único cuidado es no duplicarla
  visualmente dentro del mismo viewport de `/explore` (composición, no read-model). Ver
  Risks.
- **OQ2 — cuenta curadora** → `username = "exploracion"`, `password_hash = NULL`,
  `profile_visibility = 'public'`, `display_name = "Exploración"` **fijo** (los nombres no
  se traducen en el resto del producto).
- **OQ3 — umbrales** → dos, nombrados distinto (ver D3): `MIN_RATINGS_PER_ALBUM = 3` y
  `MIN_REVIEWS_PER_ALBUM = 1` (elegibilidad del álbum), `MIN_ALBUMS_FOR_SECTION = 6`
  (visibilidad del riel). Ajustables sin migración.

## Open Questions

- **OQ4** — ¿Lista blanca de géneros canónicos para los chips, o puro top-N? Fase 1:
  top-N; lista blanca si el top-N sale ruidoso.
- **OQ5** — ¿El listado filtrado por década/género pagina vía endpoint (`GET
  /api/discovery/albums`) o "cargar más" server-side? Decisión de UI durante la
  implementación.
