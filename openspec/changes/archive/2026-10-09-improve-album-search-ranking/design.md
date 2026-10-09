## Decisiones

**D1 — Notoriedad = `count` de la búsqueda de MusicBrainz.** Cada `release-group` de la respuesta trae el número de ediciones (`count`). Medido (2026-10-09): *Abbey Road* de The Beatles 73 frente a 1–2 de los homónimos; *In Rainbows* de Radiohead 19. No exige solicitudes extra ni una tabla nueva, y es una señal ajena a la plataforma, por lo que va después de la actividad propia. Un campo opcional `popularity` en `RankKey` (ausente = 0) evita tocar los ordenamientos de Artistas y Canciones.

**D2 — Artículo inicial solo para el nivel 2.** Se quita un artículo inicial (the, a, an, el, la, los, las, un, una, le, les, der, die, das) del título y de la consulta solo si queda al menos una palabra, y solo para decidir la igualdad exacta. No se toca `tokenize` ni las claves de búsqueda locales.

**D3 — Consulta = artista → nivel 1.** `coverageLevel` devuelve 1 si algún artista acreditado tiene exactamente las palabras de la consulta. El autotitulado cuenta (nivel 1); un álbum de otro artista que se llama como la consulta queda en 2. `coverageLevel` lo comparten Álbumes, Canciones y Artistas: se verificó que sus pruebas siguen verdes y que la lógica es la deseada (quien escribe un artista busca sus cosas).

**D4 — Candidatos locales del artista.** `releaseGroupsByArtists` (subconsulta sobre `credit` con rol primario, sin `DISTINCT`: Postgres exige que el `ORDER BY` de un `DISTINCT` esté en el `SELECT`) devuelve hasta 10 discos, de estudio primero y por año, excluyendo los marcados fuera de la discografía. Solo corre si la consulta completa es la clave de un artista local.

**D5 — Límite honesto.** Si MusicBrainz no trae el álbum en la página pedida, no hay reordenamiento que lo recupere sin una solicitud más; con `category=studio` (Puerta 1 del onboarding) llega casi siempre. Queda como Non-Goal.

## Medición (scratch, 2026-10-09)

| Consulta | Antes (primeros) | Después (primeros) |
|---|---|---|
| `dark side of the moon` | Future Funk, Moon Byul, Eddy Bailes… (sin Pink Floyd en 33) | The Dark Side of the Moon — Pink Floyd |
| `dark side of the moon` + `studio` | Hedonistas, Dumin & Cavanagh, Medicine Head, Pink Floyd (4.º) | Pink Floyd, The Flaming Lips… |
| `pink floyd` | «Pink Floyd» de Masryat, Pink Floyd (1994, directo)… | The Live Pink Floyd, The Pink Floyd Collection, A Saucerful of Secrets, Meddle… (todos de la banda) |
| `abbey road` | Diana Herrera (sencillo), Various Artists, The Beatles | The Beatles primero |
