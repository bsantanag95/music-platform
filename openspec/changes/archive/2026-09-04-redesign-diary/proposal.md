## Why

`/me/diary` renderiza cada escucha con `DiaryList`: una tarjeta ancla (`rounded border
border-ink-border bg-ink-surface p-4`) con el título, una línea de metadato y, a la
derecha, dos botones en bloque ("Ampliar"/"Eliminar"). Es la última superficie del
producto que quedó en ese lenguaje visual — el resto del historial cronológico (`/me/feed`,
el preview de feed de seguidos y "Tu rastro reciente" de Inicio) ya migró a
`FeedActivityList`, la presentación por fila que distingue peso de contenido, usa fecha
relativa, tipografía de display para el título y chrome quieto. El diario propio, que es
la superficie de origen de esos datos (`ListenEntry`), es visualmente la más vieja y la
que menos se parece a `DESIGN.md`: los botones en bloque contradicen la regla de chrome
quieto ("furniture, not decoration") y la tarjeta por entrada no tiene la tactilidad de
"objeto sostenido" que el sistema reserva para portadas y superficies de contenido, solo
para chrome.

Este cambio lleva `/me/diary` al mismo lenguaje de fila que ya validó `redesign-feed`,
sin tocar ningún comportamiento del diario (alta, edición, borrado, paginación siguen
igual). Es presentación pura, apoyada en piezas ya existentes.

## What Changes

- **Nuevo componente `DiaryActivityList`** (reemplaza a `DiaryList` únicamente en
  `/me/diary`) con la anatomía de fila de `FeedActivityList` variant `self`: sin celda de
  carátula/disco, riel izquierdo continuo (`border-l border-ink-border`), línea de
  metadato en mono con la fecha relativa a la derecha, título en `font-display`
  subrayado, `ReactionBadge` inline, y la nota (`body`) sobre `ProsePanel` cuando existe.
- **Extracción de piezas presentacionales compartidas** desde `FeedActivityList`
  (`MetaLine`, `TargetTitle`, `RelativeDate`, `ProsePanel`) a un módulo común, para que
  `/me/diary` y las superficies de feed no diverjan con el tiempo. `ReactionBadge` ya es
  compartido; no cambia.
- **Sin agrupación de actividad ambiente en el diario propio.** `groupAmbientRuns` pliega
  3+ escuchas seguidas sin nota en una fila resumen — correcto para un recap de solo
  lectura ("Tu rastro reciente"), pero `/me/diary` es la superficie de gestión: cada
  entrada debe seguir siendo editable y borrable individualmente. El diario **nunca**
  colapsa entradas; cada escucha es siempre su propia fila.
- **Acciones "editar"/"borrar" como enlaces de texto quietos**, no botones en bloque:
  viven en la línea de metadato de cada fila (`font-data text-xs`, hover a ámbar),
  coherente con el resto del sistema de chrome. El panel de edición (`ListenEntryForm`,
  sin cambios de campos) se sigue desplegando debajo de la fila; la confirmación de
  borrado pasa de botón primario a un texto inline con el mismo tratamiento de aviso que
  ya usa el sistema para errores.
- **Shell de página alineado a `/me/feed`:** `/me/diary` pasa de `gap-6` suelto a la
  misma columna `max-w-2xl` que usa `FeedList`.
- Namespace `diary` (`messages/{es,en}/diary.json`) gana las claves de copy que hagan
  falta para las acciones inline (o reutiliza las existentes — se define en `design.md`).

## Capabilities

### New Capabilities

(ninguna)

### Modified Capabilities

- `listen-diary`:
  - **Requirement "Diario propio"** (MODIFIED): se aclara que el listado propio se
    presenta como una lista vertical cronológica de filas, sin tarjetas ancladas ni
    agrupamiento de entradas — cada escucha permanece individualmente accesible para
    editar o borrar.
  - **Requirement de presentación** (ADDED): anatomía de fila para el diario propio
    (riel izquierdo, título como ancla, metadato mono con fecha relativa, panel de nota,
    reacción inline), acciones de edición y borrado como afordancias de texto quietas en
    vez de botones en bloque, y la regla de no agrupar entradas.

## Impact

- **Código:**
  - `src/components/diary/DiaryActivityList.tsx` (nuevo) — reemplaza a `DiaryList` en
    `/me/diary`. `DiaryList.tsx` **no se elimina**: sigue sirviendo al diario embebido de
    solo lectura en `users/[username]` (perfil público), que queda fuera de este cambio.
  - `src/components/feed/` — extracción de `MetaLine`, `TargetTitle`, `RelativeDate` y
    `ProsePanel` de `FeedActivityList.tsx` a un módulo compartido (p. ej.
    `feed-row-parts.tsx`), importado por `FeedActivityList` y por `DiaryActivityList`.
  - `src/app/[locale]/me/diary/page.tsx` — ancho de columna a `max-w-2xl` (sin cambios de
    datos ni de `services/diary`).
  - `src/components/diary/ListenEntryForm.tsx` — sin cambios de campos; ajuste menor de
    radios (`rounded` → `rounded-md`) para alinear con la escala de `DESIGN.md`.
  - `src/components/diary/ReactionBadge.tsx` — sin cambios.
- **Sin cambios de esquema DB, API ni contratos REST.** El diario sigue paginando contra
  `GET /api/me/diary` con el mismo payload (`ListenEntry`).
- **i18n:** `messages/{es,en}/diary.json` — posibles claves nuevas para las acciones
  inline.
- **Documentación:** `docs/05-features/listening-diary-and-ratings.md` (sección de
  presentación, si la tiene) actualizada para reflejar la fila en vez de la tarjeta.
- **Tests:** `DiaryList.test.tsx` se mantiene (cubre el uso de solo lectura); tests nuevos
  para `DiaryActivityList`; si se extraen piezas de `FeedActivityList.test.tsx`, ese
  archivo se ajusta a los imports nuevos sin cambiar sus aserciones.
