# rating-display Specification

## Purpose
TBD - created by archiving change unify-rating-representation. Update Purpose after archive.
## Requirements
### Requirement: La nota de un usuario se representa con estrellas
La valoración de un usuario sobre un álbum, canción o artista (escala de ½ a 5 en pasos de ½)
SHALL representarse siempre con estrellas, en todas las superficies de la plataforma: panel
"Tu relación", tracklist, feed de actividad, valoraciones destacadas y reseñas del perfil,
índice y artículo de reseña, comentarios populares, marcas de la discografía y compositor de
reseñas. Ninguna superficie SHALL usar otro símbolo (barras, medidores, puntos, chips
numéricos) para ese dato.

#### Scenario: La misma nota se ve igual en superficies distintas
- **WHEN** un usuario valora un álbum con 4,5 estrellas
- **THEN** ese 4,5 se muestra con estrellas en el panel del álbum, en el feed de quienes lo
  siguen, en sus valoraciones destacadas y en su reseña, sin que ninguna lo dibuje con otro
  símbolo

#### Scenario: Ninguna superficie usa un medidor de barras para la nota
- **WHEN** se inspeccionan las superficies que muestran la nota de un usuario
- **THEN** ninguna renderiza una escalera de barras ni un medidor equivalente para esa nota

### Requirement: Dos formas de la estrella
La representación SHALL tener dos formas: la **fila** de cinco estrellas dibujadas (llenas,
medias o vacías) para las superficies donde la nota es protagonista, y la **forma compacta**
`★ 4,5` (una estrella y el número) para las superficies densas donde no cabe una fila
(marca sobre la carátula de la discografía, fila compacta del feed, comentarios populares).
La media estrella SHALL dibujarse como media estrella en la fila, no como el carácter `½`.
La forma compacta SHALL llevar siempre la estrella: NUNCA un número suelto. El número SHALL
formatearse con la convención del idioma (coma decimal en español), en ambas formas. El
relleno SHALL ser el único uso de ámbar de la representación; las estrellas vacías SHALL
ser un contorno neutro.

#### Scenario: Media estrella en la fila
- **WHEN** se muestra una nota de 3,5 estrellas como fila
- **THEN** se dibujan tres estrellas llenas, una media y una vacía

#### Scenario: Forma compacta
- **WHEN** se muestra una nota de 4 estrellas sobre la carátula de un disco en la discografía
- **THEN** se muestra `★ 4` como una sola estrella con el número, sin fila de cinco

#### Scenario: Forma compacta en una corrida plegada del feed
- **WHEN** el feed pliega 3 o más valoraciones de un mismo autor en una fila
- **THEN** cada valor se muestra como `★ 4,5` (estrella y número con coma), no como `(4.5)`

### Requirement: Accesibilidad de la nota
Cada nota mostrada SHALL exponer su valor a tecnologías de apoyo como una sola imagen con
una etiqueta legible que incluya el valor en estrellas (y el puntaje detallado únicamente en las
superficies que lo muestran); los glifos individuales SHALL ser decorativos. La representación visual NO SHALL ser la única
señal del valor en las superficies donde ya se muestra el número.

#### Scenario: Lectura de pantalla de una nota
- **WHEN** un lector de pantalla llega a una nota de 4,5 estrellas
- **THEN** anuncia una única etiqueta con "4,5 estrellas" y no anuncia cada estrella por
  separado

### Requirement: Formato del número y dónde se muestra el puntaje detallado
El puntaje detallado (1–100) SHALL ser secundario a las estrellas y SHALL mostrarse como
`86/100`. Cuando una superficie lo muestra y existe, SHALL mostrarse en lugar del número de
estrellas (`4,5`), junto a la fila de estrellas, y nunca ambos; sin puntaje (o en una
superficie que no lo muestra) SHALL mostrarse el número de estrellas. El puntaje SHALL
mostrarse solo en: el panel "Tu relación" del álbum y de la canción, la reseña propia, las
valoraciones destacadas del perfil y, sin mostrarse, como desempate del orden "Tú" de la
discografía. NO SHALL mostrarse en el feed, en las reseñas del perfil, en la tracklist, en las
marcas de la discografía ni en ninguna forma compacta `★ 4,5`, que nunca lleva puntaje. El
formato antiguo `4,5 · 87` NO SHALL usarse en ninguna superficie.

#### Scenario: Destacada con puntaje
- **WHEN** el perfil de una persona muestra una valoración destacada de 4,5 estrellas con
  puntaje 86
- **THEN** la tarjeta muestra la fila de estrellas y `86/100`, sin `4,5`

#### Scenario: Destacada sin puntaje
- **WHEN** la valoración destacada es de 4,5 estrellas sin puntaje detallado
- **THEN** la tarjeta muestra la fila de estrellas y `4,5`

#### Scenario: Superficie que no muestra el puntaje
- **WHEN** el feed o las reseñas del perfil muestran una valoración con puntaje detallado
- **THEN** muestran la fila de estrellas con `4,5` y su etiqueta accesible no incluye el
  puntaje

### Requirement: La nota no se codifica con color
Ninguna superficie SHALL colorear la nota ni su puntaje según su valor (semáforo, gradiente
o escala). El número SHALL usar un tono neutro con peso tipográfico; el relleno de las
estrellas conserva el ámbar y es el único uso de ámbar de la representación.

#### Scenario: Notas distintas, mismo tratamiento
- **WHEN** se muestran dos valoraciones, una de 20/100 y otra de 95/100
- **THEN** ambas usan el mismo tono de número, sin color distinto por valor

### Requirement: Selección de estrellas con un solo control
Toda superficie donde el usuario elige o cambia sus estrellas SHALL usar el mismo control de
selección (cinco estrellas con media estrella por mitad), con navegación por teclado y
etiquetas accesibles por valor. NO SHALL ofrecerse una fila de botones numéricos como
alternativa.

#### Scenario: Elegir estrellas en el panel y en la reseña
- **WHEN** un usuario elige estrellas en el panel "Tu relación" y luego al escribir una
  reseña
- **THEN** ambos usan el mismo control de cinco estrellas con media estrella

