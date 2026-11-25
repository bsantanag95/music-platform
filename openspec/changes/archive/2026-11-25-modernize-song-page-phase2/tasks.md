## 1. Datos

- [x] 1.1 `getTrackStrip`: `recording.durationSec` en el `select`; `buildTrackStrip` devuelve también `tracks` (lista completa ordenada, con `durationSec`); tests de `buildTrackStrip` actualizados
- [x] 1.2 `onDiscWindow(tracks, index)` pura (≤ 20 pistas: todas; más: 5 antes y 5 después, completando 11 en los extremos, con marcas de corte) + test de propiedades

## 2. Columna «En el disco»

- [x] 2.1 `SongOnDisc` (servidor): rótulo «En el disco · año», filas número · título · duración, la actual con `aria-current` y sin enlace, rótulo «Disco N» con varios medios, «…» en los cortes, pie «N pistas · total» (con «≈» si falta alguna duración) y, recortada, «Ver las N pistas en el disco →»
- [x] 2.2 Mensajes `catalog.song.onDisc` (es/en): rótulo, disco N, pie, total aproximado, ver todas

## 3. Créditos y página

- [x] 3.1 `SongCredits.tsx`: sin caja (filas con filete), Intérpretes y resto en dos columnas desde `xl`, títulos a `text-2xl font-bold`; el mismo título en `SongAppearances` y `SongVersions`
- [x] 3.2 `page.tsx`: rejilla `lg:grid-cols-[minmax(0,1fr)_20rem]` con Composición y Créditos a la izquierda y `SongOnDisc` a la derecha; sin tira, sin columna; sin créditos, la lista sola a `max-w-[20rem]`
- [x] 3.3 Tests de la columna y de la página: lista con la actual marcada, varios discos, ventana de un disco largo, sin tira, sin créditos

## 4. Documentación y verificación

- [x] 4.1 `pnpm run i18n:client-messages`
- [x] 4.2 `docs/05-features/catalog-browsing.md` (sección 3b): la columna y los créditos sin caja
- [x] 4.3 `pnpm run verify` y `pnpm run build`
- [x] 4.4 Navegador a 1440, 1024, 820 y 390 px, sin sesión: Hallowed Be Thy Name (última pista), Run to the Hills (intermedia) y Angel Tonight (34 pistas en 3 discos, a 1440); sin desbordes
