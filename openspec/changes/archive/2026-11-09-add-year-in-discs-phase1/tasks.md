## 1. Modelo y servicio

- [x] 1.1 `drizzle/0087_year_share.sql` (`year_share`, `CHECK`, `share_event` con `year`), aplicada en scratch; `schema.ts`, `sql-model.md`, `domain-model.md`
- [x] 1.2 `src/services/laminas/year.ts`: calendario por mes en una zona, cifras, años con escuchas, visibilidad con la marca y su zona; pruebas
- [x] 1.3 Exportación y eliminación de cuenta cubren `year_share` y sus eventos

## 2. Compartir

- [x] 2.1 Objetivo `year` (anónimo con la marca, dueño), imagen Enlace con cifras y hasta 4 carátulas; pruebas y muestras
- [x] 2.2 `year` en `OWN_SHARE_KINDS` y `STOPPABLE_KINDS`: gesto que guarda la zona, aviso, dejar de compartir; pruebas

## 3. Páginas

- [x] 3.1 `/users/[username]/year/[year]`: meses, cifras, "hasta ahora", metadatos, compartir; pruebas
- [x] 3.2 Entradas desde el diario y "Tus años" en `/me/laminas`; pruebas

## 4. Documentación y textos

- [x] 4.1 `docs/05-features/sharing.md` (§4.4, plan y estado), `docs/01-domain/business-rules.md`, `docs/04-api/contracts.md`
- [x] 4.2 Textos es/en y `client-messages`
- [x] 4.3 Smoke `scripts/smoke-test-year-laminas.ts` y su entrada en `AGENTS.md`

## 5. Verificación

- [x] 5.1 Smoke contra Postgres real: `CHECK` de `0087`, meses en la zona (fin de mes), orden por mes, cifras (disco nuevo, artista descubierto y no
  descubierto), visibilidad con y sin marca (anónimo, seguidora, perfil privado, bloqueo), zona de la marca, eventos y cascadas, lectura bajo 100 ms con
  1.000 escuchas
- [x] 5.2 Muestra PNG de la imagen Enlace (es y en)
- [x] 5.3 HTTP sobre el build final: `404`, imagen y tiempos
- [x] 5.4 Navegador con el build final, en escritorio y a 375 px: año desde el diario, compartir con el aviso, ver como anónimo, dejar de compartir
- [x] 5.5 `pnpm run typecheck`, `lint`, `test` y `build`

### Resultados de la verificación (2026-11-09)

- `scripts/smoke-test-year-laminas.ts` pasa contra Postgres real (BD de scratch): `CHECK` de `0087`; una escucha de las 22:00 del 31 de marzo en
  America/Santiago cae en marzo con esa zona y en abril en UTC; marzo ordenado por escuchas y después por la primera; canciones y artistas fuera del
  calendario; cifras (7 escuchas, 4 discos, 1 disco nuevo, 1 artista descubierto y el ya escuchado en 2025 no); año sin escuchas inexistente; "Tus años";
  visibilidad sin marca (solo el dueño), con marca (anónimo en la zona guardada, no en la suya), por año, con bloqueo y con perfil privado (seguidora sí);
  la marca no cambia la audiencia de ninguna escucha; gesto que guarda la zona del pedido, dejar de compartir, `YEAR_NOT_FOUND`; exportación, eventos y
  cascada; la lectura de 1.000 escuchas en unos 20 ms.
- Navegador con el build final y una cuenta de prueba local con 41 escuchas privadas de Black Sabbath (2025 y 2026): enlace "Tu 2026 en discos" en el
  diario, página con "hasta ahora", cifras (0 artistas descubiertos por la escucha de 2025) y los doce meses; la hoja muestra el aviso de qué se verá; tras
  el gesto, "Dejar de compartir"; quitarla vuelve a `404` para un anónimo; "Tus años" en `/me/laminas`. A 375 px, sin desplazamiento horizontal.
- HTTP como anónimo con la marca: página `200` con metadatos (cifras y discos más escuchados), 2025 sin marca `404`, 1999 `404`, imagen `link` 0,14 s,
  `story` 0,57 s y `post` `400` (no es un formato del año). Sin carátulas reales: un servidor en el worktree no ve el espejo.
- Ajuste tras ver la imagen: las cifras en cero no van en la imagen ("0 artistas descubiertos" se leía como un reproche); la página las sigue mostrando.
- `pnpm run typecheck`, `lint`, la suite completa (709 archivos, 7028 pruebas) y `build` pasan. Tras el ajuste de la imagen se repitieron `typecheck`,
  `lint`, el smoke, las pruebas de Láminas, compartir, diario, páginas de usuario e i18n y el `build`, no la suite completa.
