## Why

Las sugerencias del buscador con **2 letras** son entre 10 y 40 veces más lentas que con 3. Medido sobre scratch
(29.086 artistas, 59.586 álbumes, 21.940 grabaciones; mediana en caliente, 2026-10-09):

| Tipo | `on` | `ma` | `th` | con 3+ letras |
|---|---|---|---|---|
| Artistas | 167 ms | 162 ms | 170 ms | 9 ms |
| Álbumes | 360 ms | 314 ms | 353 ms | 39–43 ms |
| Canciones | 154 ms | 141 ms | 152 ms | 14–18 ms |
| Usuarios | 2 ms | 2 ms | 1 ms | 1–2 ms |

Las sugerencias se piden desde la segunda letra, así que es lo primero que ve quien escribe. La causa: el patrón
`'%on%'` no tiene trigramas que extraer, el índice de la migración `0050` no se usa y Postgres recorre la tabla
completa calculando `unaccent` y la similitud en cada fila. Además, con 2 letras la similitud por trigramas no
ordena nada útil: casan miles de nombres y los 40 que se eligen son arbitrarios.

## What Changes

- Con **exactamente 2 caracteres** tras normalizar, las sugerencias de artistas, álbumes y canciones buscan
  nombres con **una palabra que empieza por esas letras** (en vez de "contiene en cualquier parte o se parece").
  Desde 3 caracteres no cambia nada.
- Columna generada `search_text = search_key(nombre o título)` (**guardada**) en `artist`, `release_group` y
  `recording`, con índice GIN de trigramas: la búsqueda por inicio de palabra la usa sin recalcular `unaccent` en
  cada candidato. Migración nueva `0067`.
- Con 2 letras, los candidatos se eligen con señales baratas antes de cortar: el nombre empieza por esas letras;
  artista con discografía explorada; álbum ya abierto (`editions_synced_at`); canción que aparece en más pistas; y
  el nombre más corto. Después sigue el orden actual de cada tipo.
- Límite de tiempo: mediana de 40 ms o menos con 2 caracteres para cada tipo, sobre scratch, incluido el peor
  prefijo medido (`th` en álbumes). Reemplaza el "no empeorar" que dejó `improve-song-suggestions`.

## Goals

- Sugerencias de 2 letras en decenas de milisegundos para todos los tipos.
- Que esas sugerencias muestren entidades reconocibles (Madonna, Manowar, Maroon 5 para `ma`) en vez de las 40
  primeras de un orden arbitrario.

## Non-Goals

- Cambiar las sugerencias con 3+ caracteres, la tolerancia a erratas o la búsqueda completa (`/api/catalog/search`).
- Cambiar las sugerencias de usuarios (ya responden en 1–2 ms).
- Retirar los índices de `0050` (siguen sirviendo a 3+ caracteres y a la búsqueda completa).

## Capabilities

### New Capabilities

_Ninguna._

### Modified Capabilities

- `search-typeahead`: "Coincidencia tolerante y orden de sugerencias" distingue las consultas de 2 caracteres
  (inicio de palabra, sin similitud) y "Tiempo de respuesta de las sugerencias de canción" pasa a un límite
  explícito para 2 caracteres. Se añade el requisito de tiempo de las sugerencias de 2 caracteres para todos los
  tipos.

## Impact

- **Base de datos**: migración `0067_search_text_columns.sql` (tres columnas generadas guardadas y tres índices
  GIN; reescribe las tres tablas: ~2,3 s para 60 mil álbumes en scratch, mucho menos en la base real). Espejo en
  `src/db/schema.ts` y `docs/03-data/sql-model.md`; ADR nuevo sobre la columna de búsqueda guardada.
- **Servicio**: `src/services/catalog/search/local-match.ts` (consultas de prefijo de palabra) y sus llamadas
  desde `suggest.ts` y `song-suggestions.ts`.
- **Pruebas**: los fixtures que construyen filas completas de `ArtistRow`, `ReleaseGroupRow` o `RecordingRow`
  necesitan el campo nuevo.
- Sin cambios de contrato: misma forma de respuesta de `/api/search/suggest`; el orden con 2 letras se documenta en
  `docs/04-api/contracts.md`.
