## MODIFIED Requirements

### Requirement: Dos formas de la estrella
La representación SHALL tener dos formas: la **fila** de cinco estrellas dibujadas (llenas,
medias o vacías) para las superficies donde la nota es protagonista, y la **forma compacta**
`★ 4,5` (una estrella y el número) para las superficies densas donde no cabe una fila
(marca sobre la carátula de la discografía, fila compacta del feed, comentarios populares).
La media estrella SHALL dibujarse como media estrella en la fila, no como el carácter `½`.
La forma compacta SHALL llevar siempre la estrella: NUNCA un número suelto. En la corrida
plegada del feed, cuando la valoración tiene puntaje detallado, la forma compacta SHALL mostrar
`★ 86/100` en lugar de `★ 4,5`; en el resto de las formas compactas el puntaje no se muestra. El número SHALL
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

#### Scenario: Forma compacta con puntaje en la corrida plegada del feed
- **WHEN** el feed pliega 3 valoraciones de un mismo autor y una tiene puntaje 86
- **THEN** esa valoración se muestra como `★ 86/100` y las demás como `★ 4,5`

### Requirement: Formato del número y dónde se muestra el puntaje detallado
El puntaje detallado (1–100) SHALL ser secundario a las estrellas y SHALL mostrarse como
`86/100`. Cuando una superficie lo muestra y existe, SHALL mostrarse en lugar del número de
estrellas (`4,5`), junto a la fila de estrellas, y nunca ambos; sin puntaje (o en una
superficie que no lo muestra) SHALL mostrarse el número de estrellas. El puntaje SHALL
mostrarse solo en: el panel "Tu relación" del álbum y de la canción, la reseña propia, las
valoraciones destacadas del perfil, la biblioteca propia "Mis valoraciones", el feed de actividad
(la fila de una entrada, la fila fusionada de opinión y, como `★ 86/100`, la corrida plegada;
también el rastro propio de Inicio, que comparte esa presentación) y, sin mostrarse,
como desempate del orden "Tú" de la discografía; el tooltip y el texto accesible de la nota
propia en la columna "Tú" de la discografía SHALL incluirlo (`Tu nota: 4,5 · 86/100`). NO SHALL mostrarse en las reseñas del perfil, en la tracklist, en las
marcas visibles de la discografía ni en ninguna otra forma compacta `★ 4,5`, que nunca lleva puntaje salvo en la corrida plegada
del feed. El
formato antiguo `4,5 · 87` NO SHALL usarse en ninguna superficie.

#### Scenario: Destacada con puntaje
- **WHEN** el perfil de una persona muestra una valoración destacada de 4,5 estrellas con
  puntaje 86
- **THEN** la tarjeta muestra la fila de estrellas y `86/100`, sin `4,5`

#### Scenario: Destacada sin puntaje
- **WHEN** la valoración destacada es de 4,5 estrellas sin puntaje detallado
- **THEN** la tarjeta muestra la fila de estrellas y `4,5`

#### Scenario: Superficie que no muestra el puntaje
- **WHEN** las reseñas del perfil muestran una valoración con puntaje detallado
- **THEN** muestran la fila de estrellas con `4,5` y su etiqueta accesible no incluye el
  puntaje

#### Scenario: Mis valoraciones muestra el puntaje
- **WHEN** una persona abre su biblioteca "Mis valoraciones" y tiene un álbum valorado con 4,5
  estrellas y puntaje 86
- **THEN** la fila muestra la fila de estrellas y `86/100`, sin `4,5`

#### Scenario: Puntaje solo en el tooltip de la discografía
- **WHEN** una persona valoró un disco con 4,5 estrellas y puntaje 86 y mira la columna "Tú"
  de la discografía de su artista
- **THEN** lo visible es `★ 4,5` y el tooltip y el texto accesible dicen `Tu nota: 4,5 · 86/100`

#### Scenario: El feed muestra el puntaje
- **WHEN** el feed muestra una valoración de 4,5 estrellas con puntaje 86
- **THEN** la fila muestra la fila de estrellas y `86/100`, sin `4,5`, y su etiqueta accesible
  incluye el puntaje
