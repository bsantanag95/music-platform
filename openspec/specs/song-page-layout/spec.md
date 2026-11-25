# song-page-layout Specification

## Purpose
Definir la estructura de la página de canción como ficha compacta de biblioteca: una tarjeta con el disco principal, la ficha en dos columnas y «Recorrer el disco», composición y créditos, discos que la contienen, versiones y comentarios, sin pestañas.
## Requirements
### Requirement: Zonas de la página de canción

La página de canción SHALL organizarse, de arriba hacia abajo, en: breadcrumb con Compartir; una **tarjeta** de cabecera (superficie
con borde) con la carátula del disco principal, el bloque de identidad (antetítulo, título, artistas), la ficha técnica, el bloque de
comunidad y una columna lateral con «Recorrer el disco» y, para el visitante, la invitación a valorar; los bloques Composición y
Créditos de esta grabación, con una columna a su lado en escritorio con el panel "Tu relación" (con sesión) y **«En el disco»**; "Esta
grabación aparece en"; "Otras versiones de la canción"; y los comentarios. El alto de la tarjeta SHALL depender solo de su contenido
propio, nunca del panel "Tu relación". La página SHALL NOT tener pestañas y SHALL usar el contenedor de 88rem de las páginas de álbum y
artista. La tarjeta SHALL NOT llevar el fondo desenfocado de la portada del álbum. La carátula SHALL mostrarse como máximo a 250 px de
lado y, en móvil, pequeña junto al bloque de identidad. Una zona sin datos SHALL NOT renderizarse, salvo la tarjeta y los comentarios.

#### Scenario: Escritorio

- **WHEN** una persona abre una canción en un viewport de escritorio
- **THEN** la tarjeta muestra la carátula, la identidad con la ficha en dos columnas y la columna lateral con «Recorrer el disco» (y
  la invitación a valorar sin sesión), y debajo van los créditos con el panel y «En el disco» a la derecha, los discos, las versiones
  y los comentarios

#### Scenario: Móvil

- **WHEN** una persona abre una canción en un viewport móvil
- **THEN** la tarjeta apila la carátula junto a la identidad, la ficha en una columna, «Recorrer el disco» en una fila y, sin sesión,
  la invitación; después siguen el panel (con sesión), composición, créditos, «En el disco», discos, versiones y comentarios, sin
  desbordamiento horizontal de la página, y sin sesión los créditos empiezan a no más de 680 px del inicio a 390 px de ancho

#### Scenario: Canción sin créditos ni versiones

- **WHEN** la grabación no tiene créditos de personal, autoría ni otras versiones
  registradas
- **THEN** la página no muestra esos bloques vacíos y los comentarios siguen al final

#### Scenario: Panel alto con sesión

- **WHEN** un usuario autenticado abre una canción y su panel "Tu relación" mide más que la tarjeta
- **THEN** la tarjeta conserva su alto y no hay hueco entre el título y la ficha; el panel va en la columna del cuerpo

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

### Requirement: Composición y créditos de la grabación

La página SHALL mostrar un bloque **Composición** con los autores de la obra (u obras) de la
grabación, cada uno enlazado a su página de artista y con sus roles traducidos ("música",
"letra"), solo cuando los roles difieren entre autores (si no, la fila "Escrita por" de la
ficha, que lista solo nombres, ya lo dice todo), y un bloque **Créditos de esta grabación** con
las personas acreditadas en la grabación agrupadas en Intérpretes, Producción, Sonido y Otros.
Cada persona SHALL ocupar su propia fila, con el nombre a un lado y sus roles traducidos al
otro, como en la pestaña Créditos del álbum; con más de 5 roles SHALL mostrar los 4 primeros y
"+N" para desplegar el resto, y desplegados SHALL ofrecer "ocultar" para volver a contraerlos. Entre los intérpretes, los integrantes de los artistas
principales SHALL ir primero, con la tipografía destacada de los integrantes del álbum, y
separados de los invitados. En Sonido, las personas SHALL ordenarse por su rol principal
(mezcla, masterización, grabación, ingeniería, programación, otros) y quienes solo tienen
roles de asistencia SHALL ir al final, contraídos en "+N asistentes", control que desplegado
SHALL decir "Ocultar asistentes". Los dos bloques SHALL ir apilados en la columna principal del cuerpo, junto a «En el disco», sin
caja propia: las filas se separan con un filete. Dentro del de créditos, Intérpretes SHALL ir en una columna y los demás grupos
apilados en otra solo cuando la columna principal tiene ancho para ambas; si no, uno debajo del otro. Cuando el disco principal tiene
créditos de nivel edición, el bloque SHALL ofrecer un enlace a la pestaña Créditos de ese
disco en lugar de repetirlos. Ambos bloques SHALL obtenerse con consultas de lectura, sin
requests a MusicBrainz al renderizar.

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
- **THEN** el bloque de créditos no se muestra, y Composición se muestra solo si los autores
  tienen roles distintos

#### Scenario: Muchos roles

- **WHEN** una persona tiene 9 roles en la grabación
- **THEN** su fila muestra 4 y "+5", que despliega el resto, y "ocultar" los vuelve a contraer

#### Scenario: Asistentes de sonido

- **WHEN** Sonido tiene dos personas de mezcla, cuatro de grabación y tres asistentes
- **THEN** primero aparecen las de mezcla, luego las de grabación, y al final "+3 asistentes"
  contraído, que desplegado dice "Ocultar asistentes"

### Requirement: Comentarios al final de la canción

Los comentarios de la canción SHALL mostrarse al final de la página, después de "Otras
versiones de la canción", con su título en el mismo estilo que los títulos de las demás secciones de la canción (24 px, negrita). La
canción SHALL NOT ofrecer reseñas. El estilo del título de los comentarios de álbum y artista SHALL NOT cambiar.

#### Scenario: Comentarios

- **WHEN** una persona abre una canción con comentarios
- **THEN** los ve al final de la página, bajo un título del mismo estilo que "Otras versiones de la canción", y no encuentra editor
  ni índice de reseñas

### Requirement: Coherencia visual de la página de canción

La página de canción SHALL usar las piezas comunes de la página de álbum: el chevron SVG en «Recorrer el disco» (no flechas
tipográficas), enlaces secundarios neutros en reposo y en ámbar al pasar el cursor (autores, disco, primera aparición, producción,
versión original, versiones, acceso a los créditos del disco, listas, "ver más" y roles ocultos), y etiquetas neutras. Todas las
secciones (Composición, Créditos de esta grabación, Apariciones, Versiones) SHALL titularse con el mismo estilo de título de sección,
en la escala de los títulos de bloque (24 px, negrita). Los comentarios SHALL limitarse al ancho de lectura de las páginas de álbum y
artista.

#### Scenario: Tira de pistas

- **WHEN** una persona abre una canción del medio de un disco
- **THEN** los accesos a la pista anterior y siguiente de «Recorrer el disco» llevan el chevron común y el disco de la ficha no está
  en ámbar hasta pasar el cursor

#### Scenario: Autores en reposo

- **WHEN** una persona ve "Escrita por" con cuatro autores
- **THEN** los nombres se muestran en el color del texto, subrayados, y en ámbar al pasar
  el cursor

#### Scenario: Títulos de sección

- **WHEN** la canción tiene créditos, apariciones y versiones
- **THEN** "Créditos de esta grabación", "Esta grabación aparece en" y "Otras versiones de
  la canción" tienen el mismo estilo de título, en negrita y a 24 px

### Requirement: Grupos de créditos largos plegados

En el bloque Créditos de esta grabación, los grupos Producción, Sonido y Otros con más de 6
personas (contando a los asistentes) SHALL mostrarse plegados, con un chevron, su nombre y
un resumen con la cantidad, los tres primeros nombres y "y N más", como los niveles de la
pestaña Créditos del álbum; al desplegarlos SHALL verse las mismas filas que hoy. Los
grupos de 6 personas o menos y el grupo Intérpretes SHALL mostrarse siempre abiertos. El
control "+N asistentes" SHALL llevar el chevron común.

#### Scenario: Sonido con 10 personas

- **WHEN** una grabación tiene 10 personas en Sonido
- **THEN** el grupo aparece plegado con "10 · Serban Ghenea, David Hart, Jack Antonoff y
  7 más", y al desplegarlo muestra sus filas

#### Scenario: Producción con 3 personas

- **WHEN** una grabación tiene 3 personas en Producción
- **THEN** el grupo se muestra abierto, sin resumen

#### Scenario: Muchos intérpretes

- **WHEN** una grabación tiene 8 intérpretes
- **THEN** Intérpretes se muestra abierto

### Requirement: Columna «En el disco»

Cuando la grabación está en la lista de canciones de la edición representativa del disco principal, la página SHALL mostrar junto a
Composición y Créditos (debajo de ellos en móvil y tableta) la columna **«En el disco»**, rotulada con el año del disco principal, con
las pistas de esa lista en su orden: número (con la numeración `disco-pista` en discos de varios medios), título y duración cuando se
conoce. La pista de la página SHALL marcarse como actual (`aria-current`) y SHALL NOT ser un enlace; las demás SHALL enlazar a su
canción. En discos de varios medios, cada medio SHALL ir precedido de su rótulo ("Disco 2"). Al pie SHALL mostrar la cantidad de
pistas y la duración total (la suma de las conocidas, precedida de "≈" si falta alguna). Con más de 20 pistas, la columna SHALL
mostrar solo las 5 anteriores y las 5 siguientes a la actual (11 contiguas en los extremos del disco), marcar los cortes con "…" y
ofrecer "Ver las N pistas en el disco" con enlace a la página del disco. La columna SHALL obtenerse de la misma consulta que
«Recorrer el disco», sin requests a MusicBrainz. Si la grabación no está en la lista, la columna SHALL NOT renderizarse; sin
Composición ni Créditos, la columna SHALL mostrarse sola.

#### Scenario: Última pista de un disco de 8

- **WHEN** una persona abre "Hallowed Be Thy Name", pista 8 de 8 de "The Number of the Beast"
- **THEN** la columna "En el disco · 1982" lista las 8 pistas con su duración, la 8 marcada y sin enlace, y al pie "8 pistas · 40:22"

#### Scenario: Disco de dos medios

- **WHEN** la grabación está en un disco con dos CD
- **THEN** la columna muestra "Disco 1" y "Disco 2" antes de sus pistas, numeradas "1-1", "2-1", etc.

#### Scenario: Disco largo

- **WHEN** la grabación es la pista 15 de un disco de 40
- **THEN** la columna muestra de la 10 a la 20, "…" antes y después, y "Ver las 40 pistas en el disco" con enlace al disco

#### Scenario: Pista solo en una edición ampliada

- **WHEN** la grabación solo aparece como pista adicional de otra edición del disco
- **THEN** la página no muestra la columna «En el disco»

