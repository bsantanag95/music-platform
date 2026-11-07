## 1. Modelo

- [x] 1.1 `drizzle/0083_lamina_top.sql` (`kind`, columnas, `CHECK`, `share_event`), aplicada en scratch; `schema.ts`, `sql-model.md`, `domain-model.md`
- [x] 1.2 `src/services/laminas/`: crear, editar, ítems con tope y bloqueo, orden, lectura propia y ajena; pruebas
- [x] 1.3 `/api/me/laminas` y rutas de ítems y orden, con pruebas; `docs/04-api/contracts.md`
- [x] 1.4 Moderación, exportación y eliminación de cuenta: comprobar que cubren `kind = 'top'`, con eventos en `ownShareEvents`

## 2. Imágenes

- [x] 2.1 ADR nuevo del tope de 10; `docs/03-data/data-licensing.md`
- [x] 2.2 `post` y `square` en `SHARE_FORMATS`; `ShareTarget.formats` y `VALIDATION_ERROR` para un formato ajeno
- [x] 2.3 `TopFrame`: Top 5, Top 10 y Grilla, en sus formatos y en Historia; pruebas y muestras
- [x] 2.4 Objetivo `top` (anónimo y dueño, notas, tope de carátulas); pruebas
- [x] 2.5 `images` en el payload y formatos según el objeto en la hoja; pruebas

## 3. Páginas

- [x] 3.1 `/me/laminas` y entrada en el menú de cuenta
- [x] 3.2 Editor `/me/laminas/<id>`: búsqueda, orden con teclado y toque, formato con aviso, notas, audiencia; pruebas
- [x] 3.3 Página pública con metadatos y Compartir; pruebas
- [x] 3.4 `top` en `OWN_SHARE_KINDS` y gesto de hacer pública; pruebas

## 4. Feed

- [x] 4.1 Fuente del feed y fila "publicó una Lámina"; pruebas

## 5. Documentación y textos

- [x] 5.1 `docs/05-features/sharing.md` y `docs/01-domain/business-rules.md`
- [x] 5.2 Textos es/en y `client-messages`
- [x] 5.3 Smoke `scripts/smoke-test-top-laminas.ts` y su entrada en `AGENTS.md`

## 6. Verificación

- [x] 6.1 Smoke contra Postgres real: tope concurrente, exclusión de superficies, notas por visitante, moderación, feed y eventos
- [x] 6.2 Muestras PNG de cada formato, con títulos largos y sin carátula (es y en)
- [x] 6.3 HTTP sobre el build final: metadatos, `404`, formatos y tiempos de imagen en frío y en caliente
- [x] 6.4 Navegador con el build final, en escritorio y a 375 px: crear, ordenar, cambiar formato, publicar y compartir
- [x] 6.5 `pnpm run typecheck`, `lint`, `test` y `build`

### Resultados de la verificación (2026-11-06)

- `scripts/smoke-test-top-laminas.ts` pasa contra Postgres real (BD de scratch): `CHECK` de `0083`, tope con pedidos en paralelo, orden, exclusión de
  las superficies de listas, notas por visitante, formato, audiencia, moderación, feed y eventos.
- Hallazgo corregido: con el pool de 5 conexiones, ocho altas en paralelo se bloqueaban entre sí, porque `addLaminaItem` leía con otra conexión dentro de
  la transacción. La validación pasó a hacerse antes de abrirla.
- HTTP sobre el build de producción, como anónimo: `post`, `link` y `story` responden `200` y `square` `400` en un Top 5; payload con Publicación primero;
  caché corta. Top 10 con 10 carátulas: 4,6 s la primera vez (carátulas remotas) y 0,44–0,49 s después; Historia, 0,46–0,52 s.
- Navegador con sesión de prueba y build final, a 375 px y por el DOM (el panel estaba oculto, sin capturas): crear, buscar y agregar, aviso y gesto de
  hacer pública, paso a la hoja normal con Publicación elegida y página pública como anónimo, sin desplazamiento horizontal. No se probó a mano el
  cambio de formato con pérdida ni el orden: los cubren pruebas de componente y el smoke.
- Muestras PNG revisadas: Top 10 de 7 ítems y Top 10 en Historia, además de las de la propuesta con carátulas reales.
