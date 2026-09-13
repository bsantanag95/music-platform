## 1. i18n

- [x] 1.1 Agregar `diary.wantToListen`, `diary.wantToListenAdded` y
      `diary.wantToListenRemoved` en `messages/{es,en}/diary.json`.

## 2. UI: acción rápida en la fila del diario

- [x] 2.1 En `src/components/diary/DiaryActivityList.tsx`, importar
      `toggleWantToListen` de `@/lib/api/want-to-listen`.
- [x] 2.2 Agregar estado `wantToListenResult: { id, added } | null` con auto-limpieza a los
      1.5s, calcado del mecanismo ya existente para `savedId`.
- [x] 2.3 Implementar `handleToggleWantToListen(entry)`: no-op para `entry.target.type ===
      "recording"`; llama a `toggleWantToListen` y guarda el resultado (`added = entry !==
      null`); en error, reusa el `actionError` existente.
- [x] 2.4 Agregar el `RowMenuItem` "Quiero volver a escuchar" entre "Mostrar en listas" y
      "Eliminar", oculto para objetivos de tipo canción.
- [x] 2.5 Extender la condición de destello ámbar de la fila (`savedId === entry.id`) para
      incluir `wantToListenResult?.id === entry.id`.
- [x] 2.6 Extender el `role="status"` existente para anunciar `wantToListenAdded` o
      `wantToListenRemoved` según el resultado, sin pisar el anuncio de guardado.

## 3. Tests

- [x] 3.1 Mockear `@/lib/api/want-to-listen` en `DiaryActivityList.test.tsx`.
- [x] 3.2 Test: elegir la acción agrega el objetivo (destello + anuncio de "se agregó").
- [x] 3.3 Test: un segundo toggle sobre un objetivo ya presente anuncia "se quitó".
- [x] 3.4 Test: el menú de una fila de canción no ofrece la acción.

## 4. Verificación final

- [x] 4.1 Typecheck, lint, tests (suite completa) y build.
- [x] 4.2 Verificación manual en navegador: abrir el menú de una fila de artista, alternar
      Want to Listen dos veces seguidas y confirmar que el anuncio y el destello reflejan
      "agregado" y luego "quitado" respectivamente.
