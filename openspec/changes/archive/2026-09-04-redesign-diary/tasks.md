## 1. Extracción de piezas compartidas

- [x] 1.1 Crear `src/components/feed/feed-row-parts.tsx` con `TargetTitle`,
  `RelativeDate` y `ProsePanel` movidos desde `FeedActivityList.tsx`, sin cambiar sus
  firmas de props (ya son genéricas: `href/label/artist/layout`, `iso`, `body`).
- [x] 1.2 Actualizar `FeedActivityList.tsx` para importar esas piezas desde
  `feed-row-parts.tsx` en vez de definirlas localmente. `MetaLine`, `GroupRow` y el resto
  de la lógica de feed (peso, agrupamiento, `AuthorLink`) quedan donde están.
- [x] 1.3 `FeedActivityList.test.tsx` sigue en verde sin cambios de aserciones (solo
  ajustar imports si el test importa símbolos internos movidos).

## 2. `DiaryActivityList`

- [x] 2.1 Crear `src/components/diary/DiaryActivityList.tsx`, Client Component, con la
  misma interfaz de props que `DiaryList` (`initial`, `loadMore`, `empty`) — sin
  `readOnly`/`showAuthor`, que no aplican a este componente (queda como reemplazo directo
  del uso propio en `/me/diary`).
- [x] 2.2 Anatomía de fila: `<ul className="border-l border-ink-border">`, cada entrada
  en `<li className="pl-4">` con `TargetTitle` (`layout="inline"`) y una línea de
  metadato propia: contexto (`t("context.…")`) + `ReactionBadge` a la izquierda,
  `RelativeDate` + acciones a la derecha — sin usar `MetaLine` de feed (no hay autor ni
  verbo ajeno que mostrar, ver design.md Decisión 3).
- [x] 2.3 `ProsePanel` para `entry.body` cuando no es null/vacío, igual criterio que
  `isFeedEntryWithText` mapeado a `ListenEntry` (sin depender del tipo `FeedEntry`).
- [x] 2.4 Sin celda de carátula/disco y sin repetir el propio `@username` en ninguna fila.
- [x] 2.5 Regla de no agrupamiento: no se llama a `groupAmbientRuns` en ningún punto del
  render; cada `ListenEntry` es siempre su propio `<li>` (design.md Decisión 2).

## 3. Acciones inline (editar / borrar)

- [x] 3.1 Reemplazar los `<Button variant="ghost">`/`<Button variant="primary">` de
  ampliar/borrar por enlaces de texto (`<button>` con clases, no el componente `Button`):
  `font-data text-xs text-paper-muted hover:text-paper transition-colors` para editar,
  `hover:text-danger` para eliminar, ubicados en la línea de metadato junto a la fecha.
- [x] 3.2 Confirmación de borrado: el aviso (`deleteConfirm`) y las acciones
  confirmar/cancelar pasan a texto inline (`text-danger` + enlaces), sin botón sólido.
- [x] 3.3 El panel de edición (`ListenEntryForm`) se sigue desplegando debajo de la fila
  al activar "editar" — sin cambios de campos. Ajustar sus `rounded` a `rounded-md` para
  alinear con la escala de radios de `DESIGN.md`.
- [x] 3.4 Mantener el manejo de errores existente (`ApiError.code`, `LISTEN_ENTRY_NOT_FOUND`
  al borrar una entrada ya borrada) sin cambios de lógica, solo de presentación del error.

## 4. Página `/me/diary`

- [x] 4.1 `src/app/[locale]/me/diary/page.tsx`: montar `DiaryActivityList` en vez de
  `DiaryList`; contenedor a `max-w-2xl` (igual que `/me/feed`).
- [x] 4.2 Confirmar que `EmptyState` (título/descripción `emptyTitle`/`emptyDescription`)
  se sigue mostrando igual cuando el diario está vacío.

## 5. i18n

- [x] 5.1 Resuelto: clave nueva `edit` ("Editar"/"Edit") en vez de reescribir `expand`
  (que `DiaryList.tsx` sigue usando con "Ampliar"/"Expand" sin cambios). `delete` se
  reusa tal cual. Aplicado en `messages/es/diary.json` y `messages/en/diary.json` con
  paridad de claves.

## 6. Tests

- [x] 6.1 `DiaryActivityList.test.tsx`: fila sin celda ni carátula, riel izquierdo,
  entrada con nota sobre `ProsePanel`, entrada sin nota en una línea, reacción inline,
  fecha relativa, y — el caso central — 3+ entradas sin nota consecutivas se renderizan
  como 3+ `<li>` independientes (no se agrupan). Cubrir también el flujo de edición y
  borrado end-to-end (expandir el formulario, guardar, confirmar borrado, error de
  entrada ya borrada).
- [x] 6.2 `DiaryList.test.tsx` sin cambios (sigue cubriendo el uso de solo lectura en el
  perfil público).
- [x] 6.3 Suite completa (`vitest`) en verde: 204/205 archivos propios del repo, 1251
  tests pasando. El único archivo que falla (`search-catalog.test.ts`, 1 test) vive en
  `.claude/worktrees/fix+feed-activity-polish-2/` — un worktree aislado de otra sesión,
  sin relación con este cambio, y fuera del alcance de `redesign-diary`.

## 7. Verificación y cierre

- [x] 7.1 Revisión visual del usuario en `/me/diary` con sesión: completada en rondas de
  pulido posteriores (una vez que la DB local dejó de estar saturada) — entradas con y
  sin nota, con y sin reacción, editar, borrar, estado vacío, "cargar más", carátula/disco
  por fila, cita editorial de la impresión, destello de guardado, confirmación de borrado.
  Cada ronda se verificó en el navegador contra el servidor real antes de cerrarla.
- [x] 7.2 `tsc --noEmit`, `eslint` (áreas tocadas) y `next build` en verde.
- [x] 7.3 `docs/05-features/listening-diary-and-ratings.md` no documenta la presentación
  del listado (es un doc de modelo de datos) — no requiere cambios.
- [x] 7.4 `openspec validate redesign-diary --strict` → válido.
