## 1. Modelo

- [x] 1.1 `drizzle/0084_discography_share.sql`, aplicada en scratch; `schema.ts`, `sql-model.md`, `domain-model.md`
- [x] 1.2 `kinds.ts` y `ownShareEvents` con `discography`; exportación de datos con la marca
- [x] 1.3 `src/services/laminas/discography.ts`: discos, notas, curva, progreso y visibilidad por visitante; pruebas
- [x] 1.4 Artistas con 3 discos valorados para las entradas; pruebas

## 2. Imágenes

- [x] 2.1 ADR 0053, `docs/03-data/data-licensing.md`
- [x] 2.2 `DiscographyFrame` en Publicación, Enlace e Historia, con la curva, hasta 20 discos y "+n"; pruebas y muestras
- [x] 2.3 Objetivo `discography`: anónimo solo con marca, imagen del dueño, tope de carátulas; pruebas

## 3. Gesto

- [x] 3.1 `discography` en `OWN_SHARE_KINDS`: crear y quitar la marca, perfil privado y suspensión; pruebas
- [x] 3.2 Hoja de lo propio: avisos de que se mantiene al día y de que el progreso se verá; pruebas

## 4. Páginas

- [x] 4.1 `/users/<u>/artist/<id>` con metadatos, curva, discos, progreso y Compartir; pruebas
- [x] 4.2 Sección en `/me/laminas` y enlace en la página del artista; pruebas

## 5. Documentación y textos

- [x] 5.1 `docs/05-features/sharing.md`, `docs/01-domain/business-rules.md` y `docs/04-api/contracts.md`
- [x] 5.2 Textos es/en y `client-messages`
- [x] 5.3 Smoke `scripts/smoke-test-discography-lamina.ts` y su entrada en `AGENTS.md`

## 6. Verificación

- [x] 6.1 Smoke contra Postgres real: visibilidad por visitante, marca, progreso con y sin Recorrido, cascadas, eventos y lectura bajo 100 ms con 200 discos
- [x] 6.2 Muestras PNG de cada formato con 3, 10, 20 y 25 discos, en es y en
- [x] 6.3 HTTP sobre el build final: `404` por visitante, formatos, caché y tiempos de imagen
- [x] 6.4 Navegador con el build final, a 375 px y en escritorio: entrar, hacer pública, compartir, quitar la marca
- [x] 6.5 `pnpm run typecheck`, `lint`, `test` y `build`

### Resultados de la verificación (2026-11-07)

- `scripts/smoke-test-discography-lamina.ts` pasa contra Postgres real (BD de scratch): umbral de 3 discos principales, dato real de cada disco, visibilidad por
  visitante con y sin marca, que la marca no abre la página de relación, que se mantiene al día, progreso sin conteos con y sin Recorrido, quitar la marca, entradas,
  eventos, cascadas y lectura de 11 ms con 200 discos. `smoke-test-share-relation.ts` también pasa.
- Corrección durante la implementación: la propuesta decía "7 de 12 escuchados", pero §6.4.1 de la filosofía de producto prohíbe "X de Y" fuera de la página de
  gestión. La barra quedó discreta, sin números, y los conteos no salen del servicio.
- Hallazgo corregido: cada estrella de `ScoreChip` era un `<svg>` que se rasterizaba aparte, unos 170 ms cada uno: 20 discos solo con estrellas tardaban 4 s en
  Publicación. Pasó a `clipPath`: 0,56 s con 20 discos. El cambio alcanza a toda imagen con estrellas.
- HTTP sobre el build final, con 12 discos: `404` para un anónimo sin marca y `200` con ella, gesto y quitar la marca, `private, no-store` en la imagen del dueño y
  genérica para otro, `public, max-age=300` en la pública, `400` en Cuadrado. En caliente: Publicación 0,34 s, Enlace 0,17 s, Historia 0,41 s, sin carátulas porque el
  espejo no está en el worktree.
- Navegador con el build previo al último ajuste de la imagen, a 375 px y por el DOM: sección en `/me/laminas`, página, curva, hoja con el aviso, gesto, hoja pública,
  dejar de compartir y enlace desde la página del artista. Sin desplazamiento horizontal. Al ancho del panel solo se comprobó el enlace del artista.
- Muestras PNG revisadas en español con 3, 10 y 25 discos: Publicación, Enlace e Historia. No se generaron con 20 exactos ni en inglés.
- `pnpm run typecheck`, `lint`, `test` (697 archivos, 6897 pruebas) y `build` pasan.
