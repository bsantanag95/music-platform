## 1. Servicio y API

- [x] 1.1 `placeTargets` en `src/services/laminas/tiers.ts` (nota del dueño → nivel o bandeja) y prellenado de Fase 1 sobre ella; pruebas
- [x] 1.2 Fuente `album` (pistas de la edición representativa, sin repetir grabación, hasta 50) y `picked` (de 1 a 50, validados, del tipo); tier lists
  de canciones; combinaciones inválidas; pruebas
- [x] 1.3 `addTierListItem` con bloqueo y tope; `POST /api/me/laminas/[id]/items` despachado por tipo; pruebas
- [x] 1.4 `limit` en `listLaminaCandidates` y en `GET /api/me/laminas/candidates` (de 1 a 50, 30 por defecto); pruebas
- [x] 1.5 `docs/04-api/contracts.md`

## 2. Interfaz

- [x] 2.1 `useLaminaSource` con `limit`; panel de fuentes sin puestos para la tier list
- [x] 2.2 `TierListCreateForm`: tipo, fuentes por tipo (discografía, disco, valoraciones, lista), títulos sugeridos; pruebas
- [x] 2.3 `TierListEditor`: buscador para agregar, anuncio; pruebas
- [x] 2.4 Página pública e imagen con canciones (enlace a la canción, carátula del disco); pruebas

## 3. Documentación y textos

- [x] 3.1 `docs/05-features/sharing.md` (§4.3, estado) y `docs/01-domain/business-rules.md`
- [x] 3.2 Textos es/en y `client-messages`
- [x] 3.3 Smoke `scripts/smoke-test-tier-laminas.ts` ampliado y su entrada en `AGENTS.md`

## 4. Verificación

- [x] 4.1 Smoke contra Postgres real: canciones de un disco (orden, grabación repetida, sin pistas), `picked` (validación, ubicación, tipo), alta a mano
  (nivel, bandeja, tope con pedidos en paralelo), vista previa de 50, que no toca valoraciones
- [x] 4.2 Muestra PNG de una tier list de canciones
- [x] 4.3 Navegador con el build final, en escritorio y a 375 px: canciones de un disco, valoraciones con filtro de artista, una lista, quitar de la
  vista previa, agregar a mano
- [x] 4.4 `pnpm run typecheck`, `lint`, `test` y `build`

### Resultados de la verificación (2026-11-07)

- `scripts/smoke-test-tier-laminas.ts` pasa contra Postgres real (BD de scratch) con la Fase 2: canciones de un disco (nacen privadas, cada una en su nivel,
  las demás en la bandeja en el orden del disco, la grabación repetida una vez, disco sin pistas y combinaciones de tipo rechazadas, la imagen cuenta
  canciones), lo elegido (nivel por nota, sin repetir, en orden; otro tipo e inexistente rechazados), la vista previa (30 sin límite, 40 con límite 50, 51
  rechazado, canciones valoradas de un artista), el alta a mano (4 estrellas en B, sin nota al final de la bandeja, repetido, tipo, ajeno, llena, tope con
  pedidos en paralelo) y que nada tocó una valoración ni su `updated_at`. `scripts/smoke-test-top-laminas.ts` sigue pasando.
- Navegador con el build final y una cuenta de prueba local en scratch: tier list de canciones de un disco (2 en S, 1 en A, 1 en D, 6 en la bandeja), de
  discos desde mis valoraciones con el filtro de los 70 (8 candidatos, quitar uno deja 7 y el disco quitado no entra), agregar a mano un disco valorado
  (cae en S y se anuncia), y a 375 px el alta con sus fuentes. HTTP como anónimo: la de canciones pública responde `200`, enlaza a `/song/`, con etiquetas
  y descripción por canción; imagen `post` en 0,55 s (sin carátulas reales: un servidor en el worktree no ve el espejo).
- Hallazgos corregidos en el navegador: el título de una década decía "de años 70" (ahora "de los años 70", con género y año o década por separado); las
  etiquetas de cada nivel para lectores de pantalla decían "discos" en una tier list de canciones; en `/me/laminas` un título largo desbordaba la tarjeta a
  375 px (faltaba `min-w-0` en el ítem de la grilla, también para el Top N).
- `pnpm run typecheck`, `lint`, la suite completa (706 archivos, 6992 pruebas) y `build` pasan. Después de los ajustes del navegador se repitieron
  `typecheck`, `lint`, las pruebas de Láminas, tier list, compartir, páginas de usuario e i18n y el `build`, no la suite completa.
