## MODIFIED Requirements

### Requirement: Coincidencia tolerante y orden de sugerencias

Las sugerencias SHALL coincidir sin distinguir mayúsculas ni acentos y SHALL tolerar diferencias
menores de escritura (similitud por trigramas). SHALL ordenarse: coincidencia exacta, luego
prefijo, luego similitud; a igualdad, primero las entidades con actividad en la plataforma. Una
entidad cuyo nombre solo contiene la consulta a mitad de palabra (p. ej. "Morricone" para
`icon`) SHALL quedar detrás de las que coinciden por palabra completa.

Con **exactamente 2 caracteres** tras normalizar, las sugerencias de artistas, álbumes y canciones SHALL
coincidir solo con nombres que tengan **una palabra que empieza por esos caracteres** (las palabras se separan
por espacios después de normalizar puntuación), sin similitud por trigramas. Entre esas coincidencias, los
candidatos que se ordenan SHALL elegirse por: nombre que empieza por los caracteres; después, artista con la
discografía explorada (Artistas), álbum ya abierto en la plataforma (Álbumes) o canción que aparece en más pistas
(Canciones); después, el nombre más corto. Sobre esos candidatos se aplica el orden de cada tipo, con una diferencia:
con 2 caracteres, la coincidencia por palabra completa y por prefijo cuentan como el mismo nivel, porque la palabra
aún no está terminada. Las sugerencias de usuarios no cambian.

#### Scenario: Acentos
- **WHEN** una persona escribe `motorhead` en Artistas
- **THEN** Motörhead aparece como sugerencia

#### Scenario: Palabra completa primero
- **WHEN** una persona escribe `icon` en Artistas y existen "Icon", "Despised Icon" y "Ennio
  Morricone"
- **THEN** "Icon" aparece antes que "Despised Icon" y ambos antes que "Ennio Morricone"

#### Scenario: Dos letras, inicio de palabra
- **WHEN** una persona escribe `on` en Canciones y existen «One», «Ramble On» y «Mono»
- **THEN** «One» y «Ramble On» pueden sugerirse y «Mono» no

#### Scenario: Dos letras, entidades reconocibles primero
- **WHEN** una persona escribe `ma` en Artistas y, entre cientos de nombres que empiezan por "ma", Madonna y
  Manowar tienen la discografía explorada y "Maa" no
- **THEN** Madonna y Manowar aparecen antes que "Maa"

#### Scenario: Dos letras en Canciones, palabra sin terminar
- **WHEN** una persona escribe `on` en Canciones y existen «On the Floor» (en 1 álbum) y «One» de Metallica (en
  3 álbumes), sin actividad ninguna
- **THEN** «One — Metallica» aparece antes que «On the Floor»

#### Scenario: Dos letras en Artistas, palabra sin terminar
- **WHEN** una persona escribe `mo` en Artistas y existen «Mo Pair» (sin discografía explorada) y Mötley Crüe (con
  discografía explorada), sin actividad ninguno
- **THEN** Mötley Crüe aparece antes que «Mo Pair»

#### Scenario: Dos letras con acentos
- **WHEN** una persona escribe `mo` en Artistas
- **THEN** Motörhead puede sugerirse

### Requirement: Tiempo de respuesta de las sugerencias de canción

Las sugerencias de canción SHALL mantener el tiempo de respuesta de una búsqueda local: las señales de orden
SHALL obtenerse con un número fijo de consultas en lote sobre los candidatos (nunca una por candidato), en
paralelo cuando no dependen entre sí. Con 3 caracteres o más tras normalizar, la mediana del cálculo SHALL NOT
superar 40 ms sobre la base de scratch; con 2 caracteres SHALL cumplir "Tiempo de respuesta de las sugerencias de
dos caracteres".

#### Scenario: Consulta habitual

- **WHEN** se piden sugerencias de canción para `taste` sobre la base de scratch
- **THEN** la mediana de varias ejecuciones es de 40 ms o menos

#### Scenario: Consulta de dos caracteres

- **WHEN** se piden sugerencias de canción para `on`
- **THEN** la mediana de varias ejecuciones es de 40 ms o menos

## ADDED Requirements

### Requirement: Tiempo de respuesta de las sugerencias de dos caracteres

Con exactamente 2 caracteres tras normalizar, la mediana del cálculo de sugerencias de artistas, álbumes y
canciones SHALL NOT superar 40 ms sobre la base de scratch, también con los prefijos que casan con miles de
nombres. La búsqueda por inicio de palabra SHALL usar un índice sobre el nombre ya normalizado y guardado, sin
recalcular la normalización de cada candidato.

#### Scenario: Prefijo muy común

- **WHEN** se piden sugerencias de álbumes para `th`, que casa con más de 12.000 títulos en scratch
- **THEN** la mediana de varias ejecuciones es de 40 ms o menos

#### Scenario: Los tres tipos

- **WHEN** se piden sugerencias de artistas, álbumes y canciones para `on`, `ma` y `th`
- **THEN** cada mediana es de 40 ms o menos
