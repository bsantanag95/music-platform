## Context

El modelo de premios (ADR 0032, 0042, 0043) es: `award` → `award_ceremony` (año, edición, fecha) → categorías por
ceremonia → nominaciones (`won`, sujeto del catálogo, texto). Los datos viven en `data/awards/<premio>/`, se resuelven a
MBID con `scripts/resolve-award-nominees.ts` y se cargan con `scripts/load-awards.ts`. El ADR 0043 dejó fuera "los
reconocimientos honoríficos sin nominados".

El Grammy Hall of Fame (datos de la exploración, 2026-10-19):
- Honra grabaciones de más de 25 años, álbumes y canciones de cualquier género; lo decide un comité de miembros de la
  Recording Academy.
- Cada año se anuncia una clase en febrero con una gala en mayo (2026: 14 grabaciones, 11 álbumes y 3 canciones, anunciada
  el 11 de febrero, gala el 8 de mayo). Total acumulado: 1.179. **No hubo clases en 2022 ni en 2023** (la de 2024, de marzo,
  fue la primera desde 2021): las últimas cinco clases son 2020, 2021, 2024, 2025 y 2026, con 25, 29, 10, 13 y 14
  grabaciones. La gala es de 2024 en adelante; la clase 2021 se anunció el 21 de diciembre de 2020 y la 2020 el 14 de
  enero de 2020, sin gala conocida.
- El comunicado oficial solo trae título, artista y formato por entrada, en una lista plana por título: no trae género,
  sello ni año de grabación.
- No hay nominados ni categorías.
- Wikipedia lo lista en cuatro tablas alfabéticas con "Year inducted" (sirve para contrastar, no para extraer).

Lectores de nominaciones que hoy cuentan toda fila como señal de premio: `read.ts` (tarjetas, ganadores recientes, más
premiados), `discovery.ts` y `collections/signal.ts` (dos puntajes `awardScore` que ordenan el catálogo),
`collections/templates-day-zero.ts` (plantilla `grammy-winners`, que toma la ceremonia más reciente de cualquier premio) y
`collection-context.ts` (por premio y año).
`award-anchor-tracks.ts` solo completa pistas del disco ancla de una grabación.

## Goals / Non-Goals

**Goals**: un tipo `hall_of_fame` dentro del modelo actual; Grammy Hall of Fame 2022–2026; sección en Explorar;
exclusión explícita de los rankings. **Non-Goals**: insignias, otros salones, clases anteriores o futuras, género.

## Decisions

### D1. Un tipo de premio, no tablas nuevas

`award.kind TEXT NOT NULL DEFAULT 'competition' CHECK (kind IN ('competition','hall_of_fame'))`. El valor por omisión
describe con verdad a los cinco premios existentes (no es un relleno inventado). Cada clase es una `award_ceremony` (año
de la clase, `held_on` = fecha de la gala; si la fuente no la da, la del anuncio, que puede ser del año anterior:
`CHECK` de `held_on` entre `year - 1` y `year`, y la carga exige el mismo año a una competencia), con dos categorías por clase:

- **Álbumes** (`subject_kind = release_group`): enlaza con la ficha del disco.
- **Canciones** (`subject_kind = recording`): una grabación del catálogo, anclada en el disco donde aparece (ADR 0032,
  punto 3); un sencillo suelto se ancla en su propio sencillo.

Ambas en el nivel `general`, `honors = performer`, cobertura `complete`, con `won = true` en cada incorporación.
Alternativas descartadas: tablas propias (duplica curaduría, resolución y carga); reconocer el tipo por el slug (frágil);
dos premios, uno de álbumes y otro de canciones (parte una clase en dos páginas).

### D2. Las clases no tienen número

`award_ceremony.edition` pasa a admitir `NULL` y su `CHECK` a `edition IS NULL OR edition > 0` (migración `0074`; los únicos
`(award_id, edition)` ya toleran varios nulos). Numerar las clases sería inventar un dato: la Academia no las numera.
Que una competencia exija número y un salón no lo tenga cruza tablas (`award.kind` y `award_ceremony.edition`): lo valida
la carga, no un `CHECK`. Todo consumidor de `edition` (tarjeta, cabecera de la ceremonia, hub) pasa a tratar `number | null`.

### D3. Validación según el tipo

`categories.json` gana `kind` (omitido = `competition`). `validateCeremony` por tipo:
- `competition`: sin cambios (edición obligatoria, mínimo de nominados en listas completas, ganador obligatorio).
- `hall_of_fame`: sin edición, **sin mínimo de nominados** (una clase puede traer solo dos canciones), `coverage`
  `complete`, al menos una incorporación por categoría, y los nominados que no entraron (`won: false`) siguen
  permitidos para un salón futuro que los publique (Rock Hall). `anchor` sigue siendo obligatorio en categorías de
  grabación.

### D4. Los salones no son premios ganados

Cada lector decide su criterio, explícito y con prueba:

| Lector | Criterio |
|---|---|
| Tarjetas de premios (Explorar y hub), `listLatestCeremoniesByAward` | solo `competition` |
| Ganadores recientes, Los más premiados, Tu relación con los ganadores | solo `competition` |
| `awardScore` de `discovery.ts` y de `collections/signal.ts` | solo `competition` |
| Plantilla `grammy-winners` (`templates-day-zero.ts`) | solo `competition`: elegía la ceremonia más reciente **de cualquier premio** y la clase 2026 del salón (8 de mayo) es la más reciente de todas, así que se habría vuelto "Ganadores del grammy-hall-of-fame 2026" |
| `collection-context.ts` | sin cambio: lee por premio y año concretos |
| `award-anchor-tracks.ts` | sin filtro: debe completar el disco ancla también de las canciones de un salón |

Los puntajes de destacados se excluyen para **no alterar el orden del catálogo** sin que nadie lo haya decidido; que una
incorporación al salón sume al puntaje es una decisión de producto aparte (ver Open Questions). Un helper
`competitionOnly()` (condición SQL sobre `award.kind`) evita repetir el filtro y se prueba contra cada lector.

### D5. Presentación según el tipo

La ceremonia de un salón usa las mismas páginas con el vocabulario cambiado por `award.kind`:
- Título "Clase de 2026" (no "Premios X 2026 · 67.ª edición"); no hay edición.
- Rótulo "Ingresó" donde la competencia dice "Ganador"; si un salón no tiene nominados no entrados, no hay bloque
  "Nominados".
- La línea de votación se adapta ("Lo elige un comité de la academia" en vez de "Votan los miembros de la academia").
- No se ofrece "Historia de la categoría" (una categoría de ingresos por año no es una serie de ganadores). La ruta
  `/categories/[key]` sigue existiendo, sin enlaces.
- `/awards/grammy-hall-of-fame` redirige a la clase más reciente, como cualquier premio (`/awards/[award]`); las demás
  clases salen como años (2026, 2025, 2024, 2021, 2020) en la fila "Clase" de la propia página.

### D6. Explorar: sección "Salón de la Fama"

`HallOfFameExploreSection` (`id="salon-de-la-fama"`), entre Premios y Mejor valorados. Por cada salón con al menos una clase
cerrada: encabezado con el nombre del salón y la línea "Clase de 2026 · 14 grabaciones"; un riel horizontal
(`RailScroller`, como los demás) con una tarjeta por incorporación de la última clase (carátula, título, artista; las
canciones con la carátula de su disco ancla), cada una enlazada a su ficha o, si no está en el catálogo, solo texto; y
"Ver todas las clases" hacia `/awards/<salón>`. Se omite sin clases cerradas. Entra a la navegación rápida
(`salon-de-la-fama`, etiqueta "Salón de la Fama") tras Premios, con la misma regla de visibilidad que las demás.

Las tarjetas muestran todas las incorporaciones de la clase (14): un riel desplazable las absorbe sin tope artificial.

### D7. Hub `/awards`

Bajo la grilla de premios y sus bloques, un bloque "Salones de la fama" con una tarjeta por salón (nombre, clases cargadas
y la última con cuatro carátulas). Con solo salones y ningún premio competitivo, el hub sigue siendo el hub (no redirige).
Sin salones, el bloque no se muestra.

### D8. Datos y curaduría

`data/awards/grammy-hall-of-fame/categories.json` (`kind: hall_of_fame`, `voting: academy`, categorías `albums` y
`recordings`) y `ceremonies/{2020,2021,2024,2025,2026}.json` con `sourceUrl` al comunicado oficial de cada clase. Se toman de los
comunicados (título, artista, formato) y se contrastan con las tablas de Wikipedia ("Year inducted"). 91 entradas (25 + 29 + 10 + 13 + 14).
Las canciones llevan `anchor` (su sencillo o el disco donde aparece); la tasa de resolución de canciones será menor que la
de álbumes y las no resueltas se publican como texto. Es curaduría manual con revisión humana, como los demás premios.

### D9. Marca y fuente (ADR 0044)

"Grammy Hall of Fame" se usa como nombre descriptivo, sin logos ni imágenes del Grammy Museum. No se copian las
descripciones del sitio de la Academia: solo hechos (título, artista, formato, año de la clase). Cada clase cita su fuente
visible. El ADR 0044 documenta el tipo `hall_of_fame`, enmienda el punto 3 del ADR 0043 ("no se cargan los
reconocimientos honoríficos") para los salones, y fija los criterios para sumar uno: sujeto del catálogo, decide una
academia, un jurado o un comité (no el público), clases públicas con fuente y volumen abordable.

## Risks / Trade-offs

- [Un salón futuro con nominados no entrados] → El modelo ya lo admite (`won: false`); la presentación omite "Nominados"
  solo si no hay ninguno.
- [Un lector de nominaciones olvidado cuenta el salón como premio] → Auditoría con prueba por lector (D4) y el smoke test
  carga un salón sintético y verifica que no aparece en ningún ranking.
- [Canciones antiguas con ancla pobre (un sencillo de 1926)] → Se publican como texto; no bloquean la carga.
- [`edition` nulo rompe una vista que asumía número] → El tipo pasa a `number | null` y el compilador marca cada uso; la
  prueba de componentes cubre la tarjeta y la cabecera sin edición.
- [El riel muestra 14 tarjetas] → Es un riel desplazable con flechas, como Novedades; no empuja la página.

## Migration Plan

1. `0074_award_kind.sql`: `award.kind` y `edition` nulable. Aditiva: el código anterior ignora `kind` y trata toda
   ceremonia como competitiva; no hay relleno de datos.
2. Aplicar y cargar solo en la base de prueba dentro del cambio; para la real, correr `pnpm run db:migrate` y
   `scripts/load-awards.ts` (paso operativo, como los premios anteriores).
3. Rollback: revertir el commit; la columna y los datos del salón quedan inertes.

## Open Questions

- **¿Suma una incorporación al salón al puntaje de destacados del catálogo?** Esta propuesta dice que no, para no alterar
  el orden actual. Es una decisión de producto que se puede cambiar después con una línea en el helper.
