## ADDED Requirements

### Requirement: Altas de colección en el feed de seguidos
Agregar un disco a la colección física SHALL generar una entrada en el feed de actividad de los
seguidores (capability `activity-feed`) solo cuando la audiencia de la entrada es `followers` o
`public`, con el álbum, su artista, la carátula y el formato, sin la nota. Cambiar la audiencia
de una entrada a `private` SHALL retirarla del feed; editar formato, atributos o nota NO SHALL
generar una entrada nueva.

#### Scenario: Alta visible en el feed
- **WHEN** una persona agrega un CD a su colección con audiencia `public`
- **THEN** quienes la siguen ven en su feed una entrada "sumó a su colección · CD" con el álbum

#### Scenario: Alta privada fuera del feed
- **WHEN** una persona agrega un disco a su colección con audiencia `private`
- **THEN** esa alta no aparece en el feed de nadie
