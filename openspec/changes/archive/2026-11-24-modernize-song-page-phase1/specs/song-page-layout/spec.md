## MODIFIED Requirements

### Requirement: Zonas de la página de canción

La página de canción SHALL organizarse, de arriba hacia abajo, en: breadcrumb con Compartir; una **tarjeta** de cabecera (superficie
con borde) con la carátula del disco principal, el bloque de identidad (antetítulo, título, artistas), la ficha técnica, el bloque de
comunidad y una columna lateral con «Recorrer el disco» y la acción principal (la invitación a valorar o el panel "Tu relación"); los
bloques Composición y Créditos de esta grabación; "Esta grabación aparece en"; "Otras versiones de la canción"; y los comentarios. La
página SHALL NOT tener pestañas y SHALL usar el contenedor de 88rem de las páginas de álbum y artista. La tarjeta SHALL NOT llevar el
fondo desenfocado de la portada del álbum. La carátula SHALL mostrarse como máximo a 250 px de lado y, en móvil, pequeña junto al
bloque de identidad. Una zona sin datos SHALL NOT renderizarse, salvo la tarjeta y los comentarios.

#### Scenario: Escritorio

- **WHEN** una persona abre una canción en un viewport de escritorio
- **THEN** la tarjeta muestra la carátula, la identidad con la ficha en dos columnas y la columna lateral con «Recorrer el disco» y la
  acción principal, y debajo van los créditos, los discos, las versiones y los comentarios

#### Scenario: Móvil

- **WHEN** una persona abre una canción en un viewport móvil
- **THEN** la tarjeta apila la carátula junto a la identidad, la ficha en una columna, «Recorrer el disco» en una fila y la acción
  principal; después siguen composición, créditos, discos, versiones y comentarios, sin desbordamiento horizontal de la página, y
  los créditos empiezan a no más de 680 px del inicio a 390 px de ancho

#### Scenario: Canción sin créditos ni versiones

- **WHEN** la grabación no tiene créditos de personal, autoría ni otras versiones
  registradas
- **THEN** la página no muestra esos bloques vacíos y los comentarios siguen al final

### Requirement: Identidad y ficha técnica de la canción

La tarjeta SHALL mostrar el antetítulo "Canción"; el título; y todos los artistas principales con su `joinPhrase`, con enlace a cada
uno. La carátula SHALL enlazar al disco principal y ofrecer su título como ayuda. La ficha técnica SHALL presentarse en dos columnas
de pares rótulo–valor (una en móvil) y mostrar, solo cuando existan y en este orden: duración; **disco** (el disco principal,
enlazado); "Escrita por" con los autores de la obra; **pista** ("N de M", cuando la grabación está en la lista de la edición
representativa del disco principal); **género** (los géneros del disco principal, enlazados); primera aparición; **producción** (hasta
dos productores de la grabación, enlazados); la línea de versión definida en `song-versions`; y **versiones** ("N versiones →", con la
cantidad de otras versiones de la canción y enlace a su sección). La primera aparición SHALL mostrar solo la fecha cuando es el disco
principal, y en otro caso el disco más temprano con su año y su tipo (álbum, single/EP, recopilación, en vivo u otro).

#### Scenario: Canción de estudio

- **WHEN** una persona abre "November Rain", pista 10 de "Use Your Illusion I"
- **THEN** la tarjeta muestra "Canción", el título, "Guns N' Roses" y la ficha con duración, "Disco: Use Your Illusion I",
  "Escrita por Axl Rose", "Pista: 10 de 16" y "Primera aparición: 1991"

#### Scenario: Sin duración conocida

- **WHEN** la grabación no tiene duración registrada
- **THEN** la ficha no muestra la fila de duración

#### Scenario: Canción publicada antes como single

- **WHEN** una persona abre "Manchild", pista 1 de "Man's Best Friend", publicada antes como
  single
- **THEN** la ficha muestra "Primera aparición: Manchild (single/EP) · 2025" y la carátula
  enlaza a "Man's Best Friend"

#### Scenario: Producción y versiones

- **WHEN** una persona abre "Hallowed Be Thy Name", producida por Martin Birch y con 17 otras versiones
- **THEN** la ficha muestra "Producción: Martin Birch" y "17 versiones →", que lleva a la sección de versiones

### Requirement: Tira de pistas

Cuando la grabación está en la lista de canciones de la edición representativa del disco principal, la columna lateral de la tarjeta
SHALL mostrar «Recorrer el disco» con la pista anterior y la siguiente de esa lista, cada una con su número separado del título
("2 · Tears") y el chevron común, con toda el área como enlace. En discos de varios medios, la numeración SHALL seguir la de la lista
del álbum y el recorrido SHALL cruzar de un disco al siguiente. En la primera pista, el lado anterior SHALL decir "Inicio del disco" sin
enlace, y en la última el lado siguiente SHALL decir "Fin del disco" sin enlace. En móvil, los dos lados SHALL ir en una fila. Si la
grabación no está en la lista de la edición representativa, el bloque SHALL NOT renderizarse.

#### Scenario: Pista intermedia

- **WHEN** una persona abre la pista 10 de un disco de 16 pistas
- **THEN** «Recorrer el disco» enlaza a la pista 9 y a la 11, con sus títulos, y la ficha muestra "Pista: 10 de 16"

#### Scenario: Recorrer el disco

- **WHEN** la persona sigue el enlace a la pista siguiente
- **THEN** llega a la página de la pista 11 con su propia tarjeta

#### Scenario: Pista solo en una edición ampliada

- **WHEN** la grabación solo aparece como pista adicional de otra edición del disco
- **THEN** la tarjeta no muestra «Recorrer el disco» ni la fila Pista

#### Scenario: Primera pista

- **WHEN** una persona abre la pista 1 de "Man's Best Friend"
- **THEN** «Recorrer el disco» muestra "Inicio del disco" a un lado y "2 · Tears" enlazada al otro
