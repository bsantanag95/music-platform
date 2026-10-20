## Why

Una auditoría de diseño de `/{locale}/activity` (2026-10-20, escritorio 1366px y móvil 375px, con y sin
sesión) encontró que la página funciona pero se lee como un registro monótono y no invita a hacer
nada. En "Recientes", 8 de 9 filas eran "Valoró" y no hay forma de ver solo reseñas o comentarios.
Además se rompe en detalles concretos:

- En móvil la tercera pestaña queda cortada ("Tu a…") sin ninguna pista de que se puede deslizar.
- La línea de metadatos deja un "·" colgando y separa el ícono de su verbo.
- La pestaña activa no queda en la URL: al recargar o volver atrás se pierde.
- Los paneles vacíos no ofrecen ninguna salida y mezclan voseo ("acá") con tuteo ("sigues").
- El hover de una pestaña inactiva se confunde con la activa.
- "Tu actividad" coloca la nota en un lugar distinto según el largo del título.
- El disco que reemplaza una carátula ausente casi no se ve sobre el fondo oscuro.

## What Changes

**Fase 1: correcciones y pulido (sin backend)**

- Pestañas con etiquetas cortas ("Recientes · Siguiendo · Tú" / "Recent · Following · You") que caben en
  375px. Si aun así desbordan, se indica con un desvanecido en el borde.
- La pestaña activa se refleja en `?tab=` (`following`, `you`; sin parámetro = Recientes). El servidor
  renderiza esa pestaña y se puede enlazar, recargar o volver atrás.
- El hover de una pestaña inactiva cambia solo el color del texto, no el subrayado.
- La línea de metadatos no se rompe: autor, separador, ícono y verbo forman una unidad. En móvil la fecha
  pasa a su propio lugar en vez de forzar el salto.
- "Tú" usa la misma anatomía que las otras pestañas (carátula a la izquierda, sin autor) y la nota
  siempre en la misma posición.
- Estados vacíos por pestaña con una invitación y una acción ("Descubrir personas", "Explorar música",
  "Ver todo"), con copia en tuteo de punta a punta.
- Cabecera más compacta: menos espacio superior en móvil y una línea de subtítulo bajo el título.
- El disco de reemplazo gana contraste.

**Fase 2: claridad del contenido**

- Filtros por tipo en chips, por pestaña: en Recientes, Todo · Reseñas · Comentarios · Valoraciones; en
  Siguiendo, además Escuchas y Listas. Se reflejan en `?kind=`. "Tú" no lleva filtros.
- `GET /api/activity/recent` acepta `kind` (`rating` | `comment` | `review`). Es un cambio aditivo: sin
  `kind` el contrato no cambia.
- Bloques de fecha en la lista ("Hoy", "Esta semana", "Este mes", "Antes") en lugar de repetir la misma
  fecha relativa fila tras fila.
- Las reseñas se presentan como una tarjeta de lectura: estrellas, titular y extracto plegado con "Leer
  reseña", que enlaza a la reseña.

**Fase 3: contexto**

- Desde 1024px, un riel lateral junto al feed. Por debajo de ese ancho, el riel se coloca después de la
  lista.
  - "Con más conversación esta semana": hasta 5 álbumes con más personas distintas que los valoraron,
    comentaron o reseñaron públicamente en los últimos 7 días (mínimo 2 personas), con las mismas reglas
    de visibilidad y bloqueo que Recientes.
  - "Sigue a más gente": aparece con sesión cuando la persona sigue a menos de 3 personas y enlaza a
    `/users`. Sin sesión invita a crear una cuenta.

## Capabilities

### New Capabilities

<!-- ninguna -->

### Modified Capabilities

- `activity-feed`: el feed de seguidos deja de incluir comentarios y reseñas ocultos por moderación, que hoy
  aparecen en contra de lo que exige `content-moderation` (encontrado durante la fase 3).
- `community-activity`: cambian las etiquetas de las pestañas, la pestaña pasa a vivir en la URL, los
  estados vacíos llevan acción, se suman los filtros por tipo, los bloques de fecha, la tarjeta de
  reseña y el riel lateral, y "Tu actividad" adopta la anatomía con carátula.

## Goals

- Que la página se pueda usar bien a 375px: todas las pestañas alcanzables, sin metadatos rotos.
- Que una persona pueda llegar en un toque a lo que más le importa (reseñas, gente que sigue) y que el
  estado de la página se pueda compartir por URL.
- Que ningún panel vacío sea un callejón sin salida.
- Dar contexto real (qué se está conversando), sin métricas inventadas.

## Non-Goals

- Cambiar la agrupación de corridas del feed (`groupFeedRuns`) o los tiers de `activity-feed`. Por
  ejemplo, plegar valoraciones de canción y de álbum en un solo grupo. Esa presentación se comparte con
  `/me/feed` e Inicio y se especifica en `activity-feed`, así que si se cambia será en otro cambio.
- Filtros en "Tú", que reutiliza tal cual el rastro de Inicio (`/api/me/recent-activity`).
- Sugerencias personalizadas de a quién seguir: "Sigue a más gente" solo enlaza a `/users`.
- Sumar escuchas, favoritos o listas a "Recientes": su composición sigue siendo valoraciones,
  comentarios y reseñas públicas.
- Scroll infinito: se mantiene "Cargar más".
- La carátula del espejo que devuelve 404 en desarrollo (es un problema de datos del entorno, no de
  esta página).

## Impact

- **Código**: `src/app/[locale]/activity/page.tsx`, `src/components/activity/*`, `src/components/feed/FeedActivityList.tsx`
  y `feed-row-parts.tsx` (metadatos, anatomía de "Tú", tarjeta de reseña, bloques de fecha), `src/components/catalog/DiscPlaceholder.tsx`,
  `src/services/activity/community-activity.ts` (filtro `kind`, consulta del riel), `src/app/api/activity/recent/route.ts`,
  `src/lib/api/diary.ts` y `src/lib/query/keys.ts` (clave con `kind`), `messages/{es,en}/feed.json`.
- **API**: `GET /api/activity/recent` gana `kind` opcional (aditivo; `400 VALIDATION_ERROR` ante un valor inválido).
- **Esquema**: sin migraciones. El riel lee `rating`, `comment` y `review` existentes.
- **Docs**: `docs/04-api/contracts.md` (hoy no documenta `/api/activity/recent`), `docs/05-features/activity-feed.md`
  (sección de la superficie pública) y, para el umbral del riel, `docs/01-domain/business-rules.md` si
  corresponde.
- **Otras superficies**: el arreglo de la línea de metadatos, la posición de la nota en "self" y el contraste del
  disco de reemplazo también se ven en `/me/feed` e Inicio. Son correcciones, no rediseños de esas
  superficies.
