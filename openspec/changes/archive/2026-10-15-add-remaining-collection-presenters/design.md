## Context

El contrato de presentadores (ADR 0039) ya existe y tiene dos casos: Premios y Novedades esenciales. Las otras seis
plantillas caen al presentador de su familia (`FAMILY_PRESENTERS`), que da año, fecha o aniversario contra el año de **hoy**.
Cada una sabe algo que la cartela de familia no dice:

| Plantilla | Período (`period_key`) | Orden y regla que ya conoce su `plan()` |
|---|---|---|
| `upcoming` | `evergreen` | primero el calendario enlazado (por rango de popularidad), luego el catálogo por fecha |
| `anniversaries` | `AAAA-MM` | estudios que cumplen años ese mes, redondos (múltiplos de 5) o ≥ 10 años, de más a menos años |
| `genre-spotlight` | `AAAA-Www-<familia>` | un disco por era de `ERA_YEARS` (5) años, cronológico |
| `one-per-decade` | `evergreen` | el mejor estudio de cada década, de la más reciente a la más antigua |
| `top-rated-quarter` | `AAAA-Qn` | mejor promedio de valoraciones del trimestre, con un mínimo |
| `most-reviewed-month` | `AAAA-MM` | más reseñas visibles del mes |

No hay cambio de contrato: todo cabe en resumen, cartela y numeración. Ninguna de las seis necesita grupos propios, salvo
`upcoming`, que agrupa por mes igual que Novedades.

## Goals / Non-Goals

**Goals:**

- Que cada colección diga la regla por la que existe y, disco por disco, qué lo trajo hasta ahí.
- Para los rankings, mostrar la cifra del período del propio ranking, no la de todo el tiempo.
- Reutilizar el contrato y el registro tal como están.

**Non-Goals:**

- Tocar el contrato, el registro o la página del detalle.
- Agrupar por década o por era: serían secciones de un solo disco.
- Cambiar `plan()`.

## Decisions

### 1. El período manda, no el reloj

Los presentadores que dependen de una fecha de la colección (`anniversaries`, `top-rated-quarter`,
`most-reviewed-month`, `genre-spotlight`) la leen de `period_key`, no de `today`. Una colección archivada dice el
aniversario, el trimestre o el mes que tenía entonces. Es una mejora sobre el presentador de familia, que calcula contra
el año de hoy y envejece mal en el archivo.

Un `period_key` que no se pueda interpretar hace que el presentador **se abstenga** (`null`) y la resolución caiga a la
familia: nunca un resumen con un mes inventado.

### 2. Funciones puras de período, aparte de las consultas

`presenters/period.ts` interpreta `AAAA-MM`, `AAAA-Qn` y `AAAA-Www-<familia>` y devuelve límites `[inicio, fin)` en UTC.
Es puro y se prueba sin base. Los presentadores de ranking usan esos límites para consultar solo el período de su ranking.

### 3. Cifras de ranking en una consulta por lote

`presenters/ranking-stats.ts` expone `ratingStats(ids, [inicio, fin))` (promedio y conteo por álbum) y
`reviewCounts(ids, [inicio, fin))` (reseñas visibles por álbum): una consulta por dato, `group by` sobre los ids de la
colección, nunca una por disco. Usan los mismos filtros que la plantilla (valoraciones del período; reseñas
`moderation_status = 'visible'`) para que la cifra coincida con la que armó el ranking.

El promedio se formatea en el mensaje con el esqueleto ICU `{avg, number, ::.0}`, que ya localiza el separador decimal
("4,5" / "4.5"). El presentador entrega el número, no el texto.

### 4. Fechas relativas, pasado y futuro, en un solo helper

`relative.ts` generaliza lo que ya vivía en `new-releases.ts`: dado un día y hoy (UTC), devuelve la cartela de pasado
("Hoy", "Ayer", "Hace N días · fecha", "Hace N semanas · fecha") o de futuro ("Sale hoy", "Sale mañana", "Sale en N días ·
fecha", "Sale en N semanas · fecha"). `new-releases.ts` lo reutiliza sin cambiar su resultado. En `upcoming`, un disco
cuya fecha ya pasó desde que se generó la colección usa la cartela de pasado: dice la verdad en vez de "Sale en -2 días".

### 5. Reglas visibles, no cifras inventadas

Los resúmenes dicen la regla que ya aplica el `plan()`, con las constantes reales (`ERA_YEARS`,
`MIN_RATINGS_PER_ALBUM`), no números escritos a mano en los textos. En `upcoming` no se afirma una ventana: el calendario
no tiene el mismo tope que el catálogo, así que el resumen dice solo el rango real de fechas de los discos mostrados.

### 6. Una cartela, un dato

Cada cartela dice una sola cosa, la que explica el disco en esa colección: la edad (aniversarios), la era (spotlight), la
década (un disco por década), la cuenta regresiva (lo que viene) o la cifra (rankings). El año de lanzamiento deja de
repetirse donde ya está implícito.

## Risks / Trade-offs

- **Una cifra de ranking que no coincide con la del `plan()`** → mismos filtros y mismo período que la plantilla, y una
  prueba contra la base de scratch que compara el orden del ranking con las cifras.
- **Un período ilegible** → el presentador se abstiene y cae a la familia; prueba con claves de período inválidas.
- **Plurales y género en los textos** → ICU `plural` en español e inglés, con la prueba de completitud de claves ya
  existente.
- **Dos consultas más en los rankings** → una por dato y por lote sobre ≤ 12 discos; el detalle ya hace una consulta de
  fechas por colección.
- **El presentador de `anniversaries` cambia la edad mostrada en colecciones archivadas** → es una corrección (hoy dice la
  edad de hoy, no la de entonces) y se documenta.

## Migration Plan

1. Helper de fechas relativas, funciones de período y claves de mensaje.
2. Presentadores de `upcoming`, `anniversaries`, `genre-spotlight` y `one-per-decade` (puros salvo la lectura de fechas).
3. Presentadores de rankings con las cifras por lote.
4. Registro, documentación y smoke test.

Sin migración de datos ni de esquema. Cada presentador es independiente: revertir uno devuelve esa colección a su familia.

## Open Questions

- Ninguna que bloquee: si un presentador necesitara algo que el contrato no puede pedir, se pausa y se discute antes de
  ampliarlo.
