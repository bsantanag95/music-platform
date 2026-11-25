## MODIFIED Requirements

### Requirement: Zonas de la página de canción

La página de canción SHALL organizarse, de arriba hacia abajo, en: breadcrumb con Compartir; una **tarjeta** de cabecera (superficie
con borde) con la carátula del disco principal, el bloque de identidad (antetítulo, título, artistas), la ficha técnica, el bloque de
comunidad y una columna lateral con «Recorrer el disco» y la acción principal (la invitación a valorar o el panel "Tu relación"); los
bloques Composición y Créditos de esta grabación, con la columna **«En el disco»** a su lado en escritorio; "Esta grabación aparece
en"; "Otras versiones de la canción"; y los comentarios. La página SHALL NOT tener pestañas y SHALL usar el contenedor de 88rem de las
páginas de álbum y artista. La tarjeta SHALL NOT llevar el fondo desenfocado de la portada del álbum. La carátula SHALL mostrarse como
máximo a 250 px de lado y, en móvil, pequeña junto al bloque de identidad. Una zona sin datos SHALL NOT renderizarse, salvo la tarjeta
y los comentarios.

#### Scenario: Escritorio

- **WHEN** una persona abre una canción en un viewport de escritorio
- **THEN** la tarjeta muestra la carátula, la identidad con la ficha en dos columnas y la columna lateral con «Recorrer el disco» y la
  acción principal, y debajo van los créditos con «En el disco» a la derecha, los discos, las versiones y los comentarios

#### Scenario: Móvil

- **WHEN** una persona abre una canción en un viewport móvil
- **THEN** la tarjeta apila la carátula junto a la identidad, la ficha en una columna, «Recorrer el disco» en una fila y la acción
  principal; después siguen composición, créditos, «En el disco», discos, versiones y comentarios, sin desbordamiento horizontal de
  la página, y los créditos empiezan a no más de 680 px del inicio a 390 px de ancho

#### Scenario: Canción sin créditos ni versiones

- **WHEN** la grabación no tiene créditos de personal, autoría ni otras versiones
  registradas
- **THEN** la página no muestra esos bloques vacíos y los comentarios siguen al final

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

## ADDED Requirements

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
