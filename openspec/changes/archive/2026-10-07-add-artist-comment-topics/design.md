## Context

`comment` es polimórfica (`artist_id` / `release_group_id` / `recording_id`, un `CHECK` exige
exactamente uno) y plana: sin título, sin padre, sin categoría. `Comments.tsx` es un componente
cliente que recibe la primera página ya cargada por el servidor y pagina con
`GET /api/catalog/{target}/{id}/comments`. La variante `notes` solo sustituye cadenas de i18n.
Los comentarios de artista también alimentan el feed (`feed.ts`), la actividad de comunidad
(`community-activity.ts`) y "Comentarios populares" de Inicio (`home.ts`), que hoy los muestran
sin contexto.

## Goals / Non-Goals

**Goals:** tema por comentario de artista, filtrable, con `general` por defecto; migración que
conserve las notas existentes; cada superficie que muestra un comentario de artista indica su tema.

**Non-Goals:** respuestas, notificaciones, temas en álbum/canción, edición del tema. Ver propuesta.

## Decisions

### D1. Columna `topic` en `comment`, no tabla aparte
`topic TEXT NULL` en la misma tabla. **Alternativas:** (a) tabla `comment_topic` — un JOIN más en
cada lectura para un dato de un solo valor; (b) etiquetas múltiples — se pidió "un tema", y con
varias el filtro y el feed se vuelven ambiguos. Un comentario, un tema.

### D2. Catálogo cerrado en SQL y en código
Valores `start | albums | songs | general`, con `CHECK`, no `ENUM` de Postgres ni tabla de
catálogo: agregar un tema es una migración que recrea un `CHECK` (igual que `moderation_status`),
sin `ALTER TYPE`. En código, una constante `COMMENT_TOPICS` compartida por el esquema Zod, el
servicio y la UI. Las claves son en inglés (`start`, no `para_empezar`); el texto visible sale de
i18n.

### D3. Tres `CHECK` con nombre, pensando en `add-comment-replies`
```
chk_comment_topic_values          : topic IS NULL OR topic IN ('start','albums','songs','general')
chk_comment_topic_artist_only     : topic IS NULL OR artist_id IS NOT NULL
chk_comment_artist_topic_required : artist_id IS NULL OR topic IS NOT NULL
```
Separados para que el cambio de respuestas (donde la respuesta hereda el tema de su raíz y por eso
tiene `topic NULL`) solo tenga que **recrear el tercero** con `OR parent_id IS NOT NULL`, sin tocar
los otros dos. Un único `CHECK` combinado obligaría a reescribirlo entero.

### D4. Migración con relleno
`0065_comment_topic.sql`: `ADD COLUMN topic TEXT`; `UPDATE comment SET topic = 'general' WHERE
artist_id IS NOT NULL`; recién después los `CHECK` (si no, el tercero fallaría con las filas
existentes); índice parcial `idx_comment_artist_topic ON comment (artist_id, topic, created_at DESC)
WHERE artist_id IS NOT NULL`. El relleno a `general` es lo único honesto: no hay forma de saber de
qué trataban las notas viejas, y no se inventa un tema. (Comprobar al aplicar que `0065` siga libre;
hoy la última es `0064`.)

### D5. El tema se valida en el servicio según el objetivo
`createComment` rechaza `topic` en álbum/canción (`INVALID_TOPIC`, 400) y, en artista, usa
`general` si no llega. La base ya lo garantiza con D3, pero el servicio da el error con código
propio en vez de un `23514` sin traducir. `listComments` rechaza `topic` sobre álbum/canción igual.
Mismo patrón que las reseñas, restringidas a álbum en la capa de validación.

### D6. El tema es inmutable
`PATCH /api/catalog/comments/{id}` sigue editando solo `body`. **Alternativa:** permitir cambiar el
tema — descartado para esta etapa: en el cambio de respuestas el tema de una raíz arrastra a todas
sus respuestas, y moverlas de tema cambiaría debates ya en curso. Quien se equivocó borra y vuelve a
publicar. Se revisa con uso real.

### D7. Filtro en servidor, primera página en servidor
`GET ...?topic=start` filtra en SQL (usa el índice de D4). La página del servidor sigue cargando la
primera página de **todos** los temas; al elegir un chip el cliente pide la primera página de ese
tema y reemplaza la lista, con el mismo cliente `src/lib/api` que ya usa `handleLoadMore`
(TanStack Query no hace falta: es una interacción puntual). Los chips no muestran conteos: serían un
`COUNT` por tema en cada visita, sin un beneficio que lo justifique todavía.

### D8. Tema preseleccionado al escribir
El selector del formulario arranca en `general`; si hay un chip activo distinto de "Todos", arranca en
ese tema. Así comentar desde "Para empezar" no obliga a recordar el selector.

### D9. `Comments` sin `variant`
Se quita `variant` y las cadenas `notes*`. `Comments` recibe `topics?: boolean` (true solo en
artista): activa chips, selector y la etiqueta de tema en cada comentario. Álbum y Canción no pasan
la prop y quedan exactamente como están.

### D10. Superficies que muestran comentarios de artista
Feed, actividad de comunidad y "Comentarios populares" añaden `topic` al elemento y muestran una
etiqueta corta. Ninguna cambia de orden ni de criterio de selección. La exportación de datos
personales incluye `topic`.

## Risks / Trade-offs

- **[El tema puede quedar mal elegido]** (no se edita) → `general` por defecto reduce la fricción;
  se revisa la inmutabilidad con uso real (D6).
- **[Temas poco usados dejan chips vacíos]** → un estado vacío por tema invita a abrirlo; si un tema
  no se usa se retira con una migración nueva.
- **[Choque de nombres con "Empieza por aquí" del perfil]** → la etiqueta visible es "Para empezar".
- **[El feed muestra una etiqueta más]** → solo en comentarios de artista; el resto no cambia.

## Migration Plan

1. Aplicar `0065` (aditiva: columna nullable, relleno, restricciones, índice). Desplegar el código
   después; la columna es nullable al leer, así que el código anterior sigue funcionando.
2. Rollback: la migración no pierde datos; revertir el código es seguro con la columna presente. No
   se prevé migración de bajada.

## Open Questions

- ¿Mostrar conteos por tema cuando haya volumen? (D7)
- ¿Permitir editar el tema? (D6)
