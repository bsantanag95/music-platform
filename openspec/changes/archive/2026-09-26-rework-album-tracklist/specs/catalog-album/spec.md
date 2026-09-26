## MODIFIED Requirements

### Requirement: Títulos de pista completos

La tracklist SHALL mostrar el título completo de cada pista, con salto de línea cuando no
entra en una línea, y SHALL NOT truncarlo. Duración, marcas y menú de la pista SHALL
ocupar columnas fijas alineadas a la derecha en escritorio; en viewport móvil SHALL
mostrarse bajo el título. Las marcas SHALL ser íconos de tamaño fijo, de modo que todas las
filas tengan el mismo alto con o sin marcas. En escritorio la fila completa SHALL
resaltarse al pasar el cursor o al contener el foco, para guiar la lectura del título a la
duración.

#### Scenario: Título largo

- **WHEN** una pista se titula "The Great Gig in the Sky (Instrumental Version With Vocal
  Improvisation, 2011 Remaster)"
- **THEN** la fila muestra el título completo en varias líneas y la duración queda alineada
  con la de las demás filas

#### Scenario: Alto uniforme

- **WHEN** la pista 1 está marcada como escuchada y la pista 3 no tiene marcas
- **THEN** ambas filas tienen el mismo alto

### Requirement: Subtotales por disco y total del álbum

La tracklist SHALL mostrar en la cabecera de cada disco (cuando hay más de uno) la
cantidad de pistas y la duración del disco, y al pie la cantidad total de pistas y la
duración total. En un álbum de un solo disco la tracklist SHALL NOT repetir al pie el total,
que ya muestra la ficha técnica. Cuando al menos una pista del conjunto no tiene duración conocida, la
duración SHALL mostrarse precedida de "≥" y SHALL NOT presentarse como exacta.

#### Scenario: Todas las duraciones conocidas

- **WHEN** todas las pistas de un disco tienen duración
- **THEN** el subtotal muestra la suma exacta en formato `mm:ss` o `h:mm:ss`

#### Scenario: Duración faltante

- **WHEN** una pista del álbum tiene `durationSec` nulo
- **THEN** el total del álbum se muestra como "≥ " seguido de la suma de las duraciones
  conocidas

#### Scenario: Un solo disco

- **WHEN** el álbum tiene un único disco de 12 pistas
- **THEN** la tracklist no muestra pie de total y la ficha técnica sigue mostrando
  "12 pistas · 38:24"

### Requirement: Favoritas de la comunidad en la tracklist

La tracklist SHALL marcar como "favorita de la comunidad" las pistas con más reacciones
fuertes (`loved` y `obsessed`) en entradas de diario públicas sobre su grabación, hasta un
máximo de 3 pistas por álbum, y solo las pistas con al menos 5 reacciones fuertes. Cuando
alguna pista lleva la marca, la tracklist SHALL mostrar sobre la lista una leyenda visible
que explique su significado. La tracklist SHALL NOT mostrar una media de estrellas de la
comunidad por pista.

#### Scenario: Pistas destacadas

- **WHEN** dos pistas de un álbum superan el umbral de reacciones fuertes
- **THEN** ambas muestran la marca de favorita de la comunidad y las demás no
- **AND** sobre la lista se ve la leyenda "Favorita de la comunidad"

#### Scenario: Catálogo sin reacciones suficientes

- **WHEN** ninguna pista alcanza 5 reacciones fuertes públicas
- **THEN** ninguna pista muestra la marca

#### Scenario: Consulta agrupada

- **WHEN** se arma la tracklist de un álbum de 20 pistas
- **THEN** las reacciones se obtienen con una única consulta agrupada por grabación, no
  con una consulta por pista

### Requirement: Estado personal por pista

Para un usuario autenticado, cada fila de la tracklist SHALL mostrar de forma siempre
visible (sin depender de pasar el cursor): una marca cuando el usuario tiene al menos una
entrada de diario sobre esa grabación; su valoración propia de la grabación, como estrellas
de solo lectura con el valor anunciado a lectores de pantalla, cuando existe; y un
conmutador de favorito (corazón) que alterna la señal sin abrir el menú, con contorno de
baja intensidad cuando está inactivo y relleno cuando está activo, y con `aria-pressed`.
El estado personal de todas las pistas SHALL obtenerse con consultas agrupadas por álbum,
no con una consulta por pista. Para visitantes anónimos las marcas personales y el
conmutador SHALL NOT mostrarse.

#### Scenario: Pista escuchada

- **WHEN** un usuario autenticado registró una escucha de la pista 2
- **THEN** la fila de la pista 2 muestra la marca "La escuchaste" en escritorio y en móvil

#### Scenario: Visitante anónimo

- **WHEN** una persona sin sesión abre el álbum
- **THEN** ninguna fila muestra marcas personales

#### Scenario: Pista valorada

- **WHEN** un usuario autenticado valoró la pista 4 con 4½ estrellas
- **THEN** la fila de la pista 4 muestra sus 4½ estrellas sin abrir ningún menú

#### Scenario: Favorito desde la fila

- **WHEN** un usuario autenticado pulsa el corazón inactivo de la pista 7
- **THEN** la pista queda en sus favoritos y el corazón se muestra relleno con
  `aria-pressed="true"`

### Requirement: Menú de acciones por pista

Cada fila SHALL ofrecer un menú `···` con, en este orden y agrupado: Registrar escucha y
Reaccionar; Valorar, Favorito, Añadir a lista y Ver en listas. El menú SHALL NOT ofrecer
"Ir a la canción", que ya cubre el enlace del título. El control del menú SHALL tener un
área táctil de al menos 40 px. Las acciones que requieren sesión SHALL pedir iniciar
sesión a un visitante anónimo sin crear datos.

#### Scenario: Orden del menú

- **WHEN** un usuario abre el menú de una pista
- **THEN** las acciones de consumo (Registrar escucha, Reaccionar) aparecen primero

#### Scenario: Acción sin sesión

- **WHEN** un visitante anónimo elige Registrar escucha en el menú
- **THEN** se le solicita iniciar sesión y no se crea ninguna entrada

#### Scenario: Sin acción redundante

- **WHEN** un usuario abre el menú de una pista
- **THEN** no aparece "Ir a la canción" y el título de la fila sigue enlazando a la canción

## ADDED Requirements

### Requirement: Valoración de pista en línea

Elegir Valorar en el menú de una pista SHALL abrir, bajo la fila, cinco estrellas
interactivas con medias estrellas que guardan al elegir un valor, sin botón "Guardar",
junto a una acción para quitar la valoración con confirmación. Si el guardado falla, SHALL
restaurarse el valor anterior y mostrarse un error. Cuando la grabación tiene un puntaje
detallado que deja de ser coherente con las nuevas estrellas, SHALL guardarse sin él y
avisarse de forma accesible. La valoración guardada SHALL reflejarse de inmediato en las
estrellas de solo lectura de la fila.

#### Scenario: Valorar una pista

- **WHEN** un usuario elige Valorar en la pista 3 y pulsa la cuarta estrella
- **THEN** se guarda 4 estrellas y la fila muestra 4 estrellas sin recargar la página

#### Scenario: Quitar la valoración

- **WHEN** un usuario confirma quitar la valoración de una pista
- **THEN** la valoración se borra y la fila deja de mostrar estrellas

### Requirement: Registro de escucha por pista con confirmación

Registrar escucha desde el menú de una pista SHALL registrar la escucha, marcar la pista
como escuchada y mostrar bajo la fila una confirmación visible ("Escucha registrada") con
una acción "Agregar detalles" que abre el formulario de esa entrada. El formulario SHALL
NOT abrirse sin que el usuario lo pida.

#### Scenario: Registrar sin detalles

- **WHEN** un usuario elige Registrar escucha en la pista 5
- **THEN** la pista 5 muestra la marca de escuchada y la confirmación con "Agregar
  detalles", sin formulario abierto

### Requirement: Cabecera de la pestaña Canciones sin duplicados

La pestaña Canciones SHALL NOT repetir de forma visible lo que ya muestran la barra de
pestañas y la ficha técnica: el título "Canciones" SHALL existir solo para lectores de
pantalla, y la línea de edición mostrada con acceso a Ediciones SHALL mostrarse solo en
viewport móvil, donde la ficha técnica está contraída.

#### Scenario: Escritorio

- **WHEN** una persona abre la pestaña Canciones en escritorio
- **THEN** la lista empieza directamente por la primera pista, sin título visible ni línea
  de edición, y la ficha técnica sigue mostrando la edición

#### Scenario: Móvil

- **WHEN** una persona abre la pestaña Canciones en móvil
- **THEN** sobre la lista se ve la edición mostrada con el acceso a Ediciones
