## MODIFIED Requirements

### Requirement: Identidad y ficha técnica de la canción

La cabecera SHALL mostrar el antetítulo "Canción" (la posición de la pista y el disco los
nombran la tira de pistas y las migas); el título; y todos los artistas principales con su
`joinPhrase`, con enlace a cada uno. La carátula SHALL enlazar al disco principal y ofrecer su
título como ayuda. La ficha técnica SHALL mostrar, solo cuando existan: duración; "Escrita
por" con los autores de la obra; primera aparición (disco más temprano que contiene la
grabación, con su año y, cuando no es el disco principal, su tipo: álbum, single/EP,
recopilación, en vivo u otro); y la línea de versión definida en `song-versions`.

#### Scenario: Canción de estudio

- **WHEN** una persona abre "November Rain", pista 10 de "Use Your Illusion I"
- **THEN** la cabecera muestra "Canción", el título, "Guns N' Roses" y la ficha con duración,
  "Escrita por Axl Rose" y "Primera aparición: Use Your Illusion I · 1991"

#### Scenario: Sin duración conocida

- **WHEN** la grabación no tiene duración registrada
- **THEN** la ficha no muestra la fila de duración

#### Scenario: Canción publicada antes como single

- **WHEN** una persona abre "Manchild", pista 1 de "Man's Best Friend", publicada antes como
  single
- **THEN** la ficha muestra "Primera aparición: Manchild (single/EP) · 2025" y la carátula
  enlaza a "Man's Best Friend"

### Requirement: Tira de pistas

Cuando la grabación está en la lista de canciones de la edición representativa del disco
principal, la página SHALL mostrar una tira con el disco principal y la posición ("*Disco* · N
de M"), y a cada lado la pista anterior y la siguiente de esa lista, cada una con la etiqueta
"Anterior" / "Siguiente" y debajo su número separado del título ("2 · Tears"), con toda el
área como enlace. En discos de varios medios, la numeración SHALL seguir la de la lista del
álbum y la tira SHALL cruzar de un disco al siguiente. En la primera pista, el lado anterior
SHALL decir "Inicio del disco" sin enlace, y en la última el lado siguiente SHALL decir "Fin
del disco" sin enlace. Si la grabación no está en la lista de la edición representativa, la
tira SHALL NOT renderizarse.

#### Scenario: Pista intermedia

- **WHEN** una persona abre la pista 10 de un disco de 16 pistas
- **THEN** la tira enlaza a la pista 9 y a la 11, con sus títulos, y muestra "10 de 16"

#### Scenario: Recorrer el disco

- **WHEN** la persona sigue el enlace a la pista siguiente
- **THEN** llega a la página de la pista 11 con su propia tira

#### Scenario: Pista solo en una edición ampliada

- **WHEN** la grabación solo aparece como pista adicional de otra edición del disco
- **THEN** la página no muestra la tira de pistas

#### Scenario: Primera pista

- **WHEN** una persona abre la pista 1 de "Man's Best Friend"
- **THEN** la tira muestra "Inicio del disco" a la izquierda y "Siguiente" con "2 · Tears" a la
  derecha

### Requirement: Composición y créditos de la grabación

La página SHALL mostrar un bloque **Composición** con los autores de la obra (u obras) de la
grabación, cada uno enlazado a su página de artista y con sus roles traducidos ("música",
"letra"), solo cuando los roles difieren entre autores (si no, la fila "Escrita por" de la
ficha, que lista solo nombres, ya lo dice todo), y un bloque **Créditos de esta grabación** con
las personas acreditadas en la grabación agrupadas en Intérpretes, Producción, Sonido y Otros.
Cada persona SHALL ocupar su propia fila, con el nombre a un lado y sus roles traducidos al
otro, como en la pestaña Créditos del álbum; con más de 5 roles SHALL mostrar los 4 primeros y
"+N" para desplegar el resto. Entre los intérpretes, los integrantes de los artistas
principales SHALL ir primero, con la tipografía destacada de los integrantes del álbum, y
separados de los invitados. En Sonido, las personas SHALL ordenarse por su rol principal
(mezcla, masterización, grabación, ingeniería, programación, otros) y quienes solo tienen
roles de asistencia SHALL ir al final, contraídos en "+N asistentes". Los dos bloques SHALL
ocupar el ancho completo, apilados; dentro del de créditos, Intérpretes SHALL ir en una columna
y los demás grupos apilados en otra cuando hay espacio. Cuando el disco principal tiene
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
- **THEN** su fila muestra 4 y "+5", que despliega el resto

#### Scenario: Asistentes de sonido

- **WHEN** Sonido tiene dos personas de mezcla, cuatro de grabación y tres asistentes
- **THEN** primero aparecen las de mezcla, luego las de grabación, y al final "+3 asistentes"
  contraído
