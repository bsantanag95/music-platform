## 1. Lectura de fuentes

- [x] 1.1 `src/services/laminas/sources.ts`: `listLaminaCandidates` por fuente y orden, con los filtros del diseño y hasta 30 candidatos; exportar `RECORDING_YEAR_SQL`; pruebas
- [x] 1.2 `listLaminaSourceOptions`: años, décadas, años de escucha, géneros, artistas y listas propias del tipo; pruebas
- [x] 1.3 `GET /api/me/laminas/sources` y `GET /api/me/laminas/candidates`, con `tz`, validación y `LIST_NOT_FOUND`; pruebas

## 2. Escritura por lote

- [x] 2.1 `createLamina` con `targetIds`: transacción, orden, repetidos, tope y `private` forzada; pruebas
- [x] 2.2 `addLaminaItems`: lote atómico con la validación antes de abrir la transacción; `POST .../items` con `targetIds`; pruebas
- [x] 2.3 `POST /api/me/laminas`: rechazar `audience` junto a `targetIds` y no pedir la comprobación social para un alta privada; pruebas

## 3. Títulos

- [x] 3.1 `suggestLaminaTitle` con la tabla del diseño, corte a 100 y los dos chips de "a mano"; pruebas en es y en

## 4. Interfaz

- [x] 4.1 `LaminaSourcePanel`: fuente, filtros, candidatos numerados, cancelación del pedido anterior y estados vacíos; pruebas
- [x] 4.2 `LaminaCreateForm`: elegir fuente, título que sigue a los filtros y alta con `targetIds`; pruebas
- [x] 4.3 `LaminaEditor`: completar lugares libres y aviso si no es privada; pruebas

## 5. Documentación y textos

- [x] 5.1 `docs/05-features/sharing.md`, `docs/01-domain/business-rules.md` y `docs/04-api/contracts.md`
- [x] 5.2 Textos es/en y `client-messages`
- [x] 5.3 Ampliar `scripts/smoke-test-top-laminas.ts` y su entrada en `AGENTS.md`

## 6. Verificación

- [x] 6.1 Smoke contra Postgres real: orden por fuente, cada filtro, zona horaria del año de escucha, lista ajena, lote atómico, nace privada y presupuesto de 150 ms con 2.000 valoraciones
- [x] 6.2 Navegador con el build final, en escritorio y a 375 px: armar desde cada fuente, cambiar candidatos, completar y publicar
- [x] 6.3 `pnpm run typecheck`, `lint`, `test` y `build`

### Resultados de la verificación (2026-11-07)

- `scripts/smoke-test-top-laminas.ts` pasa contra Postgres real (BD de scratch): orden de cada fuente, cada filtro, zona del año de escucha, lista ajena y de
  otro tipo, opciones, alta y lote atómicos, dos lotes en paralelo y que lo armado nace privado aunque el defecto sea público.
- Hallazgo corregido: el filtro de género por canción como condición medía 170–360 ms con 2.000 valoraciones, porque el planificador estimaba pocas filas y
  repetía el cruce por cada una. Pasó a una lectura aparte (`recordingsInGenreTree`).
- Tiempos con 2.000 valoraciones de discos y 2.000 de canciones, mediana de cinco: candidatos 8 ms; con década 7 ms; con género 50 ms; con año de escucha 13 ms;
  con artista 13 ms; canciones con año 14 ms; canciones con género 70 ms; opciones 62–84 ms. Presupuesto: 150 ms.
- Build de producción por HTTP con sesión de prueba: opciones y candidatos `200`, sin sesión `401`, año con década `400`, lista ajena `404`.
- Navegador con ese build, a 375 px y por el DOM: alta desde valoraciones con año de escucha, título sugerido, nace privada con el defecto en público y notas
  apagadas; completar desde una lista, omitiendo lo que ya estaba y numerando desde el puesto siguiente; aviso con la Lámina pública. Sin desplazamiento
  horizontal, tampoco a 640 px. La fuente de favoritos en el navegador la cubren las pruebas de componente y el smoke.
- Las carátulas no se vieron: el espejo de la BD de scratch vive en la carpeta de la raíz y el worktree responde `404`, así que se mostró el reemplazo.
- `pnpm run typecheck`, `lint`, `test` (691 archivos, 6852 pruebas) y `build` pasan.
