## Context

`/{locale}/activity` (`src/app/[locale]/activity/page.tsx`) es un server component. Pide en paralelo la
página 1 de tres fuentes y, si hay sesión, se las pasa a `ActivityTabs`, un client component con estado
local y el patrón ARIA de pestañas. Cada panel es una `CommunityActivitySection`, que pagina con
`useInfiniteQuery` y renderiza `FeedActivityList`, la misma lista de `/me/feed` y de Inicio. Las fuentes
son estas:

| Pestaña | Servicio | Endpoint | Filtros hoy |
| --- | --- | --- | --- |
| Recientes | `listCommunityActivity` (`services/activity/community-activity.ts`) | `GET /api/activity/recent` | ninguno |
| Siguiendo | `listFeed` (`services/feed/feed.ts`) | `GET /api/me/feed` | `kind`, `authorId`, `q` |
| Tú | `listMyRecentActivity` (`services/home/home.ts`) | `GET /api/me/recent-activity` | ninguno |

Los hallazgos de la auditoría están en `proposal.md`. Hay una restricción importante: `FeedActivityList`,
`MetaLine`, `RelativeDate` y `DiscPlaceholder` se comparten con `/me/feed`, Inicio y el diario. Todo lo que
sea rediseño entra por props opt-in. Solo las correcciones de errores se aplican de forma global.

## Goals / Non-Goals

**Goals:**

- Que la pestaña y el filtro vivan en la URL y se rendericen en el servidor, sin parpadeo de la pestaña
  por defecto.
- Que la página funcione bien a 375px, conserve el ancho de lectura en escritorio y use el espacio
  sobrante para contexto real.
- Reutilizar los filtros que `/me/feed` ya tiene, sin contratos nuevos donde no hacen falta.

**Non-Goals:**

- Tocar `groupFeedRuns`, los tiers o la fusión de opinión (spec `activity-feed`).
- Filtros en "Tú", sugerencias personalizadas de seguimiento o scroll infinito.
- Migraciones de esquema.

## Decisions

### D1. Pestañas subrayadas, no un control segmentado

El mockup de la auditoría probó un control segmentado, pero se queda la barra subrayada. El comentario
de `ActivityTabs` documenta por qué se eligió: replica la navegación del Header y no se lee como filtro.
Ahora que se suman chips de filtro debajo, esa diferencia de forma entre "sección" (subrayado) y
"filtro" (chip) es justamente lo que mantiene clara la jerarquía. Los cambios son tres:

- Etiquetas cortas ("Siguiendo", "Tú") para que las tres quepan en 343px útiles.
- Hover solo con color de texto. Hoy pinta `border-ink-border`, del mismo grosor que la activa.
- Un desvanecido en el borde (`mask-image`) cuando `scrollWidth > clientWidth`, por si una traducción
  futura vuelve a desbordar.

*Alternativa descartada:* el control segmentado del mockup. Con chips debajo serían dos controles con
forma de botón apilados.

### D2. Pestaña y filtro en la URL: `?tab=` y `?kind=`

- `tab` ∈ {`following`, `you`}. Ausente o con cualquier otro valor equivale a Recientes. Sin sesión, `tab`
  se ignora: no hay pestañas.
- `kind` toma los mismos valores que el `kind` del feed. Se valida contra la lista de la pestaña activa y
  un valor ajeno se descarta en silencio, sin 400, porque es un parámetro de UI y no de API.
- Las claves van en inglés, como `?view=songs` del álbum, porque son identificadores estables entre
  locales.
- La página lee `searchParams` (`Promise` en Next 15, con `await` obligatorio) y pide en el servidor
  **solo** la página 1 de la pestaña activa con su filtro. Hoy se piden las tres. Las otras dos se cargan
  en el cliente al elegirlas, con `useInfiniteQuery` sin `initialData`, y muestran un esqueleto
  mientras tanto.
- Al cambiar de pestaña o de filtro se actualiza la URL con `window.history.replaceState` (Next 15 lo
  sincroniza con `useSearchParams`). No se apila una entrada de historial por cada chip, el atrás del
  navegador sale de la página y el server component no se vuelve a renderizar: el servidor solo
  interviene en la carga inicial.
- La regla de "estado vacío global solo si ninguna fuente tiene contenido" necesita saber si las fuentes
  no activas están vacías. Para eso se piden con los mismos servicios y `pageSize` 1, en vez de tres
  páginas completas. Así se reutiliza la visibilidad de cada fuente sin duplicarla en una consulta nueva.

*Alternativa descartada:* seguir pidiendo las tres páginas y mantener la pestaña en `useState` con
`history.replaceState`. Funciona, pero la recarga muestra Recientes antes de hidratar y triplica las
consultas aunque la persona nunca cambie de pestaña.

### D3. Claves de React Query con el filtro

`queryKeys.activityRecent()` pasa a ser `activityRecent({ kind })`. `myFeed({})` ya acepta filtros, así
que Siguiendo usa `myFeed({ kind })`. La clave de Recientes que usa Inicio (`activityRecent({})`) sigue
siendo la misma forma, así que la caché entre Inicio y `/activity` se comparte.

### D4. `kind` en `GET /api/activity/recent`

`listCommunityActivity(viewerId, page, pageSize, { kind })` arma solo la rama de la unión que pide
(`rating` | `comment` | `review`), con el mismo esquema de "fusión en memoria por fuente" que ya usa
`listFeed`. La validación del route handler copia `parseKind` de `/api/me/feed`: si el valor es
inválido, devuelve `400 VALIDATION_ERROR`, envuelto en `withErrorHandling`. Es un cambio aditivo.

### D5. Línea de metadatos que no se rompe (corrección global)

En `MetaLine`, `GroupRow`, `RotationPeakRow` y las filas de seguimiento, el separador " · " se mueve
**dentro** del grupo que lo antecede, y el ícono se une a su verbo en un `whitespace-nowrap`. Así el
salto de línea solo puede caer entre unidades completas: autor, verbo con ícono, audiencia. La fecha se
mantiene alineada a la derecha desde `sm`. Por debajo de `sm`, la fecha deja de ocupar una columna propia y
pasa al final de la línea de metadato como una unidad más (" · hace 3 semanas"). Así deja de competir por el
ancho del autor. Se descartó el formato abreviado de `format.relativeTime` porque en español los estilos
`short` y `narrow` dan "hace 2 m" (mes) y "hace 2 a" (año), que se confunden con minutos.

*Por qué es global:* el "·" colgando es un error en cualquier superficie, no una decisión de diseño de
`/activity`.

### D6. "Tú" con carátula: variante nueva, no se cambia `self`

`FeedActivityList` gana `variant="own"`: la anatomía de `feed` (celda de carátula y columna de texto)
con `hideAuthor`. Inicio sigue usando `self`, con el riel de línea de tiempo pensado para un preview
denso dentro de un contenedor con scroll. La posición de la nota en `self` sí se corrige de forma
global: siempre va en su propia línea bajo el título, como en `feed`, y nunca salta según el largo del
título.

### D7. Bloques de fecha

`FeedActivityList` gana una prop opt-in `dateSections`. Después de `groupFeedRuns`, se insertan
encabezados ("Hoy", "Esta semana", "Este mes", "Antes") cuando cambia el bloque de la fila, calculado con
`useNow()`, igual que el pico de rotación. Las filas conservan su `RelativeDate`, porque el bloque es una
ayuda de escaneo y no sustituye la fecha. Los encabezados son `<li role="presentation">` con un `<h3>`
dentro, para no romper la semántica de la lista. Solo se activa en `/activity`; `/me/feed` queda igual
para no mezclar este cambio con el de feed.

### D8. Tarjeta de reseña

En `/activity` (prop `reviewCard`), una reseña o una fila fusionada con reseña muestra el `ProsePanel`
dentro de una superficie elevada (`bg-ink-raised` o el token equivalente que exista). Lleva las
estrellas arriba, el titular en `font-display`, el cuerpo plegado a 4 líneas y un enlace "Leer reseña"
hacia `reviewHref(...)`. `/me/feed` conserva el panel actual.

### D9. Estados vacíos con acción

`CommunityActivitySection` recibe un `empty: { title, description, action? }` por pestaña y filtro, en
lugar del `emptyMessage` único. Usa el `EmptyState` existente en su variante compacta, o le suma una
variante `compact` si no la tiene. Las combinaciones son estas:

| Caso | Acción |
| --- | --- |
| Recientes + filtro sin resultados | "Ver todo" (quita `kind`) |
| Siguiendo, no sigue a nadie | "Descubrir personas" → `/users` |
| Siguiendo, sigue pero sin actividad (o el filtro deja vacío) | "Descubrir personas" / "Ver todo" |
| Tú, sin actividad | "Explorar música" → `/explore` |

Para distinguir "no sigue a nadie" se usa `listFeedAuthors` (los seguidos activos que alimentan el feed),
que la página obtiene en el servidor.
La copia en español va en tuteo y se retira el voseo ("acá", "seguís") de `feed.community.*`.

### D10. Riel lateral (fase 3)

- **Layout**: `main` pasa a `max-w-6xl`. Desde `lg`, es una grilla `[minmax(0,1fr)_280px]` y la columna
  del feed se limita a `max-w-3xl`, el ancho de lectura actual. Por debajo de `lg`, el riel se renderiza
  después de la lista.
- **"Con más conversación esta semana"**: un servicio nuevo, `listTrendingConversations(viewerId)`, en
  `community-activity.ts`. Toma release-groups con al menos **2 personas distintas** que, en los últimos
  7 días, tienen una valoración vigente, un comentario raíz visible o una reseña visible. Las personas
  salen con el mismo filtro que Recientes: perfil `public`, cuenta activa, sin bloqueo en ninguna
  dirección con el lector y sin contenido moderado. Ordena por personas distintas y, a igualdad, por la
  actividad más reciente. Devuelve como máximo 5, con carátula y el recuento de personas. Las respuestas
  no cuentan, igual que en el feed.
- **Caché**: la parte sin bloqueos se cachea en memoria 10 minutos (como `listFamilyGenres`). El filtro
  de bloqueo del lector se aplica sobre ese resultado. Si tras filtrar quedan menos de 5, no se completa
  con otros álbumes: el riel muestra lo que queda o se oculta si queda vacío.
- **"Sigue a más gente"**: aparece con sesión cuando la persona sigue a menos de 3 usuarios (el recuento
  de D9) y enlaza a `/users`. Sin sesión, la tarjeta invita a crear una cuenta (`/auth/register`). No hay
  sugerencias personalizadas.
- **Por qué no es "popularidad fabricada"**: la métrica son personas reales en una ventana declarada, y
  el umbral de 2 evita destacar a una sola persona. El texto lo dice explícitamente ("3 personas").

### D11. Contraste del disco de reemplazo (corrección global)

`DiscPlaceholder` sube su trazo y su relleno a tokens de mayor contraste sobre `ink`. El objetivo es que
el disco se distinga del fondo de la página (contraste no textual ≥ 3:1, WCAG 1.4.11).

## Risks / Trade-offs

- [Pedir solo la pestaña activa hace que las demás tarden más en aparecer] → Esqueleto en el panel y
  `prefetchInfiniteQuery` al pasar el mouse o enfocar la pestaña.
- [Las correcciones globales de D5, D6 y D11 cambian `/me/feed` e Inicio] → Están acotadas a errores, y
  hay que ajustar los tests existentes de `FeedActivityList` y `CompactActivityRow`. Se verifican en el
  navegador las tres superficies.
- [El riel cuesta una consulta extra por visita] → Ventana de 7 días sobre índices por `created_at`,
  caché de 10 minutos y presupuesto de < 50 ms medido contra la BD de scratch.
- [Con catálogos chicos el riel puede quedar vacío casi siempre] → Se oculta si está vacío, sin
  rellenar con otros álbumes.
- [Con `replaceState`, la URL y el estado del cliente pueden desincronizarse si otro código navega] →
  El estado se deriva siempre de `useSearchParams`, nunca de un `useState` paralelo.

## Migration Plan

Sin migraciones. El despliegue es directo y se revierte con el código. Los enlaces existentes a
`/activity` sin parámetros siguen abriendo Recientes.

## Open Questions

- ¿El umbral del riel (2 personas, 7 días, tope 5) va en `business-rules.md`? Se propone que sí, como
  regla nueva, porque es una regla visible de producto.
