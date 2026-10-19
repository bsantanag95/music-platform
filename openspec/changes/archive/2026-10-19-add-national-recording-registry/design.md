## Context

ADR 0044 dejó los salones de la fama como un tipo de premio (`award.kind = hall_of_fame`): una clase por año como ceremonia, sin
número de edición, solo clases cerradas, fuera de los rankings y los puntajes (`competitionNominations`, `allCeremonies(kind)`).
La sección "Salón de la Fama" de Explorar se hizo para **un** salón: por cada salón, un riel con todas las incorporaciones de su
última clase (`HallOfFameExploreSection`). El hub `/awards` ya tiene un bloque "Salones de la fama" con `HallOfFameTileGrid` (una
tarjeta sencilla por salón con cuatro carátulas). Premios, en cambio, usa `AwardTileGrid`: una tarjeta por premio, con fondo teñido
por la carátula, año en grande y el ganador destacado.

National Recording Registry (datos de la exploración, 2026-10-19; fuentes: comunicados de la Biblioteca del Congreso y Wikipedia):
- Lo crea la ley de preservación de grabaciones de 2000; la Bibliotecaria, con el consejo del National Recording Preservation
  Board y nominaciones del público, elige **25 grabaciones al año** (mínimo 10 años de antigüedad). Total acumulado: 700.
- La clase de cada año se anuncia en primavera, **sin interrupciones**: 2022 (13 de abril), 2023 (12 de abril), 2024 (16 de abril),
  2025 (abril) y 2026 (14 de mayo). No hay gala: la fecha de la clase es la del anuncio, del mismo año que la clase.
- No todo es música: hay discursos, emisiones de radio, entrevistas, pódcast y sonidos de campo. Lo musical mezcla álbumes completos
  (con frecuencia, discos de comedia o de reparto incluidos) y sencillos o grabaciones históricas (desde 1908).
- La lista oficial trae título, artista (o responsable) y año de grabación o publicación, y una descripción editorial propia que no
  se copia.

## Goals / Non-Goals

**Goals:** el Registry como segundo salón sin tocar el modelo; la sección de Explorar con el aspecto de Premios; una sola tarjeta de
salón para Explorar y el hub.
**Non-Goals:** otros salones, clases anteriores, insignias en fichas, resolver al catálogo lo que MusicBrainz no tiene.

## Decisions

### D1. Solo datos: `data/awards/national-recording-registry/`

`categories.json` con `kind: hall_of_fame` y `voting: jury` (la bibliotecaria decide con un consejo asesor; el público solo nomina,
así que `mixed` sería falso). El texto de `votingHall.jury` ("Lo elige un comité de selección") ya existe. Sin migración: los
valores de `kind` y `voting` ya son válidos y `held_on` cae en el año de la clase.

Tres categorías, todas `tier: general`, `honors: performer` y `coverage: complete`:

| Clave | Sujeto | Qué lleva |
|---|---|---|
| `albums` | `release_group` | álbumes completos (incluye comedia y reparto) |
| `songs` | `recording` | sencillos y canciones, ancladas en su disco o sencillo |
| `other` | `release_group` | discursos, radio, entrevistas, pódcast y sonidos de campo |

`other` existe porque la cobertura de un salón es `complete` (la clase se publica entera): omitir lo no musical dejaría cada clase
con menos de 25 entradas y sin explicación. Sus entradas nunca se resuelven (no hay disco que anclar): se cargan como texto con
`artist` = el responsable que cita la Biblioteca (quien habla, el programa). Alternativas: (a) omitir lo no musical y declarar la
cobertura parcial, descartada porque el modelo exige `complete` en un salón y una clase "de 21 de 25" confunde; (b) un sujeto
nuevo `other` en `award_category.subject_kind`, descartado porque pide migración y lectura nueva por una categoría que no enlaza con
nada. Una entrada musical que MusicBrainz no tenga como disco se queda en su categoría (`albums` o `songs`) como texto, igual que
las 10 del Grammy Hall of Fame.

### D2. Qué es cada entrada

Se sigue la clasificación de la propia lista: lo que la Biblioteca llama álbum va en `albums`; el resto de lo musical, en `songs`. Si
la lista da un sencillo de 1927 y MusicBrainz solo lo conoce en una recopilación, la canción se ancla en esa recopilación
(`anchor`) y su carátula es la del disco ancla; si ni eso existe, queda como texto. Se acepta una tasa de enlace menor que la del
Grammy Hall of Fame (81/91): muchas grabaciones son anteriores a 1950 y MusicBrainz las tiene mal o no las tiene.

### D3. La sección de Explorar pasa de riel a tarjetas, como Premios

`HallOfFameExploreSection` deja de renderizar un `RailScroller` por salón. Pasa a ser un encabezado (`SectionHeader`, con "Ver todos"
al hub `/awards`) y `HallOfFameTileGrid`, en la **misma cuadrícula** de Premios (`sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-5`),
de modo que una tarjeta de salón mide lo mismo que una de premio y la sección se alinea con la de arriba. Las incorporaciones salen
de Explorar: se ven en la página de la clase, que la tarjeta abre.

Alternativas descartadas: (a) mantener un riel por salón: con dos salones son ~40 tarjetas apiladas en dos rieles, la sección más
larga de la página para el contenido menos usado; (b) un único riel que mezcle las incorporaciones de todos los salones: pierde de
qué salón es cada una; (c) tarjeta por salón pero conservando el riel del primero: dos estilos en una sección.

### D4. Una sola tarjeta de salón con la forma de `AwardTile`

`HallOfFameTile` se reescribe con el esqueleto de `AwardTile`: `<li>` con fondo teñido por la carátula de la primera incorporación
con disco (difuminada, `blur-2xl`, opacidad 25 %), nombre apagado, **año de la clase en grande** (`font-display text-3xl`), cuatro
carátulas abajo (ya existentes) y el enlace estirado sobre toda la tarjeta (`after:inset-0`) a la clase más reciente. Con
`detailed` (hub) suma la línea de datos (rango de clases, cuántas, quién decide) y las clases anteriores como enlaces propios por
encima, igual que `AwardTile`. Un salón no tiene "ganador destacado" ni etiqueta de categoría, así que no hay fila de trofeo: las
cuatro carátulas ocupan ese lugar. Las carátulas se eligen como hoy (primero las incorporaciones con disco).

Se prefiere reescribir `HallOfFameTile` a generalizar `AwardTile`: el contenido de abajo difiere (trofeo y categoría vs. mosaico) y
forzar ambos en un componente lo llena de ramas. Lo común (fondo difuminado, cabecera) se puede extraer después si aparece un tercer
uso.

### D5. Plural según cuántos salones hay

Con un solo salón la sección sigue diciendo "Salón de la Fama" (se pierde nada); con más, "Salones de la Fama". `hall.exploreHeading` y
`jump.hallOfFame` pasan a mensajes ICU con `plural` sobre la cantidad de salones (es/en). La navegación rápida ya recibe
`visible: hallClasses.length > 0`; solo cambia el texto.

### D6. Nombre del premio

`names.national-recording-registry`: es "Registro Nacional de Grabaciones" y en "National Recording Registry". Se muestra
descriptivamente; sin logo ni descripciones de la Biblioteca (sus comunicados son obra del gobierno federal de EE. UU. y los hechos
de la lista no se protegen, pero no hay razón para copiar prosa). Cada clase cita su comunicado en `sourceUrl`.

## Risks / Trade-offs

- [Baja tasa de enlace por grabaciones históricas] → se publican como texto (la clase se publica igual) y se informa la tasa al
  cargar; no se fuerza ninguna coincidencia dudosa.
- [Mucho texto sin ficha en `other`] → esa categoría no cuenta para las carátulas de la tarjeta ni para ningún puntaje; en la clase
  va al final.
- [Datos históricos mal identificados por MusicBrainz (misma canción, decenas de ediciones)] → `searchAs`/`anchor` a mano para los
  ambiguos y revisión humana al cierre (como en el Grammy Hall of Fame, tarea 5.4).
- [La sección de Explorar deja de mostrar las incorporaciones] → quien quiera verlas abre la tarjeta; es el mismo patrón de
  Premios (la tarjeta muestra una muestra, la ceremonia el detalle).
- [Con dos salones la cuadrícula de 5 deja huecos] → idéntica a Premios cuando tiene menos de cinco premios; es coherente y no
  merece un layout aparte.
- [El hub mezcla dos clases de tarjeta] → ya ocurre (premios arriba, salones abajo en bloques separados).

## Migration Plan

1. Fusionar el código y los datos.
2. En la base real: `npx tsx --env-file=.env scripts/load-awards.ts` (idempotente; crea los stubs de catálogo desde las semillas
   guardadas, sin llamar a MusicBrainz). No hay migración.
3. Reversión: borrar `data/awards/national-recording-registry/` y ejecutar la carga (borra el premio ausente de los archivos con su
   cascada); el código de tarjetas sirve igual con un solo salón.

## Open Questions

- ¿Se muestran en la clase las entradas de `other` al final con un rótulo propio ("Otras grabaciones") o mezcladas? Se resuelve al
  verlo en el navegador: se parte de una categoría propia al final.
