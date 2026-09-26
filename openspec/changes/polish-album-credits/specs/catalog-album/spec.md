## MODIFIED Requirements

### Requirement: Filas de crédito compactas

Cada fila de la pestaña Créditos SHALL mostrar el nombre de la persona y, aparte, sus roles
y sus pistas en líneas separadas. Con más de 5 roles, la fila SHALL mostrar los 4 primeros
y una acción "+N" que despliega el resto; con 5 o menos SHALL mostrarlos todos, porque
esconder un solo rol no ahorra espacio. Cada número de pista SHALL enlazar a la página de
esa canción y exponer su título (texto de ayuda y nombre accesible). Un crédito de
instrumento sin instrumento especificado SHALL rotularse "varios instrumentos".
Tres o más pistas consecutivas del mismo disco SHALL mostrarse como un rango ("2–11") con
ambos extremos enlazados; dos pistas consecutivas SHALL seguir mostrándose separadas por
coma. Cuando la persona participa en todas las pistas de la edición menos una o dos, y la
edición tiene al menos 5 pistas, la fila SHALL mostrar "todas salvo" y las pistas
excluidas, también enlazadas, en lugar de la lista de pistas.

#### Scenario: Persona con muchos roles

- **WHEN** un músico está acreditado con 9 roles distintos
- **THEN** la fila muestra 4 roles y "+5", y al desplegar muestra los 9

#### Scenario: Un solo rol oculto

- **WHEN** una persona tiene 5 roles
- **THEN** la fila muestra los 5 y ningún "+N"

#### Scenario: Pista enlazada

- **WHEN** una persona participa en las pistas 2 y 3
- **THEN** "2" y "3" enlazan a las canciones de esas pistas y anuncian sus títulos

#### Scenario: Pistas consecutivas en rango

- **WHEN** en un disco de 14 pistas una persona participa en las pistas 2 a 6 y 9
- **THEN** la fila muestra "pistas 2–6, 9", con "2", "6" y "9" enlazados

#### Scenario: Todas salvo una

- **WHEN** en un disco de 11 pistas una persona participa en las pistas 2 a 11
- **THEN** la fila muestra "todas salvo la 1", con "1" enlazado a esa canción

#### Scenario: Disco corto

- **WHEN** en un EP de 4 pistas una persona participa en las pistas 1 a 3
- **THEN** la fila muestra "pistas 1–3" y no "todas salvo"

#### Scenario: Rango en varios discos

- **WHEN** en un álbum de dos discos una persona participa en las pistas 1 a 4 del disco 2
- **THEN** la fila muestra "pistas 2-1–2-4"

## ADDED Requirements

### Requirement: Orden de los roles de intérprete

Dentro de una fila de crédito, los roles de instrumento y voz SHALL ordenarse por peso:
primero la voz principal (y la voz sin especificar), luego los instrumentos, luego los
coros y demás voces de apoyo, y al final la percusión menor (percusión genérica, pandereta,
shakers, palmas, campana, congas, timbales, silbido). A igual peso SHALL conservarse el
orden de MusicBrainz. Los roles que no son de instrumento ni de voz SHALL conservar su
posición relativa (por ejemplo, la producción primero en Producción y sonido). El "+N"
SHALL esconder los roles del final de ese orden.

#### Scenario: Vocalista con coros

- **WHEN** una persona tiene `vocal ["background vocals"]`, `vocal ["lead vocals"]` e
  `instrument ["harmonica"]`
- **THEN** sus roles se muestran como "voz principal, armónica, coros"

#### Scenario: Baterista con percusión

- **WHEN** una persona tiene `instrument ["percussion"]`, `instrument ["drums"]` y
  `vocal ["background vocals"]`
- **THEN** sus roles se muestran como "batería, coros, percusión"

#### Scenario: Productor que toca

- **WHEN** en Producción y sonido una persona tiene `producer`, `instrument ["percussion"]`
  e `instrument ["piano"]`
- **THEN** sus roles se muestran como "producción, piano, percusión"

### Requirement: Traducciones de roles e instrumentos

Los tipos de rol y los atributos de instrumento y voz presentes en los créditos ingeridos
del catálogo SHALL tener traducción en todos los idiomas de la interfaz, con el mismo
conjunto de claves en cada uno. Un valor que llegue sin traducción SHALL seguir mostrándose
con el texto de MusicBrainz.

#### Scenario: Otras voces

- **WHEN** una persona tiene el crédito `vocal ["other vocals"]` y la interfaz está en español
- **THEN** su rol se muestra como "otras voces"

#### Scenario: Director de video

- **WHEN** una persona tiene el crédito `video director` y la interfaz está en español
- **THEN** su rol se muestra traducido, no como "video director"

#### Scenario: Claves iguales en ambos idiomas

- **WHEN** se agrega una traducción de rol o atributo en un idioma
- **THEN** una prueba falla si falta la misma clave en el otro

### Requirement: Niveles contraídos de la pestaña Créditos

En la vista Por persona, los niveles contraídos (Composición, Músicos invitados, Producción
y sonido, Arte y otros) SHALL presentarse como una lista compacta: una fila por nivel,
separadas por divisores finos, cada una con un indicador de despliegue visible, un estado
al pasar el puntero, y el nombre del nivel con un color distinto del resumen de cantidad y
nombres. Arte y otros SHALL usar el mismo formato de fila que los demás niveles. Al
desplegar un nivel, su lista de personas SHALL aparecer debajo de su fila, dentro de la
misma lista.

#### Scenario: Niveles contraídos agrupados

- **WHEN** un álbum tiene Composición, Músicos invitados y Producción y sonido
- **THEN** los tres aparecen como filas contiguas de una misma lista con divisores entre
  ellas, y no como encabezados sueltos separados por espacio

#### Scenario: Arte y otros con el mismo formato

- **WHEN** un álbum tiene créditos de diseño
- **THEN** Arte y otros aparece como una fila más de la lista, con su indicador de
  despliegue y la cantidad de créditos
