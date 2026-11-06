## Context

Primera fase de `add-share-user-actions`. Parte de lo que dejó `add-share-foundation`: `ShareTarget` calculado como
anónimo, una sola ruta de imágenes, `ShareAction` (Server Component) y `ShareButton` / `ShareSheet` (cliente).

Lo que se encontró al revisar el código, y que cambia lo que decía `sharing.md`:

- **Valoraciones y comentarios no tienen audiencia.** `rating` y `comment` no tienen columna `audience`: una valoración
  solo la ven el dueño y sus seguidores (feed, huella), salvo las destacadas y la que acompaña a una reseña. La regla
  "tienen audiencia propia" de `business-rules.md` es incorrecta. Esto afecta sobre todo a la Fase 2.
- **Reseña:** `/review/<id>` es pública para cualquiera, salvo oculta por moderación, con las estrellas del autor. El
  puntaje detallado solo lo ve su autor (`define-detailed-score`, D7). Solo existe para álbumes.
- **Camino:** la vista ajena muestra el progreso **de quien mira**, no el del dueño. El progreso del dueño se deriva de
  sus escuchas, que tienen audiencia propia, así que la "barra de progreso" del inventario de `sharing.md` no se puede
  mostrar en la imagen.
- **Huella:** `deriveSummary` escribe sus frases solo en español, y para un anónimo no hay curva de valoraciones.
- **Moderación:** `getUserListDetail` y `getUserCaminoDetail` no filtran `moderation_status`.
- **Dueño:** `/users/<u>/lists/<id>` y `/users/<u>/caminos/<id>` redirigen al dueño a `/me/...`.
- **Comentarios:** los de álbum viven en el layout de pestañas, que no recibe `searchParams`, y `#ancla` nunca llega al
  servidor. `?thread=` solo funciona en artistas.

## Goals / Non-Goals

**Goals:**

- Que todo lo que ya es público y tiene página se comparta con vista previa propia.
- Dirección propia para un comentario.
- Mantener un solo renderizador y marco: los objetos nuevos solo agregan datos al `ShareCard`.

**Non-Goals:**

- Páginas de relación, valoraciones y escuchas, cambiar audiencias desde la hoja, imagen privada del dueño (Fase 2).
- Formato Historia, ofrecimiento en toasts, menús ⋯ (Fase 3).
- Compartir respuestas como objetos propios: llevan a su raíz.
- Traducir `deriveSummary` en las páginas: la imagen usa sus propias frases.

## Decisions

### 1. Seis tipos nuevos, referencia por id

`review`, `comment`, `list`, `camino`, `user_collection`, `fingerprint`. Los cuatro primeros usan el id del objeto; los
dos últimos, el id de la cuenta, igual que `profile` (estable ante un cambio de usuario). `collection` ya es la
colección de Explorar, de ahí `user_collection`.

La migración `0080` reemplaza `chk_share_event_target_kind`; no se edita `0079`. La lista en `kinds.ts` sigue siendo
la fuente de la validación.

### 2. Cita y nota como campos del `ShareCard`

`ShareCard` suma `quote`, `stars` y `byline`, opcionales para no alterar la versión de las imágenes que ya existen. El
renderizador los dibuja en `extra`, debajo de los textos: la cita en Source Serif 4, las estrellas con `ScoreChip` y
`scaleScore`, y la firma. Solo estrellas: la imagen se calcula como anónimo y un anónimo no ve el puntaje detallado.

- **Por qué:** al entrar en el `ShareCard`, la versión de la imagen cambia sola cuando el autor edita el texto o la nota.
- **Alternativa:** un tipo de medio por objeto. Multiplica ramas en `renderMedia` para lo que es un solo bloque de
  texto.

La cita se recorta a 200 caracteres con `clip`. La firma es de quien escribió, no de quien comparte (`sharing.md` §3.4):
va en `subtitle` o `meta`.

### 3. Objetivos en `targets/user-content.ts`, reutilizando la lectura de cada página

Cada cargador llama al mismo servicio que su página con `viewerId = null` (`getReviewDetail`,
`getProfileByUsername` + `audiencesForProfile`, `listProfileCollection`, `getTasteFingerprint`). Así un cambio en las
reglas de la página se hereda.

Para pasar de un id a su dueño, una consulta mínima lee `owner_id`, `kind` y el usuario de la cuenta activa.

- **Reseña:** carátula con disco, álbum, artista, cita, nota y `@autor`. Cuenta desactivada: sin objetivo, aunque la
  página la muestre enmascarada, porque la base define la imagen genérica para ese caso.
- **Lista:** mosaico de hasta 4 carátulas, título, `@dueño` y cantidad. Solo `kind = 'standard'`, audiencia `public`,
  `moderation_status = 'visible'` y que no sea generada (`generatedRefsFor`), porque esa ya se comparte como `collection`.
  Las listas de canciones usan la carátula de su disco. Las de **artistas** son tipográficas: un mosaico de fotos
  necesitaría un crédito por foto, y el ADR 0049 solo cubre carátulas.
- **Camino:** igual que la lista, con `kind = 'custom_journey'` y sin barra de progreso (ver Context).
- **Colección:** las 4 entradas públicas más recientes y conteos por formato. Sin entradas públicas no hay objetivo.
- **Huella:** identidad (foto o monograma), década y familia más presentes, con frases propias en `share.json`. Sin
  década ni familia, no hay objetivo. Un perfil privado tampoco.

### 4. `/comment/<id>` como página propia

`src/app/[locale]/comment/[commentId]/page.tsx`, con UUID sin slug: un comentario no tiene título.

- **Por qué:** es la única forma de tener metadatos propios. Los de álbum viven en un layout sin `searchParams`, y un
  ancla no llega al servidor.
- **Alternativa descartada:** `?thread=` con la imagen del objeto: la cita no se vería en la vista previa, que es el
  motivo de compartir un comentario.

Una función nueva `getCommentPermalink(id, viewerId)` en `social.ts` devuelve comentario, autor y objeto. Reutiliza
`findVisibleRoot` y aplica además cuenta desactivada y bloqueo en ambas direcciones. El listado de comentarios no
filtra bloqueos, pero una dirección directa sí: es lo que llega desde afuera. Una respuesta hace `redirect` a su raíz:
reutiliza la rama sin `strict`. El objeto trae su `href` canónico, porque el layout de álbum no recibe `searchParams`
y una redirección de canonicalización perdería `?thread=`.

La página muestra migas, cita, autor, fecha y "Ver la conversación". Sin formulario de respuesta ni likes: la
conversación vive en su objeto, y duplicarla obligaría a mantener dos superficies.

### 5. Botón del comentario sin objetivo cargado por fila

`Comments` es cliente y carga muchas filas: pedir un objetivo por comentario sería una consulta por fila. El payload se
arma en el cliente con lo que la fila ya tiene (`commentSharePayload` en `src/lib/share/`), con la URL de imagen **sin
`v`**.

La ruta ya resuelve ese caso: genera con los datos actuales y caché corta. La vista previa del crawler sí usa la
versión, porque sale de `generateMetadata`.

### 6. `?thread=` en álbum y canción

En `Comments` el efecto deja de depender de `topics`. Sin hilos, al revelar se desplaza a `#comment-<id>` directamente;
con temas sigue siendo `onInitialOpen` el que desplaza, cuando el hilo termina de cargar.

### 7. Botón en las páginas de gestión

`ShareAction` se agrega en `/me/lists/<id>`, `/me/caminos/<id>` y `/me/collection` con el mismo objetivo anónimo: si lo
del dueño no es público no hay objetivo y no hay botón. Es el comportamiento correcto mientras no exista la Fase 2:
sería peor ofrecer un enlace que un anónimo no puede abrir.

En la reseña, `ShareAction` va en la acción de las migas de la página, no en el modal. Se probó en el modal y se
descartó (plan de respaldo): con la hoja abierta sobre el diálogo, Escape cerraba los dos. El modal ya enlaza a la página
completa de la reseña.

### 8. Moderación en la vista ajena

`getUserListDetail` y `getUserCaminoDetail` filtran `moderation_status = 'visible'` salvo para el dueño (`relation ===
'self'`), que sigue viendo y gestionando lo suyo. Se incluye aquí porque compartir multiplica el alcance de esa URL y
porque el objetivo ya responde genérico: la imagen y la página no pueden contradecirse.

### 9. Borrado con la cuenta

La transacción de `account-lifecycle.ts` borra, antes de la cascada, los `share_event` de `user_collection`,
`fingerprint` y `profile` con el id de la cuenta, y los de `review`, `comment`, `list` y `camino` cuyo objeto es de esa
cuenta. Las referencias son texto: la subconsulta compara con `id::text`.

## Risks / Trade-offs

- **[Varias consultas por imagen de lista]** → un mosaico suma una consulta de ítems y una de artistas. Se mide; la
  imagen se genera una vez por versión.
- **[La versión de lista cambia con cada ítem]** → es lo correcto: la imagen muestra esos ítems.
- **[Hoja sobre un modal]** → Escape cerraba los dos diálogos: el botón queda solo en la página (decisión 7).
- **[Comentario largo]** → `clip` a 200 caracteres y descripción a 160, ya resuelto en la base.
- **[Enlaces viejos de listas ocultas]** → pasan a `404`, que es lo que la moderación pretendía.

## Migration Plan

`0080` en scratch durante el cambio. En la BD real requiere `0079` antes: va junto con ella, y no bloquea nada porque
sin aplicar solo fallaría el registro de eventos, que no interrumpe a nadie.

## Open Questions

Ninguna: las de esta fase se resolvieron al abrir el cambio (2026-11-05).
