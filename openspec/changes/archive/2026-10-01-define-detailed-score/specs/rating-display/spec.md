## MODIFIED Requirements

### Requirement: Accesibilidad de la nota
Cada nota mostrada SHALL exponer su valor a tecnologías de apoyo como una sola imagen con
una etiqueta legible que incluya el valor en estrellas (y el puntaje detallado únicamente en las
superficies que lo muestran); los glifos individuales SHALL ser decorativos. La representación visual NO SHALL ser la única
señal del valor en las superficies donde ya se muestra el número.

#### Scenario: Lectura de pantalla de una nota
- **WHEN** un lector de pantalla llega a una nota de 4,5 estrellas
- **THEN** anuncia una única etiqueta con "4,5 estrellas" y no anuncia cada estrella por
  separado

## ADDED Requirements

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
