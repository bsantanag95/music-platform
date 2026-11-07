## 1. Modelo

- [x] 1.1 `drizzle/0086_lamina_tier.sql` (`kind`, `tier_labels` con `fn_tier_labels_valid`, `user_list_item.tier`, tipo de entidad, `share_event`),
  aplicada en scratch; `schema.ts`, `sql-model.md`, `domain-model.md`
- [x] 1.2 `src/services/laminas/tiers.ts`: crear con prellenado desde la discografía (tramos, bandeja, tope de 50, nace privada), disposición con
  bloqueo, etiquetas, lectura propia y ajena sin bandeja; `LaminaDetail` con `kind`; pruebas
- [x] 1.3 `POST /api/me/laminas` con `kind: 'tier'`, `PUT /api/me/laminas/<id>/tiers` y `tierLabels` en `PATCH`, con pruebas; `docs/04-api/contracts.md`
- [x] 1.4 Moderación, exportación y eliminación de cuenta: comprobar que cubren `kind = 'tier'` y el nivel del ítem

## 2. Imágenes

- [x] 2.1 `TierFrame`: seis niveles con su color, carátulas hasta 10 y fichas de texto, notas, en `post`, `link` y `story`; pruebas y muestras
- [x] 2.2 Objetivo `tier` (anónimo y dueño, sin bandeja, versión por `updated_at`), `SHARE_TARGET_KINDS`; pruebas

## 3. Páginas

- [x] 3.1 `/me/laminas`: tier lists en el listado con su tipo, y alta "Tier list" con el selector de artista
- [x] 3.2 Editor de tier list: niveles, bandeja, arrastrar nativo, menú "Mover a…" con teclado y toque, foco y aviso, etiquetas, quitar, nota
  discreta del dueño; pruebas de componente
- [x] 3.3 Página pública: seis niveles sin bandeja, notas como insignia sobre cada disco, metadatos y Compartir; pruebas
- [x] 3.4 `tier` en `OWN_SHARE_KINDS` y gesto de hacer pública; pruebas

## 4. Feed

- [x] 4.1 Fuente de Láminas del feed con `kind = 'tier'` (con discos en niveles); pruebas

## 5. Documentación y textos

- [x] 5.1 `docs/05-features/sharing.md` (§4.3, D7, estado) y `docs/01-domain/business-rules.md`
- [x] 5.2 Textos es/en y `client-messages`
- [x] 5.3 Smoke `scripts/smoke-test-tier-laminas.ts` y su entrada en `AGENTS.md`

## 6. Verificación

- [x] 6.1 Smoke contra Postgres real: `CHECK` de `0086`, prellenado por tramos, bandeja, tope, disposición atómica y su rechazo, que no toca
  valoraciones, exclusión de superficies, notas por visitante, feed, eventos y cascadas
- [x] 6.2 Muestras PNG: tier list con 50 discos, con etiquetas largas y con niveles vacíos (es y en)
- [x] 6.3 HTTP sobre el build final: `404`, formatos y tiempos de imagen en frío y en caliente
- [x] 6.4 Navegador con el build final, en escritorio y a 375 px: crear desde una discografía, mover con teclado, con el menú y arrastrando,
  renombrar un nivel, publicar y compartir
- [x] 6.5 `pnpm run typecheck`, `lint`, `test` y `build`

### Resultados de la verificación (2026-11-07)

- `scripts/smoke-test-tier-laminas.ts` pasa contra Postgres real (BD de scratch), 61 comprobaciones: `CHECK` de `0086`, prellenado por tramos sin En vivo
  ni discos de invitado, bandeja, tope de 50 (primero los valorados), disposición atómica y su rechazo, pedidos en paralelo, que no toca valoraciones (ni su
  `updated_at`) ni se mueve con ellas, etiquetas, exclusión de las superficies de listas y del Top N, bandeja y notas por visitante, moderación, objetivo de
  imagen (10 carátulas y el resto en texto), gesto, feed, exportación, eventos, cascadas y la lectura de 50 discos en 7,7 ms.
  `scripts/smoke-test-top-laminas.ts` sigue pasando.
- Muestras PNG revisadas: pocos discos, 50 discos, 50 en un nivel, etiquetas largas con notas, Historia y Enlace.
- HTTP sobre el build final, como anónimo: página pública `200` con metadatos por niveles y sin bandeja, `404` de una inexistente; `post`, `link` y
  `story` `200` y `square` `400`; imagen en ~0,3 s. Esos tiempos no incluyen carátulas reales: un servidor en el worktree no ve el espejo de carátulas.
- Navegador con el build final, cuenta de prueba local y las valoraciones de Black Sabbath en scratch: alta desde la discografía, menú "Mover a…" con Enter y
  flechas (guarda, el foco sigue al disco, se anuncia), arrastre con `DragEvent` reales (soltar sobre un disco lo deja antes), y a 375 px menú con toque
  (ítems de 44 px, entra en la pantalla), etiqueta de dos palabras, hacer pública desde la hoja y sin desplazamiento horizontal. La herramienta de
  automatización no inicia un arrastre nativo con el mouse, así que el gesto físico de arrastrar no se probó a mano.
- Hallazgos corregidos en el navegador: el foco no entraba al menú, porque se enfocaba mientras estaba con `visibility: hidden`; una etiqueta larga se
  cortaba en el campo de 64 px (pasó a dos renglones, con Enter para guardar); la hoja mostraba la clave `share.own.notice.tier` sin traducir (texto agregado
  y prueba de que cada tipo propio tiene su aviso).
- `pnpm run typecheck`, `lint`, la suite completa (704 archivos, 6974 pruebas) y `build` pasan. Después de los últimos ajustes se repitieron `typecheck`,
  `lint`, las pruebas de Láminas, compartir, páginas de usuario e i18n y el `build`, no la suite completa.
