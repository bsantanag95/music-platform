## 1. Modelo y servicio

- [x] 1.1 `drizzle/0088_year_curation.sql` (`year_top`, `year_hidden`), aplicada en scratch; `schema.ts`, `sql-model.md`, `domain-model.md`
- [x] 1.2 `src/services/laminas/year.ts`: ocultos excluidos de calendario y cifras, Top 5 prellenado y guardado (validación, envejecimiento), ocultar y
  mostrar; pruebas
- [x] 1.3 `PUT|DELETE /api/me/year/[year]/top`, `POST|DELETE /api/me/year/[year]/hidden/[id]`; pruebas; `docs/04-api/contracts.md`
- [x] 1.4 Exportación y eliminación de cuenta cubren `year_top` y `year_hidden`

## 2. Imagen

- [x] 2.1 `YearFrame` en Publicación e Historia: Top 5, calendario 4 × 3, cifras, tope de 10 carátulas; pruebas y muestras
- [x] 2.2 Objetivo `year` con `post` por defecto, Enlace con el Top 5; `data-licensing.md`

## 3. Página

- [x] 3.1 Top 5 en la página; para el dueño, cambiar y ordenar (teclado y toque), ocultar desde el calendario y "Ocultos" con "Mostrar"; pruebas

## 4. Documentación y textos

- [x] 4.1 `docs/05-features/sharing.md` (estado) y `docs/01-domain/business-rules.md`
- [x] 4.2 Textos es/en y `client-messages`
- [x] 4.3 Smoke `scripts/smoke-test-year-laminas.ts` ampliado y su entrada en `AGENTS.md`

## 5. Verificación

- [x] 5.1 Smoke contra Postgres real: `CHECK` de `0088`, prellenado por nota, guardado y su validación, envejecimiento, ocultar (calendario, cifras,
  Top 5, anónimo), mostrar, cascadas
- [x] 5.2 Muestras PNG de Publicación e Historia con 12 meses, con meses vacíos y con títulos largos
- [x] 5.3 HTTP sobre el build final: formatos, tiempos de imagen
- [x] 5.4 Navegador con el build final, en escritorio y a 375 px: cambiar y ordenar el Top 5, ocultar y mostrar, compartir
- [x] 5.5 `pnpm run typecheck`, `lint`, `test` y `build`

## Resultados (2026-11-09)

- Suite completa: 711 archivos, 7052 pruebas en verde; `typecheck`, `lint` (sin avisos nuevos: `_score` reemplazado por `withoutScore()`) y `build` pasan.
- Smoke en scratch: sección "Top 5 y ocultos" en verde; lectura bajo 100 ms con 1.000 escuchas (~22 ms).
- Muestras: el número del Top 5 se alineaba mal y los meses repetían el título bajo la carátula → número arriba y meses solo con carátula (o título si no hay).
- HTTP anónimo sobre el build: Publicación 200 (0,60 s), Historia 200, Enlace 200, Cuadrada 400; el HTML público no trae datos de discos ocultos.
- Navegador: Top 5 prellenado por nota (97, 92, 88, 4★, 3,5★); subir con teclado guarda ("Elegido por ti."); ocultar Sabotage baja escuchas 40→37 y
  discos 14→13, rellena el Top 5 y muestra "1 disco oculto"; "Mostrar" lo devuelve. A 375 px sin desborde y botones de 44 px.
