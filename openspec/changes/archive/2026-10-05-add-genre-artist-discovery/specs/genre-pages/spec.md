## MODIFIED Requirements

### Requirement: Artistas de un género

La pestaña Artistas de la página de género SHALL listar, paginados, los artistas cuya lista de géneros semilla incluye
el género o uno de sus subgéneros y cuyo tipo es conocido. Cada artista SHALL mostrarse como una tarjeta con su foto
(o un reemplazo), su nombre enlazado, la cantidad de álbumes **del género** acreditados al artista en el catálogo (o
«Discografía sin explorar» cuando su discografía no se recorrió entera, aunque el catálogo conozca algunos álbumes suyos), su disco destacado y, con sesión, las marcas personales definidas en `genre-artist-discovery` (botón de seguir y
«Ya lo conoces»). El orden predeterminado SHALL ser por esa cantidad de álbumes y, a igualdad, por nombre.

#### Scenario: Orden de artistas

- **WHEN** dos artistas tienen el género y uno tiene más álbumes del género acreditados
- **THEN** ese artista aparece primero

#### Scenario: Álbumes del género, no totales

- **WHEN** un artista tiene 10 álbumes acreditados, de los cuales 2 son del género
- **THEN** su tarjeta dice "2 álbumes" y no "10"

#### Scenario: Artista con la discografía sin explorar

- **WHEN** un artista del género nunca tuvo su discografía recorrida
- **THEN** su tarjeta dice «Discografía sin explorar» y no «0 álbumes» ni una cantidad parcial

#### Scenario: Tarjeta con sesión

- **WHEN** una persona con sesión abre la pestaña Artistas
- **THEN** cada tarjeta muestra el botón Seguir o Siguiendo y, en los artistas conocidos que no sigue, «Ya lo conoces»

#### Scenario: Tarjeta sin sesión

- **WHEN** una persona sin sesión abre la pestaña Artistas
- **THEN** las tarjetas no muestran botón ni etiqueta personal, pero sí el disco destacado
