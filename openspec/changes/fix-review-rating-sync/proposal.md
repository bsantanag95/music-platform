## Why

El compositor de reseñas (pestaña Reseñas) y el panel "Tu relación" (cabecera del álbum) escriben el mismo `rating` pero cada uno guarda su propia copia en el estado del cliente, y ninguno se entera de lo que hace el otro hasta recargar la página. Eso produce dos fallos reales:

1. **Sobrescritura silenciosa.** Un usuario elige estrellas en el compositor sin publicar (p. ej. 3★) y luego valora el álbum en el panel (5★). El compositor oculta su selector porque `ownStars` ya es 5, pero su estado local `stars` sigue en 3 y `handleSubmit` lo envía igual: el 3★ pisa el 5★ y, como el upsert escribe `detailedScore ?? null`, además borra el puntaje detallado.
2. **Panel desfasado.** Al publicar una reseña con estrellas, el servidor crea el `rating`, pero el panel conserva su `useState(state.ratings.own)` y `router.refresh()` no lo reinicia: sigue mostrando "sin estrellas" junto a una reseña que ya las tiene, hasta recargar.

Además, la spec `album-review` dice que se exige un rating "para crear o editar" una reseña, mientras que otro requisito de la misma spec y el código (`updateReview`) permiten editar sin rating.

## What Changes

- El compositor solo envía `stars` cuando está mostrando el selector de estrellas (no hay reseña ni valoración vigente). Nunca envía un valor local desfasado respecto de la valoración vigente.
- El panel "Tu relación" adopta la valoración que llega del servidor cuando cambia por una acción ajena al panel (publicar una reseña con estrellas), sin pisar una valoración propia en vuelo ni perder el aviso de puntaje descartado ni el estado de los diálogos abiertos.
- Se corrige la spec: el rating es requisito para **crear** una reseña, no para editarla (editar sigue permitido sin rating, como ya describe el requisito de edición).
- Se confirma por escrito la regla vigente de la reseña: muestra la valoración vigente de su autor (no una copia de la que tenía al publicarse); si el autor borra su rating, la reseña se conserva sin estrellas. No cambia comportamiento.

## Goals

- Que ninguna interacción entre compositor y panel pueda cambiar la valoración vigente sin que el usuario lo haya hecho en ese momento.
- Que, tras reseñar con estrellas, el panel muestre esas estrellas sin recargar.

## Non-Goals

- Cambiar el modelo: la reseña sigue sin guardar estrellas propias (una sola fuente de verdad).
- Cambiar el endpoint de reseñas ni el comportamiento del upsert del servidor (que `stars` sin `detailedScore` descarte el puntaje es regla vigente del rating; el cliente deja de provocarlo, no se relaja).
- Estado compartido entre cliente y componentes de otras superficies (canción, artista): solo el álbum tiene panel y compositor a la vez.
- La escala 1–100 y la representación visual de la nota (ya resuelta en `unify-rating-representation`).

## Capabilities

### New Capabilities
(ninguna)

### Modified Capabilities
- `album-review`: se corrige la exigencia de rating (crear, no editar) y se añade el requisito de que el compositor no sobrescribe la valoración vigente.
- `album-personal-panel`: se añade el requisito de que el panel refleja la valoración creada fuera de él.

## Impact

- Código: `src/components/album/ReviewComposer.tsx` (envío de `stars` condicionado) y `src/components/album/AlbumRelationPanel.tsx` (resincronización con el estado del servidor), más sus tests (`ReviewComposer.test.tsx`, `AlbumRelationPanel.test.tsx`).
- Sin cambios de API, esquema ni dependencias.
- Docs: `docs/05-features/ratings-and-reviews.md` (corregir "crear o editar" y documentar la regla de sincronización).
- Depende de que `unify-rating-representation` (ya en `main`) haya cambiado el compositor al control de estrellas; el cambio actual se apoya en ese estado.
