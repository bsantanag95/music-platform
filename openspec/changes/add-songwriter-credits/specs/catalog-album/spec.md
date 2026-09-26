## MODIFIED Requirements

### Requirement: Pestaña Créditos

La pestaña Créditos SHALL mostrar únicamente personas acreditadas en el disco (créditos de
personal de nivel edición o grabación), agrupadas en cuatro niveles y en este orden: el
**primer nivel** (acreditadas y miembros del artista principal según el catálogo, o el
propio artista principal cuando es una persona), en un bloque destacado siempre visible;
**Músicos invitados** (intérpretes acreditados que no son miembros); **Producción y
sonido**; y **Arte y otros**, contraído por defecto con la cantidad de créditos. El primer
nivel SHALL rotularse "Artista principal" ("Artistas principales" con más de una persona)
cuando todos los artistas principales del álbum son personas, e "Integrantes de la banda"
en los demás casos. Con un artista principal persona, el primer nivel SHALL mostrarse como
una línea compacta sin bloque destacado; el bloque destacado queda para los integrantes de
una banda. El título "Créditos" SHALL existir solo para lectores de pantalla, porque la
barra de pestañas ya lo muestra. Músicos invitados y Producción y sonido SHALL mostrarse desplegados
cuando tienen hasta 6 personas y contraídos por defecto cuando tienen más, con un resumen
que indica la cantidad y los tres primeros nombres, y SHALL poder desplegarse. Cada persona
SHALL aparecer una sola vez, en el nivel más alto que le corresponde, con todos sus roles y
las pistas en que participa ("todas" cuando participa en todas). La pestaña SHALL NOT
mostrar integrantes calculados por fechas de pertenencia ni personas sin crédito en el
disco, y SHALL NOT mostrar un distintivo de fundador. Un tipo de crédito sin nivel asignado
SHALL mostrarse en Arte y otros. Sin créditos de personal ni de autoría, la pestaña no se
muestra.

#### Scenario: Integrante acreditado

- **WHEN** un miembro de la banda está acreditado con guitarra y voz en todas las pistas y
  como coproductor
- **THEN** aparece en Integrantes de la banda con "guitarra, voz, coproducción · todas" y
  no se repite en Producción y sonido

#### Scenario: Miembro sin crédito en el disco

- **WHEN** una persona era miembro de la banda el año del lanzamiento pero no tiene
  créditos en el disco
- **THEN** no aparece en la pestaña

#### Scenario: Invitado en pistas puntuales

- **WHEN** una vocalista no miembro está acreditada solo en la pista 5
- **THEN** aparece en Músicos invitados con "voz · pista 5"

#### Scenario: Créditos de arte contraídos

- **WHEN** el disco tiene 9 créditos de diseño y fotografía
- **THEN** el nivel Arte y otros se muestra contraído como "+9 créditos"

#### Scenario: Álbum de solista

- **WHEN** el único artista principal del álbum es una persona acreditada en su disco
- **THEN** el primer nivel se rotula "Artista principal"

#### Scenario: Muchos músicos invitados

- **WHEN** el disco tiene 23 músicos invitados
- **THEN** el nivel se muestra contraído con "23" y los tres primeros nombres seguidos de
  "y 20 más", y al desplegarlo lista a las 23 personas

#### Scenario: Pocos músicos invitados

- **WHEN** el disco tiene 4 músicos invitados
- **THEN** el nivel se muestra desplegado

#### Scenario: Solista con pocos créditos

- **WHEN** la única solista del álbum está acreditada solo con coros en la pista 6
- **THEN** el primer nivel es una línea "Artista principal" sin bloque destacado

### Requirement: Vista por canción en Créditos

La pestaña Créditos SHALL ofrecer dos vistas, **Por persona** (la de niveles) y **Por
canción**, elegibles con un control segmentado cuyo estado vive en la URL
(`?view=songs`), de modo que la vista se entregue renderizada desde el servidor y sea
enlazable. La vista Por canción SHALL listar las pistas en orden de disco y posición, con su
título enlazado a la canción y, bajo cada una, las personas agrupadas en Composición (los
autores de la obra de esa pista), Producción, Intérpretes, Sonido y Otros, en ese orden,
con sus roles en esa pista; una pista sin créditos SHALL
indicarlo. Los créditos de nivel edición SHALL mostrarse una vez, al principio, como
créditos de todo el álbum.

#### Scenario: Cambiar a la vista por canción

- **WHEN** una persona elige "Por canción" en la pestaña Créditos
- **THEN** la URL pasa a incluir `?view=songs` y cada pista muestra quién la produjo,
  quién tocó qué y el sonido

#### Scenario: Enlace directo

- **WHEN** alguien abre la URL de Créditos con `?view=songs`
- **THEN** la página se muestra directamente en la vista por canción

#### Scenario: Pista sin créditos

- **WHEN** una pista no tiene créditos de personal
- **THEN** la vista por canción la lista con la indicación de que no hay créditos registrados

#### Scenario: Autores de la pista

- **WHEN** la obra de la pista 1 tiene como autores a Jerrod Bettis, Meghan Kabir y Audra Mae
- **THEN** la pista 1 muestra primero el grupo Composición con esas tres personas

## ADDED Requirements

### Requirement: Composición en la vista por persona

La vista Por persona de la pestaña Créditos SHALL mostrar una sección **Composición**
después del primer nivel y antes de Músicos invitados, con cada autora o autor una vez, sus
roles de autoría (rotulados "composición" para `writer`, "música" para `composer`, "letra"
para `lyricist`, y el resto traducido o con el texto de MusicBrainz) y las pistas cuyas
obras firmó, con los mismos números enlazados que las demás filas. La sección SHALL seguir
la regla de contracción de los demás niveles (abierta con hasta 6 personas; contraída con
cantidad y tres nombres). Una persona de la sección Composición SHALL poder figurar además
en su nivel de personal. Sin autores, la sección SHALL NOT mostrarse.

#### Scenario: Disco pop con muchos autores

- **WHEN** las obras de un álbum suman 20 autores
- **THEN** la sección Composición aparece contraída con "20" y los tres primeros nombres

#### Scenario: Letra y música por separado

- **WHEN** una obra tiene una relación `composer` de una persona y `lyricist` de otra
- **THEN** la primera figura con "música" y la segunda con "letra"

#### Scenario: Sin autores cargados

- **WHEN** ninguna obra del álbum tiene autores en MusicBrainz
- **THEN** la vista Por persona no muestra la sección Composición
