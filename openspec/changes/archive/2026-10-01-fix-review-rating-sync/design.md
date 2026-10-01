## Context

En la página de un álbum conviven dos escritores del mismo `rating` propio:

- `AlbumRelationPanel` (cabecera, en el `layout` de las pestañas): `useState(state.ratings.own)` y `useState(...stars)`. Valorar hace `saveRating` → `getRatings` → `applyRatings`, que actualiza su estado local y llama `router.refresh()`.
- `ReviewComposer` (pestaña Reseñas): recibe `ownStars` como prop del servidor, pero conserva además un `stars` local para cuando el usuario valora desde aquí. Publicar hace `saveReview("release-group", id, { body, title, ...(stars ? { stars } : {}) })`; el servidor hace upsert del rating en la misma transacción y reemplaza **todo** el rating (`detailedScore ?? null`).

`router.refresh()` vuelve a renderizar el servidor y entrega props nuevas, pero React conserva el estado de los componentes ya montados: los `useState(inicial)` no se reinician. De ahí los dos fallos:

1. Compositor: tras valorar en el panel, `ownStars` pasa a >0 (el selector se oculta) pero el `stars` local sigue vivo y se envía al publicar.
2. Panel: tras publicar con estrellas, `state.ratings.own` llega con valor pero el estado local del panel sigue en `null`.

Otras partes del panel no tienen el problema: `ownReviewId` se lee directo de `state`, y el conteo y la media de la comunidad se calculan en el servidor.

## Goals / Non-Goals

**Goals:**
- Compositor: nunca envía un `stars` que no corresponda a lo que el usuario está viendo y eligiendo en ese momento.
- Panel: refleja la valoración vigente del servidor cuando cambia por una acción ajena a él.

**Non-Goals:**
- Cambiar el modelo (la reseña no guarda estrellas), el endpoint o el upsert del servidor.
- Compartir estado cliente entre panel y compositor (contexto, store, eventos).
- Sincronizar entre pestañas del navegador o usuarios distintos.

## Decisions

**D1. La reseña sigue mostrando la valoración vigente (decisión confirmada, sin cambio).** Una copia en la reseña crearía dos fuentes de verdad: la misma persona aparecería con 3★ en la reseña y 5★ en el feed, el perfil y el panel. Si el autor borra su rating, la reseña se conserva sin estrellas (ya especificado en `album-review`). Alternativa descartada: congelar las estrellas al publicar.

**D2. El compositor envía `stars` solo si está mostrando el selector.** Se deriva una única condición `showStarPicker = !review && ownStars === 0` que gobierna tanto el render del selector como el envío: `...(showStarPicker && stars ? { stars } : {})`. `needsStars` se calcula con la misma condición. Así, cuando `ownStars` pasa a >0 por una valoración desde el panel, el valor local deja de enviarse aunque siga en memoria. Se descarta limpiarlo con un efecto: añade un render intermedio y deja la misma ventana si el efecto no corre antes del submit; derivar la condición en el envío es determinista. Alternativa descartada: el servidor ignore `stars` si ya existe rating: cambiaría el contrato (hoy enviar `stars` es la forma de valorar y reseñar a la vez).

**D3. El panel adopta el valor del servidor cuando cambia de fuera, con el patrón "ajustar estado durante el render".** El panel compara la valoración que llega en `state.ratings.own` (por `id`, `stars` y `detailedScore`) con la última que vio del servidor (guardada en un `useState`/`useRef` de "última prop vista"). Si cambió y no hay una valoración propia en vuelo (`ratingBusy` falso), reemplaza `own` y `stars` locales. Esto cubre publicar una reseña con estrellas y es inocuo para valorar desde el panel, porque `applyRatings` ya escribió el mismo valor. Alternativas descartadas:
- `key={signature}` sobre el panel: remonta todo el panel y descartaría el aviso de "puntaje descartado" (`ratingNotice`) y los diálogos abiertos justo cuando `applyRatings` dispara `router.refresh()`.
- `useEffect` que copia la prop al estado: un render con el valor viejo y problemas con `react-hooks/set-state-in-effect`.
- Sacar la valoración del estado local y leerla siempre de la prop: se pierde la actualización inmediata (la prop llega tras el `refresh`) y la restauración al fallar el guardado.

**D4. Corregir la spec, no el código, sobre editar sin rating.** `updateReview` no exige rating y el requisito "Edición y borrado" ya habla de editar título y cuerpo "y, opcionalmente, su rating". El texto "crear o editar" del requisito "La reseña siempre lleva rating" es el que sobra. Un autor que borró su rating puede seguir editando su reseña.

## Risks / Trade-offs

- [El usuario elige 3★ en el compositor, valora 5★ en el panel y no ve que su elección se descartó] → es el comportamiento correcto (lo último que hizo el usuario manda) y el selector del compositor desaparece al mismo tiempo, así que la pantalla ya lo refleja.
- [El panel adopta un valor del servidor mientras el usuario está valorando] → se ignora mientras `ratingBusy` está activo; el resultado de esa valoración llega por `applyRatings`.
- [Dos pestañas del navegador sobre el mismo álbum] → fuera de alcance; el servidor sigue siendo la fuente de verdad y gana la última escritura.
- [`detailedScore` se borra si se envía `stars`] → regla vigente del upsert; este cambio evita que el compositor la dispare por error, no la modifica.

## Migration Plan

Sin migración de datos. Orden: D2 (compositor, el fallo más grave) → D3 (panel) → tests y docs. Rollback: revertir el commit.

## Open Questions

- Ninguna bloqueante. Si más adelante se quiere sincronizar entre pestañas del navegador, sería un cambio aparte (p. ej. revalidar al volver el foco a la página).
