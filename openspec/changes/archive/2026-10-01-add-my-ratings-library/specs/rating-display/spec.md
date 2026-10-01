## MODIFIED Requirements

### Requirement: Formato del número y dónde se muestra el puntaje detallado
El puntaje detallado (1–100) SHALL ser secundario a las estrellas y SHALL mostrarse como
`86/100`. Cuando una superficie lo muestra y existe, SHALL mostrarse en lugar del número de
estrellas (`4,5`), junto a la fila de estrellas, y nunca ambos; sin puntaje (o en una
superficie que no lo muestra) SHALL mostrarse el número de estrellas. El puntaje SHALL
mostrarse solo en: el panel "Tu relación" del álbum y de la canción, la reseña propia, las
valoraciones destacadas del perfil, la biblioteca propia "Mis valoraciones" y, sin mostrarse,
como desempate del orden "Tú" de la discografía; el tooltip y el texto accesible de la nota
propia en la columna "Tú" de la discografía SHALL incluirlo (`Tu nota: 4,5 · 86/100`). NO SHALL mostrarse en el feed, en las reseñas del perfil, en la tracklist, en las
marcas visibles de la discografía ni en ninguna forma compacta `★ 4,5`, que nunca lleva puntaje. El
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

#### Scenario: Mis valoraciones muestra el puntaje
- **WHEN** una persona abre su biblioteca "Mis valoraciones" y tiene un álbum valorado con 4,5
  estrellas y puntaje 86
- **THEN** la fila muestra la fila de estrellas y `86/100`, sin `4,5`

#### Scenario: Puntaje solo en el tooltip de la discografía
- **WHEN** una persona valoró un disco con 4,5 estrellas y puntaje 86 y mira la columna "Tú"
  de la discografía de su artista
- **THEN** lo visible es `★ 4,5` y el tooltip y el texto accesible dicen `Tu nota: 4,5 · 86/100`
