## MODIFIED Requirements

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
SHALL decir "Ocultar asistentes". Los dos bloques SHALL
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
- **THEN** su fila muestra 4 y "+5", que despliega el resto, y "ocultar" los vuelve a contraer

#### Scenario: Asistentes de sonido

- **WHEN** Sonido tiene dos personas de mezcla, cuatro de grabación y tres asistentes
- **THEN** primero aparecen las de mezcla, luego las de grabación, y al final "+3 asistentes"
  contraído, que desplegado dice "Ocultar asistentes"
