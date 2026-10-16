## Why

El riel "Más reseñados" de `/explore` mide una sola cosa —cuántas reseñas tiene un disco— y es la señal más escasa de la
plataforma: en la base de scratch hay 19 reseñas sobre 17 discos, frente a 120 escuchas del diario, 116 ítems en listas, 86
valoraciones, 19 discos en colección y 18 artistas seguidos. "Popular" debería decir qué está moviendo a la comunidad, no qué
se reseñó; y hoy una persona que solo escucha, valora o guarda un disco no cuenta para nada. Además la sección habla solo de
álbumes, aunque las canciones y los artistas también reciben actividad.

Conviene resolverlo antes de producción: con pocos datos la sección tiene que mostrar algo honesto desde el primer día y
crecer sola a medida que haya comunidad, sin depender de que alguien la "encienda" más adelante.

## What Changes

- **Una puntuación de popularidad** que suma **personas distintas**, no acciones, con un peso por gesto: favorito 3; reseña 2;
  escucha en el diario, valoración, añadir a una lista y tener en la colección 1; pendiente por escuchar y en búsqueda 0,5. Cada
  persona cuenta cada tipo de gesto una vez por objetivo y aporta como máximo un tope por objetivo. Popular no es bien valorado:
  las estrellas cuentan como gesto, no por su nota.
- **"Popular ahora" reemplaza a "Más reseñados"**: la actividad reciente sobre discos, artistas y canciones **de cualquier época**
  (lo nuevo ya tiene Novedades), en una sola sección con pestañas **Álbumes · Artistas · Canciones**. Álbumes como riel de
  carátulas; artistas y canciones como listas numeradas compactas. Sube en la página: va justo después de Colecciones.
- **Funciona con pocos datos**: ventana de 30 días que se agranda sola a 90 días y luego a "desde siempre" si no alcanza; umbral
  de 2 personas por objetivo que baja a 1 si hace falta; el subtítulo dice qué ventana se usó ("este mes", "en los últimos 3
  meses", "de siempre"). Una pestaña sin contenido suficiente no aparece; si ninguna tiene, la sección se omite.
- **Privacidad**: cuentan las cuentas activas como cifra anónima; lo marcado como privado (escuchas, favoritos, colección, listas
  privadas) y las reseñas ocultas no cuentan; nunca se muestra quién. La cifra "N personas" solo aparece desde 5.
- **El orden "Populares" de los listados** (familia, década, género y la pestaña de álbumes de la página de género) usa la misma
  puntuación, de siempre, en lugar del conteo de valoraciones, y se llama "Populares" / "Popular" en vez de "Más valorados".
- **La colección automática "Lo más reseñado del mes"** se retira y la reemplaza **"Lo más popular del mes"** (`popular-month`)
  con la misma puntuación sobre el mes del período. Las colecciones ya archivadas de la plantilla vieja se conservan.

Fuera de alcance:

- Recomendación personalizada ("popular entre la gente que sigues"): la vista sigue siendo igual para todas las personas.
- Fuentes externas de popularidad (ListenBrainz, Last.fm): solo actividad de la plataforma.
- Listas como objetivo de popularidad (ya tienen su orden "populares" por guardados en `/lists`).

## Capabilities

### New Capabilities

- `popularity`: la puntuación de popularidad (gestos, pesos, personas distintas, tope, privacidad, ventanas y umbrales) para
  álbumes, artistas y canciones.

### Modified Capabilities

- `album-discovery`: secciones de `/explore` (Popular ahora en lugar de Más reseñados, posición, pestañas de artistas y
  canciones), rieles por reglas y navegación rápida.
- `genre-page-catalog`: el orden `populares` usa la puntuación de popularidad.
- `collection-presenters`: se retira el presentador de `most-reviewed-month` y entra el de `popular-month`.
- `explore-day-zero-templates`: las plantillas de comunidad pasan a ser `top-rated-quarter` y `popular-month`.

## Impact

- Servicio nuevo `src/services/discovery/popularity.ts` (consultas por lote, caché con `ttl-cache.ts`); `discovery.ts`
  (`getExplorePage`, orden `popular`); plantilla y presentador de colección; títulos de colección es/en.
- Componentes: sección `PopularNow` (pestañas) y listas compactas de artistas y canciones; `explore/page.tsx`; navegación rápida.
- Mensajes `catalog.json` (es/en). Docs: `docs/01-domain/business-rules.md` (regla de popularidad), ADR 0041,
  `docs/05-features/explore.md`. Sin migraciones ni cambios de API.
