## Context

`user_list` guarda título, descripción, `entity_type`, audiencia y `kind` (formato: `standard`, `artist_journey`,
`custom_journey`, `top`, `tier`). Nada dice para qué existe la lista. La base local tiene 70 listas reales (más 21 restos de
smoke "Smoke CHECK 3"); cuatro de cada cinco son de álbumes, así que el filtro por tipo de `/lists` apenas separa.

La exploración `mockups/lists-themes-2026-11/` (index.html) eligió: **B · Buscador** como página, las **puertas por tema de A**
cuando no hay búsqueda y la **pestaña Listas por tema de C** en las fichas. Decisiones tomadas con la recomendación:

- D1 · Las listas siguen siendo de un solo tipo.
- D2 · Vocabulario de 9 temas + "Otro".
- D3 · Tema obligatorio al crear; Caminos y láminas reciben uno por defecto; las existentes quedan sin tema.
- D4 · En la ficha, "Guías sobre X" usa solo el "sobre" declarado; la búsqueda usará además las facetas calculadas.
- D5 · Nota por ítem de hasta 140 caracteres, en la fase 3.
- D6 · Páginas por tema en `/lists/temas/<slug>`, en la fase 2.

Hay siete puntos de alta de `user_list`: `lists.createList`, `camino`, `artist-journeys`, `laminas` (Top N), `tiers`,
`editorial.ts` y `discovery/collections/generate.ts`.

## Goals / Non-Goals

**Goals:**
- Guardar tema y "sobre" con garantías en la base, exponerlos en la API y pedirlos al crear.
- Que las listas que crea el sistema por una acción de la persona nazcan con tema.
- Permitir clasificar las listas existentes sin inventar valores.
- Mostrar el tema y filtrarlo en el Lector actual de `/lists`, sin rediseñar la página.

**Non-Goals:**
- Búsqueda en el contenido, resolución de entidad, facetas calculadas, puertas y rutas por tema (fase 2).
- Pestaña Listas de las fichas por tema y nota por ítem (fase 3).
- Tema de colecciones generadas y editoriales.

## Decisions

### 1. Columnas en `user_list`, vocabulario por `CHECK`

`theme text NULL` con `CHECK (theme IS NULL OR theme IN (...))`, el mismo patrón que `kind` (gotcha de la 0094: con
columna nullable e `IN`, poner el `IS NULL` explícito). `subject_artist_id uuid NULL REFERENCES artist ON DELETE SET NULL`,
`subject_genre_id uuid NULL REFERENCES genre ON DELETE SET NULL` y `CHECK (num_nonnulls(subject_artist_id, subject_genre_id) <= 1)`.
Índices parciales: `(theme, created_at DESC) WHERE theme IS NOT NULL` para el filtro público, y uno por cada `subject_*`
`WHERE ... IS NOT NULL` para la fase 3.

Alternativas descartadas: una tabla `list_theme` con su junction (permite varios temas, pero D2 fija uno y obliga a joins
para algo que es un enum); etiquetas libres (con 70 listas se fragmentan y la página por tema queda vacía); un enum de
Postgres (agregar valores no se puede revertir dentro de una transacción y el proyecto ya usa `CHECK` con `IN` para `kind`).

La fuente única del vocabulario en la app es `LIST_THEMES` en `src/services/lists/types.ts`, en orden de presentación. Un
test compara esa constante con el `CHECK` de la migración, igual que se hace con otras listas cerradas.

### 2. Obligatorio en la app, nullable en la base

La base acepta `NULL` porque hay listas previas y altas del sistema sin tema. La obligatoriedad para la persona vive en el
contrato: `CreateListRequestSchema` exige `theme` y `UpdateListRequestSchema` lo acepta pero no admite `null`. No se usa un
`CHECK` condicionado a la fecha de creación: sería frágil y no distingue altas del sistema. La garantía para los
puntos de alta del sistema está en el código de cada servicio y en sus tests.

### 3. Temas de las altas del sistema

| Alta | `theme` | "sobre" |
|---|---|---|
| Camino (`custom_journey`) | `start_here` | — |
| Recorrido de artista (`artist_journey`) | `start_here` | su `journey_artist_id` |
| Top N (`top`) | `personal_ranking` | — |
| Tier list (`tier`) | `personal_ranking` | — |
| Colección generada | `NULL` | — |
| Editorial | `NULL` | — |

Las colecciones generadas ya tienen su propia clasificación (`user_list_featured.family`) y se muestran por familia en
Explorar y en "Destacadas". Asignarles tema exige resolver, por ejemplo, la familia de géneros de "Para entrar a Jazz" a una
fila de `genre`, y eso es parte de las puertas de la fase 2. Los borradores editoriales tienen su propio alta
(`createEditorialDraft`, con su propio contrato) y su tema se suma en la fase 2, junto con las puertas que los van a mostrar.

No hay backfill: los Caminos y láminas existentes quedan sin tema y entran en el aviso de clasificación junto con las
listas estándar. Las listas de las personas y las altas del sistema siguen la regla de no inventar valores retroactivos.

### 4. El "sobre" en la API

Request: `subjectArtistId?: uuid | null`, `subjectGenreId?: uuid | null`. Si se envían los dos con valor, responde error de
validación (Zod `refine`) antes de tocar la base. El servicio valida que el id exista (`VALIDATION_ERROR` si no). Al editar,
enviar uno con valor limpia el otro, para que cambiar de artista a género sea una sola operación.

Response: `subject: { type: "artist", id, name } | { type: "genre", id, name, slug } | null`, resuelto con un `LEFT JOIN`
en las mismas consultas de resumen (`UserListSummary`), sin una consulta por fila. El nombre del género usa `name_es`
cuando el idioma es `es` y existe, como el resto de la app.

El selector del formulario reutiliza lo que existe: artistas con `useTargetSearch("artist", …)` (que ya garantiza una fila
local antes de devolver el id, como "Añadir a lista") y géneros con `GET /api/genres/search`, que suma `id` a cada género de su respuesta (cambio aditivo del contrato). Un control segmentado
"Artista · Género" decide qué buscador se usa.

### 5. Formulario y panel rápido

`ListForm` suma, después del título, una cuadrícula de 10 opciones (radio) con nombre y descripción corta, sin selección
inicial, en 2 columnas (el formulario vive en un diálogo angosto: con 3 columnas los nombres se partían), con el nombre en
papel y un punto del tono del tema, y después el "sobre" opcional. El botón Crear queda deshabilitado hasta
que haya título y tema. `NewListPanel` (acciones rápidas) suma la misma cuadrícula en versión compacta: solo los nombres en
chips de 44 px, sin "sobre", porque el panel es para crear rápido desde un ítem. `ListMetaForm` (edición) suma tema y "sobre".

La sugerencia del "sobre" a partir del título que muestra `crear.html` queda fuera de esta fase: exige resolución de entidad,
que llega en la fase 2.

### 6. Chip de tema

Un componente `ListThemeChip` y un mapa `LIST_THEME_TONES` con el color de cada tema, en tokens del sistema. Sin tokens
nuevos si alcanza con los existentes; si no, los 9 tonos se agregan como tokens de componente documentados en
`docs/02-architecture/design-tokens-naming.md`. Los tonos de los mockups (`themes.css`) son el punto de partida. El texto se
valida contra AA sobre su fondo translúcido, con un test de contraste si el proyecto ya tiene uno para tokens. Si no lo
tiene, se mide a mano en el navegador.

### 7. Filtro en `/lists`

`parseListFilters` y el contrato de `/api/lists/discover` suman `theme` (enum, ignorado si no es válido). En la UI es un
`<select>` nativo estilizado: accesible, funciona en el teléfono y no agrega dependencias. La fase 2 lo reemplaza por la
barra de facetas. Con `theme` presente, la vista entra en el modo filtrado, igual que con `q` o `type`.

### 8. Aviso de clasificación en `/me/lists`

`listMyLists` devuelve aparte `unthemedCount` (conteo de listas propias con `theme IS NULL`). El aviso va arriba de la
estantería de "Mis listas", con hasta 5 listas y, por cada una, chips con los 10 temas. Elegir un chip hace `PATCH` y saca la
fila. "Ver todas" amplía el aviso en el lugar (hasta 50) con `GET /api/me/lists?theme=none`, sin tocar los filtros de
la estantería. `theme=none` solo vale en la superficie propia, nunca en `/lists`.

## Risks / Trade-offs

- [El vocabulario no encaja con lo que la gente arma] → Hay "Otro", y el conteo de listas en "Otro" se puede consultar para
  ampliar el vocabulario con una migración nueva. El orden y los nombres viven en `LIST_THEMES` y en los mensajes.
- [Listas viejas sin tema quedan fuera de los filtros] → Es intencional: aparecen sin filtro de tema y en la búsqueda. El
  aviso en `/me/lists` invita a clasificarlas.
- [El panel rápido suma un paso] → Los chips compactos agregan un toque; el tema es lo que hace encontrable la lista.
- [Nueve colores de chip pueden competir con el ámbar] → El chip es pequeño, con fondo translúcido; el ámbar sigue siendo
  el acento de acciones. Se revisa en el navegador a 390/1024/1440.
- [Colecciones generadas sin tema en el filtro] → No aparecen al filtrar por tema hasta la fase 2. Siguen en Destacadas.

## Migration Plan

1. `drizzle/0098_list_theme.sql`: columnas, `CHECK`, FKs e índices. Sin backfill. Se aplica en la BD de scratch y, cuando
   la persona lo decida, en la real (como las migraciones anteriores, queda anotado).
2. Rollback: la migración es aditiva; un rollback manual borra índices, constraints y columnas. El código previo no las lee.

## Plan en tres fases

1. **`add-list-themes-phase1`** (este cambio): el dato, la creación, la clasificación, el chip y el filtro en el Lector.
2. **Buscador**: `/lists` como búsqueda en título, descripción y contenido; resolución de entidad ("Pink Floyd" → artista) y
   grupos "Tratan sobre" / "Contienen" con la posición del ítem; facetas calculadas (género, década) en una barra; puertas
   por tema sin búsqueda y `/lists/temas/<slug>`; tema para colecciones generadas y borradores editoriales; vista previa
   con "escuchado / pendiente"; sugerencia del "sobre" a partir del título.
3. **Fichas y notas**: pestaña Listas de artista, álbum, canción y género con "Guías sobre X" (solo "sobre" declarado) y
   "Aparece en" agrupado por tema; nota por ítem de hasta 140 caracteres en el editor, el detalle y la vista previa.

## Open Questions

- ¿El panel rápido debería permitir "Otro" como opción por defecto para no frenar? La recomendación es no: sin
  preselección, igual que el formulario.
- Tonos finales de los 9 chips: se cierran en la implementación con la medición de contraste.
