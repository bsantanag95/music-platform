## Context

Las sugerencias (`GET /api/search/suggest`) piden candidatos con `fuzzyMatch` de `local-match.ts`:
`search_normalize(col) % q OR search_normalize(col) LIKE '%q%'`, ordenados por `similarity(...)`. Con 3+
caracteres el índice GIN de trigramas de la migración `0050` resuelve el filtro (9–43 ms). Con 2 caracteres:

```
Seq Scan on recording  (actual time=0.062..145.647 rows=4067)
  Filter: ((search_normalize(title) % 'on') OR (search_normalize(title) ~~ '%on%'))
  Rows Removed by Filter: 17873
Execution Time: 146.393 ms
```

`'%on%'` no aporta trigramas al índice, así que recorre la tabla entera y evalúa `unaccent` (dos veces) y la
similitud en cada fila: 146 ms en grabaciones, 167 ms en artistas, 282–360 ms en álbumes.

Pruebas sobre scratch (las que crean DDL, dentro de una transacción deshecha; mediana en caliente):

| Alternativa | `on` canciones | `on` álbumes | `ma` álbumes | `th` álbumes (12.694 coincidencias) |
|---|---|---|---|---|
| Hoy | 146 ms | 282 ms | ~314 ms | ~353 ms |
| Inicio de palabra `~ '(^\| )on'` sobre la expresión (sin migración) | 3,5 ms | 7,9 ms | 20–101 ms | 102–132 ms |
| Índice de palabras `tsvector` + `on:*` | 1,0 ms | 1,9 ms | 3,5 ms | 100 ms |
| **Columna `search_key` guardada + GIN trigramas, inicio de palabra** | — | 3,9 ms | 6,0 ms | **16,4 ms** |

El cuello de botella de los prefijos comunes es comprobar cada candidato: con la expresión, Postgres recalcula
`search_normalize` (con `unaccent`) para miles de filas; con una columna ya normalizada, la comprobación es una
comparación de texto. Crear la columna y su índice en 59.586 álbumes tardó 2,3 s.

## Goals / Non-Goals

**Goals:** 2 caracteres en ≤ 40 ms de mediana para artistas, álbumes y canciones, con candidatos reconocibles.

**Non-Goals:** cambiar 3+ caracteres, la búsqueda completa, los usuarios o retirar los índices de `0050`.

## Decisions

### D1. Semántica con 2 caracteres: inicio de palabra

Con 2 letras, "contiene en cualquier parte" casa miles de nombres sin relación ("Mono" para `on`) y la similitud
por trigramas de una cadena de 2 caracteres no discrimina. Se busca una palabra que empieza por esas letras:
`search_text ~ '(^| )on'`. Es lo que una persona espera mientras escribe y lo que el índice puede servir.

Solo el separador espacio: probadas `(^|[^[:alnum:]])` y `\m`, Postgres no extrae trigramas de esas clases y
vuelve a recorrer la tabla (111–119 ms). Como `search_key` ya convierte la puntuación en espacios ("Rock-On" →
"rock on"), sobre la columna nueva el espacio basta para cubrir guiones y barras.

*Alternativa*: mantener "contiene" y solo acelerar. Descartada: el orden de 2 letras seguiría siendo arbitrario.

### D2. Columna generada guardada `search_text`

```sql
ALTER TABLE artist ADD COLUMN search_text text GENERATED ALWAYS AS (search_key(name)) STORED;
CREATE INDEX idx_artist_search_text_trgm ON artist USING gin (search_text gin_trgm_ops);
-- ídem release_group(title) y recording(title)
```

`search_key` (`0051`) es `IMMUTABLE` y ya llama a `public.search_normalize` calificado (requisito de PG17 en
índices y columnas generadas). Postgres mantiene la columna en cada `INSERT`/`UPDATE` del nombre: la app no la
escribe nunca. Se declara en `schema.ts` con `generatedAlwaysAs`, así drizzle la excluye de los tipos de inserción.

*Alternativas*: índice `tsvector` de palabras (rápido salvo prefijos muy comunes: `th` 100 ms, porque la
ordenación por "empieza por" vuelve a necesitar la normalización); columna sin `STORED` (Postgres no tiene columnas
generadas virtuales indexables en PG17); columna escrita por la app (contradice "updated_at y derivados los
mantiene la base", y podría desincronizarse).

### D3. Elección de los candidatos con 2 caracteres

Entre miles de coincidencias, las primeras 40 por similitud son arbitrarias ("Maa", "MAX"). Orden en SQL con
señales que salen de la propia fila o de un semi-join barato:

| Tipo | Orden de los candidatos |
|---|---|
| Artistas | nombre empieza por → `discography_synced_at IS NOT NULL` → longitud |
| Álbumes | título empieza por → `editions_synced_at IS NOT NULL` (álbum ya abierto) → longitud |
| Canciones | título empieza por → número de pistas de la grabación (subconsulta sobre `idx_track_recording`) → longitud |

Medido: artistas `ma` → Man, Madonna, Manowar, Maroon 5 (10 ms). Para álbumes, "artista explorado" por semi-join
costaba 42–146 ms; `editions_synced_at` es una columna de la fila y cuesta lo mismo que la longitud.

**Cambio al implementar (canciones):** el diseño proponía "grabación de un artista explorado". Sobre la columna costó
30–35 ms y eligió mal: hay 887 artistas explorados, muchos desconocidos, y decenas de «One» del mismo largo dejaban
fuera la de Metallica (`th` → «THE 65 — FWY!»). Contar las pistas de cada grabación (en cuántas ediciones aparece)
cuesta 4–12 ms y elige canciones conocidas (`th` → «The Number of the Beast», «The Trooper», «The Boys Are Back in
Town»).

**Nivel de coincidencia con 2 caracteres:** «On the Floor» (palabra completa `on`) quedaba por delante de «One»
(prefijo) aunque «One» aparezca en más álbumes, y en el navegador «Mo Pair» y «Money Mo» quedaban delante de Mötley
Crüe y Moby. Con 2 letras la palabra aún no está terminada, así que `suggestionTier` (`normalize.ts`) cuenta ambos
niveles igual para los tres tipos y deciden actividad, contenido en caché y álbumes.

Después, cada tipo aplica su orden actual sobre esos candidatos: `rankSuggestionRows` (nivel, actividad,
contenido en caché) para artistas y álbumes, y el agrupamiento por canción de `song-suggestions.ts`.

### D4. Dónde vive

`local-match.ts` gana funciones `shortPrefixArtists`, `shortPrefixReleaseGroups` y `shortPrefixRecordings`
(solo lecturas). `suggest.ts` y `song-suggestions.ts` eligen entre ellas y las actuales según la longitud
normalizada (`=== 2`). La búsqueda completa (`/api/catalog/search`) no cambia.

### D5. ADR

La columna guardada es una decisión de modelo de datos (desnormalización derivada mantenida por la base, como
`updated_at` o la herencia de géneros materializada del ADR 0028): ADR 0031.

## Risks / Trade-offs

- [La migración reescribe tres tablas] → en scratch 2,3 s la mayor; en la base real (~2,7 mil álbumes) es
  instantáneo. Bloquea escrituras durante ese tiempo: se aplica fuera de una ingesta.
- [Espacio] → tres columnas de texto y tres índices GIN (en scratch, del orden de unos MB, similar a los de `0050`).
- [Con 2 letras ya no aparecen coincidencias a mitad de palabra] → intencional; desde la tercera letra vuelve la
  coincidencia tolerante.
- [Fixtures de pruebas con filas completas] → hay que añadir `searchText`; se ajustan en la misma tarea.

## Migration Plan

1. `0067_search_text_columns.sql` (columnas + índices), aplicada con `pnpm run db:migrate` en scratch y después en
   la base real.
2. Despliegue del código. Rollback: revertir el código (las columnas no estorban); la migración inversa sería
   `DROP COLUMN` en un archivo nuevo.

## Open Questions

Ninguna.

## Resultados medidos (2026-10-09)

`suggest()` sobre scratch tras aplicar `0067`, mediana de 5 ejecuciones en caliente:

| Tipo | `on` | `ma` | `th` | `mo` |
|---|---|---|---|---|
| Artistas | 201 → **5,9 ms** | 186 → **9,0 ms** | 184 → **7,9 ms** | 174 → **5,7 ms** |
| Álbumes | 396 → **9,8 ms** | 337 → **12,0 ms** | 373 → **26,2 ms** | 476 → **10,9 ms** |
| Canciones | 187 → **8,9 ms** | 170 → **10,5 ms** | 161 → **19,0 ms** | 137 → **8,2 ms** |

Primeras sugerencias después: artistas `ma` → Man, Madonna, Manowar, Maroon 5; artistas `mo` → Mötley Crüe, Moby,
Mobb Deep (antes «Money Mo», «Keb' Mo'», «Lil' Mo»); álbumes `on` → «On», «One» de U2 y de Metallica; canciones `th` → «That Was
Yesterday» (Foreigner), «The Boys Are Back in Town» (Thin Lizzy), «The Battle of Evermore» (Led Zeppelin), «The
Number of the Beast» (Iron Maiden); antes eran «THC», «Thor», «THEY.» y «The City», «Thumbs»… `EXPLAIN ANALYZE` de las
tres consultas con `th`: `Bitmap Index Scan` sobre `idx_*_search_text_trgm` (3 / 25 / 19 ms).

Las consultas de control con 3+ caracteres (`metal`, `taste`, `dokken back`) devuelven las mismas sugerencias; solo
cambia el orden entre empates exactos de similitud en algún caso (álbumes `metal`), porque la migración reescribió las
tablas y el desempate final es el orden físico.
