## 1. Mensajes i18n

- [x] 1.1 Agregar clave `search.loading` (mensaje neutro de consulta) en `messages/es/catalog.json` y `messages/en/catalog.json`
- [x] 1.2 Mantener `search.loadingHint` como variante de primera importación en ambos locales (sin cambios de texto salvo ajuste menor si se requiere)

## 2. Lógica de detección de request lento en SearchForm

- [x] 2.1 Agregar estado `slowRequest` (boolean) y constante `SLOW_REQUEST_THRESHOLD_MS = 3000` en `src/components/catalog/SearchForm.tsx`
- [x] 2.2 Al iniciar la búsqueda, resetear `slowRequest` a `false` y arrancar un `setTimeout` guardado en un `ref` que lo ponga en `true`
- [x] 2.3 Limpiar el timer en el `finally` del handler y en el cleanup de un `useEffect` de unmount
- [x] 2.4 Renderizar `t("search.loading")` durante la carga y conmutar a `t("search.loadingHint")` solo cuando `slowRequest` es `true`, manteniendo `role="status"`

## 3. Tests

- [x] 3.1 Actualizar `src/components/catalog/SearchForm.test.tsx` con `vi.useFakeTimers()`: durante la carga inmediata se muestra el mensaje neutro y **no** `loadingHint`
- [x] 3.2 Agregar escenario donde, avanzados los timers más allá del umbral, `loadingHint` aparece
- [x] 3.3 Agregar verificación de que el timer se limpia al resolver (sin warnings de `act` ni `setState` tras desmontar)

## 4. Validación

- [x] 4.1 Correr `pnpm run typecheck && pnpm run lint && pnpm run test && pnpm run build`
- [x] 4.2 Verificar manualmente con `pnpm dev`: artista cacheado (ej. Sabrina Carpenter) responde rápido sin aviso de primera importación; artista nuevo muestra el aviso pasado el umbral
