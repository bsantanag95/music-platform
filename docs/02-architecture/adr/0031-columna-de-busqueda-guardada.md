# ADR 0031 — Columna de búsqueda guardada para las sugerencias cortas

## Estado

Aceptado (cambio `speed-up-short-suggestions`, 2026-10). Complementa la búsqueda local tolerante de la migración
`0050` y la clave `search_key` de `0051`; no cambia el orden ni la tolerancia de las consultas de 3+ caracteres.

## Contexto

Las sugerencias del buscador se piden desde la segunda letra. Con 2 letras, el patrón `'%ma%'` no aporta trigramas al
índice GIN de `0050`, así que Postgres recorría la tabla entera calculando `unaccent` y la similitud en cada fila.
Medido sobre scratch (29 mil artistas, 60 mil álbumes, 22 mil grabaciones; 2026-10-09):

| Tipo | 2 letras | 3+ letras |
|---|---|---|
| Artistas | 162–170 ms | 9 ms |
| Álbumes | 314–360 ms | 39–43 ms |
| Canciones | 141–154 ms | 14–18 ms |

Buscar "una palabra que empieza por" (`~ '(^| )ma'`) sí usa el índice de `0050`, pero con prefijos comunes ("th" casa
12.694 títulos de álbum) Postgres vuelve a calcular `search_normalize` —con `unaccent`— en cada candidato para
comprobarlo: 100–130 ms. Un índice de palabras (`tsvector`) tenía el mismo problema en ese caso (100 ms).

## Decisión

1. **Se guarda el nombre normalizado** en una columna generada `search_text = public.search_key(nombre o título)`
   (`STORED`) en `artist`, `release_group` y `recording`, con un índice GIN `gin_trgm_ops` sobre ella.
2. **La mantiene la base**, nunca la aplicación: Postgres la recalcula en cada `INSERT`/`UPDATE` del nombre. Es el mismo
   criterio que `updated_at` o la herencia de géneros materializada (ADR 0028): un valor derivado no depende de que cada
   escritor recuerde actualizarlo.
3. **Solo la usan las sugerencias de exactamente 2 caracteres** (inicio de palabra). Las consultas de 3+ caracteres y la
   búsqueda completa siguen con las expresiones e índices de `0050`, sin cambios de orden.

Resultado medido con la columna: "th" en álbumes 16 ms (antes 353 ms), "ma" 6 ms.

## Consecuencias

- La migración reescribe las tres tablas (2,3 s para 60 mil álbumes en scratch) y bloquea sus escrituras mientras
  dura: se aplica fuera de una ingesta.
- Espacio: tres columnas de texto y tres índices GIN (7,9 MB de índices en scratch).
- Las filas completas de `ArtistRow`, `ReleaseGroupRow` y `RecordingRow` incluyen `searchText`; los fixtures de
  pruebas lo declaran.
- Si más adelante las consultas de 3+ caracteres pasan a la columna, los índices de expresión de `0050` sobre esas tres
  tablas podrían retirarse; queda fuera de esta decisión.

## Alternativas descartadas

- **Solo cambiar la consulta** (inicio de palabra sobre la expresión): sin migración, pero los prefijos comunes
  seguían por encima de 100 ms.
- **Índice de palabras `tsvector`**: rápido para prefijos poco comunes, 100 ms para "th".
- **Columna escrita por la aplicación**: se desincroniza si algún camino de ingesta olvida actualizarla.
