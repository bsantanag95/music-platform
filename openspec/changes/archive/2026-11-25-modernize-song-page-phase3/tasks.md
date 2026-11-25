## 1. Aparece en

- [x] 1.1 `SongAppearances` (servidor): grupos aplanados en su orden dentro de `DiscographyScroller`, carátulas de 128 px, título en dos líneas, fecha, tipo si no es de estudio, «Primer lanzamiento» con la fecha completa como ayuda; sin «+N» ni columnas
- [x] 1.2 Resumen por tipo junto al título («1 álbum de estudio · 7 recopilaciones»); mensajes `catalog.song.appearances` (es/en)

## 2. Versiones

- [x] 2.1 `DiscRow`: disco con una sola grabación sin variante → el título del disco enlaza a la versión y la celda muestra duración y atributos; sin disco → «Sin disco» enlazado; en filas de varias grabaciones, la que no agrega nada es «Grabación N» (nunca «Ver versión»)
- [x] 2.2 Encabezado «Duración y variantes» (es/en)

## 3. Comentarios y página

- [x] 3.1 `Comments`: prop opcional `headingClassName`; la canción pasa la clase de sus secciones
- [x] 3.2 Tests de la página: franja con todos los discos, tipo y marca original, resumen; versión única enlazada desde el disco y sin «Ver versión»; variantes como hoy; título de comentarios

## 4. Documentación y verificación

- [x] 4.1 `pnpm run i18n:client-messages`
- [x] 4.2 `docs/05-features/catalog-browsing.md` (sección 3b): la franja, las versiones y el cierre de las tres fases
- [x] 4.3 `pnpm run verify` y `pnpm run build`
- [x] 4.4 Navegador a 1440, 1024 y 390 px, sin sesión: Hallowed Be Thy Name (8 apariciones, 18 versiones) y Run to the Hills; sin desbordes
