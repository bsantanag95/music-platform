## Context

Segunda fase de `add-top-n-lamina`. Decisiones tomadas al abrirla (2026-11-07): la fuente se elige en el alta y en el editor, una Lámina armada desde
una fuente nace privada y el año de escucha entra, leído del diario.

Estado de partida:

- `listMyRatings` ya ordena y filtra por año y década, pero pagina de a 50, calcula facetas de otra pantalla y no conoce género, artista ni diario.
- `favorite` no tiene orden propio más allá de `created_at`. Tiene audiencia; `rating` no.
- `user_list_item` guarda ítems ordenados; `addLaminaItem` agrega de a uno con la fila de la lista bloqueada.
- `albumInGenreTreeOnce` existe porque el `EXISTS` correlacionado sobre `release_group_effective_genre` costó ~300 ms con pocas filas exteriores.
- El pool tiene 5 conexiones: nada puede leer por `db` dentro de una transacción que espera un bloqueo.
- El diario resuelve la zona con `parseTimeZoneParam` (`tz`) en la API y cuenta el año con `make_timestamptz`.

## Goals / Non-Goals

**Goals:**

- Llenar una Lámina en segundos desde datos que la persona ya tiene.
- Que la privacidad de lo armado la garantice el servidor, no la interfaz.

**Non-Goals:**

- Láminas que se recalculan solas; "Arma la tuya" (Fase 3).
- Filtro por tipo de disco, listas guardadas o ajenas, colección física y Caminos como fuente.

## Decisions

### 1. Una fuente copia ítems, una vez

Los ítems se escriben como cualquier otro y los filtros no se guardan.

- **Por qué:** el orden lo decide el autor y una Lámina compartida no debe cambiar sola. Sin migración.
- **Alternativa:** guardar la fuente y recalcular. Eso es una Lámina derivada, otra clase en §4, y pisaría el orden manual.

### 2. Lectura propia en `sources.ts`, sin ampliar `listMyRatings`

`listLaminaCandidates` y `listLaminaSourceOptions` arman una consulta por fuente con un mismo conjunto de condiciones.

- **Por qué:** `listMyRatings` trae facetas, conteos y agrupaciones que aquí sobran, y sumarle filtros mezclaría dos pantallas. Sí se reutilizan sus expresiones: `RECORDING_YEAR_SQL` se exporta.
- **Orden:** valoraciones como "mejor valoradas" (estrellas, detallada, `updated_at`, `id`). Favoritos, por tu valoración si la hay y luego por `created_at` descendente, porque un favorito sin nota no tiene otro rango. Lista, por su `position`.

### 3. Filtros

| Filtro | Álbum | Canción |
|---|---|---|
| `year` / `decade` (excluyentes) | `first_release_year` | `RECORDING_YEAR_SQL` |
| `listenYear` | `listen_entry` del mismo usuario y mismo objetivo, entre `make_timestamptz` del 1/1 y del año siguiente en `tz` | ídem |
| `genre` | subárbol con `albumInGenreTreeOnce` | `recordingsInGenreTree`: lectura aparte que cruza las canciones de la fuente con los álbumes del subárbol |
| `artist` | crédito `primary` en cualquier posición | ídem |

Una escucha de una canción no cuenta para su álbum, ni al revés: el diario registra objetivos, no los deduce. Las escuchas privadas sí cuentan, porque son de la propia persona; la audiencia de la Lámina es lo que las protege (decisión 5).

Las opciones de cada filtro salen de la fuente completa, sin cruzarse entre sí: años, décadas, años de escucha, hasta 20 géneros y hasta 200 artistas, de mayor a menor presencia. Una combinación vacía muestra un estado vacío.

### 4. Alta y lote atómicos

`POST /api/me/laminas` admite `targetIds` y `POST /api/me/laminas/[id]/items` admite `targetIds` además de `targetId`. El lote respeta el orden, omite repetidos y, si no entra entero, responde `400` sin agregar nada.

- **Por qué:** diez `POST` sueltos dejarían Láminas a medio llenar ante un fallo, y competirían por el mismo bloqueo.
- Los objetivos se validan **antes** de abrir la transacción (hallazgo de la Fase 1 con el pool de 5).

### 5. Nace privada, y lo hace cumplir el servidor

Un alta con `targetIds` fija `audience = 'private'` en el servicio. Mandar además `audience` es `VALIDATION_ERROR`.

- **Por qué:** favoritos privados, listas privadas y escuchas privadas pueden terminar en la Lámina, y `resolveNewContentAudience` podría dar `public`. El filtro por año de escucha delata además cuándo se oyó algo. Una regla de privacidad no se deja a la interfaz.
- Publicar usa el gesto existente, "Hacer pública y compartir".
- **Completar en el editor** no cambia la audiencia: la Lámina ya existe y su dueño la ve. Si no es privada, el panel avisa antes de confirmar quién verá lo agregado.
- Las notas siguen apagadas. Elegir valoraciones como fuente no es el gesto de mostrarlas.

### 6. Títulos sugeridos en una función pura

`suggestLaminaTitle` (`src/lib/laminas/suggested-title.ts`) recibe tamaño, tipo, fuente y etiquetas de filtros y devuelve el título con los catálogos. `n` es 5, 10 o 9. Prioridad, de la primera regla que aplique:

| Filtros | es | en |
|---|---|---|
| artista + década o año | Lo mejor de Iron Maiden en los años 80 | The best of Iron Maiden in the 1980s |
| artista | Lo mejor de Iron Maiden | The best of Iron Maiden |
| año de escucha | Lo mejor que escuché en 2026 | The best I heard in 2026 |
| año | Mis 10 discos de 2026 | My 10 albums of 2026 |
| género + década | Top 5 de Metal de los años 90 | Top 5 Metal of the 1990s |
| década | Top 5 de los años 90 | Top 5 of the 1990s |
| género | Mis 10 discos de Metal | My 10 Metal albums |
| favoritos sin filtros | Mis 10 discos favoritos | My 10 favorite albums |
| valoraciones sin filtros | Mis 10 discos mejor valorados | My 10 top rated albums |
| lista | Top 5 de {lista} | Top 5 from {list} |

Con canciones cambia el sustantivo. La década usa `decadeLabel`. El resultado se corta a 100 caracteres. El título sugerido se actualiza con los filtros hasta que la persona edita el campo. **A mano** ofrece dos chips: el año en curso y "de siempre".

### 7. Un panel, dos usos

`LaminaSourcePanel` recibe `entityType`, la cantidad de lugares libres y los ítems que ya están, y entrega la selección ordenada. El alta lo usa con todos los lugares; el editor, con los libres y omitiendo lo que ya está.

Hasta 30 candidatos, con los primeros N marcados y numerados; al llenarse, los demás se deshabilitan. Cambiar un filtro reinicia la selección. La última respuesta gana: el pedido anterior se cancela.

## Risks / Trade-offs

- [El filtro de género por canción, escrito como condición, medía 170–360 ms con 2.000 valoraciones: el planificador estima pocas filas para quien valora mucho y repite el cruce por cada una] → va en una lectura aparte, y el smoke lo mide con presupuesto de 150 ms.
- [Sencillos y discos en vivo entran entre los candidatos] → la vista previa permite quitarlos; filtrar por tipo queda fuera.
- [Una persona con muchos artistas no ve todos en las opciones] → tope de 200 por presencia, en un selector nativo. Quien arma "lo mejor de" un artista lo ha valorado varias veces.
- [Títulos sugeridos con artistas muy largos] → corte a 100 y campo editable.

## Migration Plan

Sin migración ni relleno. Se despliega con el código.

## Open Questions

Ninguna.
