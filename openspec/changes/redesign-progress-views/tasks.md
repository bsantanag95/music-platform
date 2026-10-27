## 1. Datos

- [x] 1.1 `progressDetailsByListId` (siguiente disco y última escucha, por lote).
- [x] 1.2 `nextUp` y `lastListenedAt` en los tres listados y en sus esquemas Zod.

## 2. Filas

- [x] 2.1 `ProgressRowMeta` en Detallada (Discografías y Listas para completar) en lugar de "Actualizado".
- [x] 2.2 Etiqueta de estado solo si no está en curso (Detallada e Índice).
- [x] 2.3 Barra discreta en Gráfico.

## 3. Secciones

- [x] 3.1 `ProgressSections` con Archivadas plegada; sin el orden "Por estado".

## 4. Listas que sigo

- [x] 4.1 Segunda fila con `ProgressRowMeta`; menú ⋯ con "Ver lista" y "Dejar de seguir".

## 5. Cierre

- [x] 5.1 Pruebas de componentes y listados.
- [x] 5.2 `docs/04-api/contracts.md` y `docs/05-features/caminos.md`.
- [x] 5.3 typecheck, lint, test y build; verificación en el navegador a 1280 y 375 px.
