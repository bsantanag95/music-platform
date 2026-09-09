## Why

`redefine-content-hierarchy` (D11, Fase 3) define el diario como **capa de consumo pura**:
un registro **intencional** de experiencias, no un historial automático ni un checklist de
completitud. Hoy el diario ya está separado de la opinión (rating y reseña viven en sus
propias tablas), pero:

- **Toda escucha nace `followers`**, incluso un registro rápido sin nota ni reacción — así
  el feed de tu red se llena de "escuché esto" de bajo contenido.
- La acción se llama **"Marcar como escuchado"**, que suena a casilla de completitud —
  exactamente el encuadre que el producto evita (mismo instinto que la prohibición de
  rachas y medallas en `home` / `profile-showcase` / `taste-fingerprint`).
- El diario propio se lee solo como **lista**; falta la sensación de historial que da una
  línea de tiempo por mes.

## What Changes

- **Audiencia por defecto según intención**:
  - Un registro sin impresión ni reacción nace **`private`** (es para vos).
  - Cuando esa entrada gana una impresión o una reacción y el usuario **no eligió una
    audiencia explícita**, su audiencia pasa a **`followers`**.
  - El usuario siempre puede fijar cualquier audiencia; su elección explícita nunca se
    revierte. **Solo aplica a entradas nuevas** (las existentes conservan su audiencia).
  - Consecuencia: el feed recibe solo escuchas con intención (nota/reacción) o con
    audiencia elegida a mano — sin cambiar el filtro del feed, que ya excluye `private`.
- **Vocabulario y encuadre**: la acción de las páginas de catálogo pasa de **"Marcar como
  escuchado"** a **"Registrar escucha"** / **"Anotar en el diario"**. Se audita todo el
  copy del diario para quitar el encuadre de completitud ("escuchado" como casilla); el
  diario se presenta como *tu registro personal de experiencias musicales*, no como
  *historial automático de escuchas*.
- **Vista de cronología** en `/me/diary`: un conmutador entre la **lista** actual y una
  **línea de tiempo agrupada por mes** (encabezado de mes + las entradas de ese mes en
  orden cronológico). No es un resumen estadístico: mismas filas, agrupadas.
- **Sin opinión en el diario** (confirmación, sin cambio de código): el formulario de
  ampliar una escucha ya no ofrece —ni ofrecerá— rating ni reseña; esos actos viven en
  modo Obra.
- **Intensidad inferida, no declarada** (sin campo nuevo): el sistema ya deriva el
  contexto (`first_listen` / `relisten` / `rediscovery`) y la jerarquía del feed ya
  distingue "escucha con nota" (tier 1) de "escucha sin nota" (tier 3). No se agrega un
  selector de intensidad.

## Capabilities

### New Capabilities

_Ninguna._

### Modified Capabilities

- `listen-diary`: la audiencia por defecto de una escucha nueva pasa de `followers` a
  `private`, con promoción a `followers` al ganar intención (impresión o reacción) salvo
  elección explícita; la acción de catálogo cambia de rótulo y encuadre; se añade la vista
  de cronología por mes del diario propio, y una regla de vocabulario/encuadre que prohíbe
  el lenguaje de completitud.

## Impact

- **`src/services/diary/diary.ts`** — `createListenEntry` inserta `audience: "private"` en
  vez de apoyarse en el default `followers` de la columna.
- **`src/components/diary/ListenEntryForm.tsx`** — al editar una entrada cuya audiencia es
  `private` y el usuario no tocó el selector de audiencia, la audiencia sigue a la
  intención: `private` sin nota/reacción, `followers` con nota o reacción. Un flag
  "audiencia elegida a mano" congela ese comportamiento.
- **`src/components/diary/MarkAsListened.tsx`** (+ renombre del archivo opcional) y las
  páginas `artist/[id]`, `album/[id]`, `song/[id]` — nuevo rótulo.
- **`src/components/diary/DiaryActivityList.tsx`** — conmutador Lista / Cronología; la
  cronología agrupa `entries` por mes (cliente, sobre el array acumulado, como el
  agrupado del feed).
- **i18n** `messages/{es,en}/diary.json` — `registerListen` / `logInDiary`, `viewList` /
  `viewTimeline`, encabezado de mes; auditar `markAsListened`, `marked`, `listening`,
  `signInToListen` y textos de encuadre.
- **Docs** `docs/05-features/listening-diary-and-ratings.md` (o el que corresponda) — la
  audiencia por intención, el vocabulario, la vista de cronología.
- **Sin migración**: la columna `listen_entry.audience` conserva su default; solo cambia el
  valor que pasa `createListenEntry`. Las entradas existentes no se tocan.
- Sin cambios en `diary-visibility`, en el feed, ni en el esquema.
