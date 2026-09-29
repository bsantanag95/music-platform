## Context

La pestaña Discografía (`ArtistDiscography`, client component) recibe del servidor **todas** las
secciones con todos sus discos (`sections: { key, items }[]`); la grilla pagina de a 48 solo en el
cliente. La tabla (`DiscographyTable`) ordena por Año, Título, Media y Tú y lleva el menú de
acciones compartido (`AlbumQuickActions`) con las marcas precargadas. La primera visita a un
artista con más de 300 release-groups construye la página con los primeros 300 e ingiere el resto
en segundo plano; mientras tanto `artist.discography_complete_at` es `NULL`.

## Goals / Non-Goals

**Goals:**

- Buscar sobre lo ya cargado, sin request nueva ni cambios de API o esquema.
- Resultados de todas las secciones sin crear una sección "Todos".
- Reutilizar la tabla, las marcas y el menú existentes.

**Non-Goals:**

- Búsqueda de canciones, del catálogo completo, filtros o búsqueda en la URL (ver proposal).

## Decisions

### D1. Filtrado en el cliente sobre las secciones ya cargadas

Los discos ya están en el navegador; filtrar ahí es instantáneo (sin debounce) y no necesita
endpoint. **Alternativa descartada:** `GET /api/catalog/artists/{id}/discography?q=` — suma
latencia y un contrato para datos que ya tenemos. Discografías de cientos de discos siguen siendo
triviales de filtrar en memoria.

### D2. Coincidencia en un módulo puro (`discography-search.ts`)

`normalizeForSearch(text)`: minúsculas, NFD sin marcas diacríticas, ligaduras que NFD no
descompone (`æ→ae`, `œ→oe`, `ø→o`, `ß→ss`, `ł→l`), apóstrofos y comillas tipográficos (`’ ‘ ´ \``,
`“ ”`) a sus equivalentes rectos, y espacios colapsados. Además, el apóstrofo se elimina en ambos
lados para que "dont" encuentre "Don’t". `matchesDisc(item, query, section)`: título normalizado
contiene la consulta; en `appearances` también el nombre del artista principal; si la consulta es
`^\d{4}$`, también `item.year === Number(query)` (O lógico, para no perder un título "1999").
`searchDiscography(sections, query)` devuelve los grupos con coincidencias en el orden del selector
y el conteo por sección. Aislarlo permite testear la tolerancia sin renderizar.

### D3. Estado temporal, no sección ni URL

La consulta vive en `useState` de `ArtistDiscography`. Con texto, se renderizan los resultados en
lugar de la sección activa; la sección activa, su vista (grilla/tabla, guardada por sección) y su
orden no se tocan, así Esc devuelve exactamente lo anterior. **Alternativa descartada:** `?q=` en
la URL — una búsqueda puntual no se comparte, y cada tecla empujaría navegación o `replaceState`
con el router de Next. **Alternativa descartada:** filtrar solo la sección activa — obliga a saber
dónde está el disco, que es justamente el problema.

### D4. Resultados en una sola tabla con un `<tbody>` por sección

`DiscographyTable` pasa a aceptar grupos (`{ key, label, items }[]`); con un solo grupo sin título
se comporta como hoy. En resultados, cada `<tbody>` empieza con una fila de encabezado de grupo
(`<th scope="rowgroup" colSpan>` con nombre y cantidad, `id` para el ancla) y el orden de columnas
se aplica dentro de cada grupo. Un encabezado de columnas compartido evita repetirlo por grupo.
La tabla de resultados usa `key="search"` para no heredar el orden de la sección. **Alternativa
descartada:** grilla en resultados cuando la sección estaba en grilla — mezclar formatos entre
grupos es confuso y la tabla se escanea mejor al buscar.

### D5. Pastillas durante la búsqueda: conteo de coincidencias y ancla al grupo

Mientras se busca, cada pastilla muestra sus coincidencias y pasa de enlace de sección a ancla
`#discography-group-<key>` (sin navegación ni scroll del router); con cero coincidencias queda
atenuada y `aria-disabled`, sin destino. Así las pastillas cumplen el rol de "Todos" sin una
sección nueva. El selector de vista se oculta porque no aplica a los resultados.

### D6. Umbral de 20 discos

Con pocos discos el buscador es ruido visual; 20 es aproximadamente lo que entra en una pantalla
de tabla. Se calcula sobre el total de todas las secciones.

### D7. Campo, teclado y accesibilidad

`<input type="search">` con etiqueta accesible "Buscar en la discografía" y botón para borrar;
Esc borra y mantiene el foco. Una región `aria-live="polite"` anuncia "N resultados". En móvil
(`< sm`) se muestra un botón con ícono de lupa que despliega el campo en una fila propia de ancho
completo y le da foco; en escritorio el campo está siempre visible y compacto.

### D8. Aviso de discografía incompleta y aviso vacío

La página pasa `discographyComplete = artist.discographyCompleteAt !== null`. Si es `false`, los
resultados muestran una nota discreta. El aviso vacío enlaza a `/search?q=<texto>` (búsqueda del
catálogo existente), sin inventar un alcance.

## Risks / Trade-offs

- [Discografía incompleta en la primera visita de artistas enormes] → la nota de D8 lo explica; la
  próxima visita trae el resto.
- [Normalización incompleta para escrituras no latinas] → NFD y minúsculas funcionan para la
  mayoría; transliteración (cirílico ↔ latino, kana) queda fuera, como en `/search`.
- [Tabla con muchos grupos en móvil] → mismas columnas reducidas de la tabla actual; los grupos
  solo agregan una fila de encabezado.
