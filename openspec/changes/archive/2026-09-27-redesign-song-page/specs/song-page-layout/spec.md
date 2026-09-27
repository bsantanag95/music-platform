## ADDED Requirements

### Requirement: Zonas de la página de canción

La página de canción SHALL organizarse, de arriba hacia abajo, en: breadcrumb; cabecera con
la carátula del disco principal, el bloque de identidad (antetítulo, título, artistas), la
ficha técnica, el bloque de comunidad y el panel "Tu relación"; la tira de pistas; los
bloques Composición y Créditos de esta grabación; "Esta grabación aparece en"; "Otras
versiones de la canción"; y los comentarios. La página SHALL NOT tener pestañas. En
escritorio el panel "Tu relación" SHALL ocupar una columna lateral solo a la altura de la
cabecera, y el resto de las zonas SHALL usar el ancho completo. La carátula SHALL mostrarse
como máximo a 250 px de lado. Una zona sin datos SHALL NOT renderizarse, salvo la cabecera,
el panel y los comentarios.

#### Scenario: Escritorio

- **WHEN** una persona abre una canción en un viewport de escritorio
- **THEN** la cabecera muestra carátula, identidad, ficha y comunidad junto al panel "Tu
  relación", y debajo, a ancho completo, la tira de pistas, composición y créditos, los
  discos, las versiones y los comentarios

#### Scenario: Móvil

- **WHEN** una persona abre una canción en un viewport móvil
- **THEN** las zonas se apilan en este orden: carátula e identidad, una línea resumen de
  comunidad, el panel "Tu relación", la ficha técnica, la tira de pistas, composición,
  créditos, discos, versiones y comentarios, sin desbordamiento horizontal de la página

#### Scenario: Canción sin créditos ni versiones

- **WHEN** la grabación no tiene créditos de personal, autoría ni otras versiones
  registradas
- **THEN** la página no muestra esos bloques vacíos y los comentarios siguen al final

### Requirement: Disco principal de la canción

El sistema SHALL elegir como disco principal de una grabación el primer disco de estudio
(por fecha de primer lanzamiento) que la contiene; si ninguno de los discos que la contienen
es de estudio, SHALL elegir el disco más temprano. A igual fecha, SHALL desempatar de forma
determinista. El disco principal SHALL definir la carátula de la cabecera, el antetítulo,
la tira de pistas y el eslabón de álbum de las migas. La elección SHALL NOT depender de la
página desde la que llegó la persona.

#### Scenario: Canción de un álbum de estudio también editada en recopilaciones

- **WHEN** una grabación está en un álbum de estudio de 1991, en dos singles de 1992 y en
  varias recopilaciones
- **THEN** el disco principal es el álbum de estudio de 1991

#### Scenario: Canción solo publicada en un single y una recopilación

- **WHEN** una grabación no aparece en ningún disco de estudio y sí en un single de 2015 y
  una recopilación de 2018
- **THEN** el disco principal es el single de 2015

#### Scenario: Llegada desde una recopilación

- **WHEN** una persona abre la canción desde la lista de canciones de una recopilación
- **THEN** la cabecera y la tira de pistas usan igualmente el disco principal

### Requirement: Identidad y ficha técnica de la canción

La cabecera SHALL mostrar un antetítulo "Canción · pista N de *Disco*" (con enlace al disco
principal) cuando la grabación está en la lista de canciones de la edición representativa
del disco principal, o "Canción" en otro caso; el título; y todos los artistas principales
con su `joinPhrase`, con enlace a cada uno. La ficha técnica SHALL mostrar, solo cuando
existan: duración; "Escrita por" con los autores de la obra; primera aparición (disco más
temprano que contiene la grabación, con su año); y la línea de versión definida en
`song-versions`.

#### Scenario: Canción de estudio

- **WHEN** una persona abre "November Rain", pista 10 de "Use Your Illusion I"
- **THEN** la cabecera muestra "Canción · pista 10 de Use Your Illusion I", el título,
  "Guns N' Roses" y la ficha con duración, "Escrita por Axl Rose" y "Primera aparición: Use
  Your Illusion I · 1991"

#### Scenario: Sin duración conocida

- **WHEN** la grabación no tiene duración registrada
- **THEN** la ficha no muestra la fila de duración

### Requirement: Tira de pistas

Cuando la grabación está en la lista de canciones de la edición representativa del disco
principal, la página SHALL mostrar una tira con el disco principal y la posición ("pista N
de M"), un enlace a la pista anterior y otro a la siguiente de esa lista, cada uno con su
número y título. En discos de varios medios, la numeración SHALL seguir la de la lista del
álbum y la tira SHALL cruzar de un disco al siguiente. La primera pista SHALL NOT mostrar
enlace a la anterior y la última SHALL NOT mostrar enlace a la siguiente. Si la grabación no
está en la lista de la edición representativa, la tira SHALL NOT renderizarse.

#### Scenario: Pista intermedia

- **WHEN** una persona abre la pista 10 de un disco de 16 pistas
- **THEN** la tira enlaza a la pista 9 y a la 11, con sus títulos, y muestra "10 de 16"

#### Scenario: Recorrer el disco

- **WHEN** la persona sigue el enlace a la pista siguiente
- **THEN** llega a la página de la pista 11 con su propia tira

#### Scenario: Pista solo en una edición ampliada

- **WHEN** la grabación solo aparece como pista adicional de otra edición del disco
- **THEN** la página no muestra la tira de pistas

### Requirement: Composición y créditos de la grabación

La página SHALL mostrar un bloque **Composición** con los autores de la obra (u obras) de la
grabación, cada uno enlazado a su página de artista y con sus roles traducidos ("música",
"letra"), y un bloque **Créditos de esta grabación** con las personas acreditadas en la
grabación agrupadas en Intérpretes, Producción, Sonido y Otros, con los mismos roles
traducidos que la vista por canción de los créditos del álbum. Los integrantes de los
artistas principales SHALL destacarse entre los intérpretes. Cuando el disco principal
tiene créditos de nivel edición, el bloque SHALL ofrecer un enlace a la pestaña Créditos de
ese disco en lugar de repetirlos. Ambos bloques SHALL obtenerse con consultas de lectura,
sin requests a MusicBrainz al renderizar.

#### Scenario: Canción con créditos por grabación

- **WHEN** una grabación tiene créditos de guitarra, voz y mezcla
- **THEN** el bloque de créditos los muestra agrupados en Intérpretes y Sonido, con los
  integrantes de la banda destacados

#### Scenario: Créditos del disco completo

- **WHEN** el productor del disco principal está acreditado en la edición y no en cada pista
- **THEN** el bloque ofrece "Créditos de todo el disco" con enlace a la pestaña Créditos del
  álbum

#### Scenario: Sin créditos de grabación

- **WHEN** la grabación no tiene créditos de personal
- **THEN** el bloque de créditos no se muestra, y Composición se muestra si hay autores

### Requirement: Comentarios al final de la canción

Los comentarios de la canción SHALL mostrarse al final de la página, después de "Otras
versiones de la canción". La canción SHALL NOT ofrecer reseñas.

#### Scenario: Comentarios

- **WHEN** una persona abre una canción con comentarios
- **THEN** los ve al final de la página y no encuentra editor ni índice de reseñas
