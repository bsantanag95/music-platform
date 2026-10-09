## MODIFIED Requirements

### Requirement: Puerta 2 — registrar lo que estás escuchando

En la Puerta 2 el usuario SHALL buscar un álbum o una canción y, al elegirlo, el sistema
SHALL crear una **entrada de diario** (escucha) con el flujo existente: contexto inferido,
audiencia por defecto, sin exigir impresión ni reacción. La Puerta 2 SHALL NOT crear un
favorito ni una valoración. El usuario SHALL poder registrar varias escuchas. La Puerta 2
por sí sola SHALL NOT cerrar el onboarding. Al buscar canciones, la lista SHALL ofrecer
todas las canciones registrables que devuelve la búsqueda, no solo la primera. Lo ya
registrado SHALL salir de los resultados y mostrarse aparte con una acción **Deshacer** que
borra esa entrada de diario; elegir el mismo resultado varias veces seguidas SHALL crear una
sola entrada.

#### Scenario: Registrar una escucha desde el onboarding

- **WHEN** el usuario elige un álbum en la Puerta 2
- **THEN** se crea una entrada de diario para ese álbum, sin favorito ni valoración, y el
  usuario puede registrar otra o pasar a la Puerta 1 o terminar

#### Scenario: La Puerta 2 no cierra el onboarding

- **WHEN** el usuario registra una escucha en la Puerta 2 y no hace nada más
- **THEN** el onboarding sigue abierto hasta que el usuario use el botón de terminar

#### Scenario: Elegir entre varias canciones

- **WHEN** el usuario busca una canción y la búsqueda devuelve varias canciones registrables
- **THEN** la lista las muestra todas, con su artista, y registra la que el usuario elige

#### Scenario: Clic repetido

- **WHEN** el usuario hace clic dos veces seguidas en el mismo resultado
- **THEN** se crea una sola entrada de diario y el resultado deja de aparecer en la lista

#### Scenario: Deshacer un registro

- **WHEN** el usuario toca Deshacer en una escucha registrada desde la Puerta 2
- **THEN** la entrada de diario se borra, el elemento sale de la lista de registrados y
  vuelve a poder elegirse

### Requirement: Puerta 1 — los álbumes elegidos se guardan como favoritos

En la Puerta 1 el usuario SHALL buscar álbumes y seleccionar hasta **6** (la UI SHALL
sugerir entre 3 y 5). Al guardar, cada álbum seleccionado SHALL convertirse en un **favorito de
álbum** del usuario: el sistema SHALL crear el `favorite` de álbum correspondiente (si no
existe) con la audiencia por defecto de un favorito nuevo. La Puerta 1 SHALL NOT fijar ni
ordenar los álbumes, y SHALL NOT crear ninguna valoración ("esto me representa" no es "5
estrellas") ni ninguna entrada de diario. Guardar con cero álbumes SHALL ser válido
(equivale a saltar la puerta). Intentar guardar más de 6, o un álbum inexistente, SHALL
responder `400` con código `VALIDATION_ERROR`. La búsqueda completa de la Puerta 1 SHALL
acotarse a álbumes de estudio, y cada resultado SHALL mostrar su artista y año, y su tipo
cuando no sea de estudio, para distinguir álbumes homónimos.

#### Scenario: Elegir álbumes que te definen

- **WHEN** el usuario selecciona cuatro álbumes en la Puerta 1 y guarda
- **THEN** esos cuatro son favoritos de álbum del usuario y aparecen en su sección Favoritos
  del perfil, sin valoración ni entrada de diario asociada

#### Scenario: Saltar la Puerta 1

- **WHEN** el usuario termina el onboarding sin elegir ningún álbum
- **THEN** no se crea ningún favorito y el onboarding queda cerrado igual

#### Scenario: Exceder el máximo

- **WHEN** el usuario intenta guardar siete álbumes
- **THEN** la API responde `400` con código `VALIDATION_ERROR` y no se crea nada

#### Scenario: Distinguir álbumes homónimos

- **WHEN** la búsqueda devuelve dos álbumes con el mismo título y artista
- **THEN** cada fila muestra su año (y su tipo si no es de estudio) para poder distinguirlos

#### Scenario: Seguir eligiendo tras elegir uno

- **WHEN** el usuario elige un álbum de la lista de resultados
- **THEN** el texto de búsqueda se limpia y el foco vuelve al campo de búsqueda

### Requirement: Aviso no bloqueante de verificación en la bienvenida

La ruta `/[locale]/welcome` SHALL mostrar, antes de las dos puertas, un aviso discreto cuando el email de la persona autenticada no esté verificado. El aviso SHALL explicar que puede continuar usando la cuenta, SHALL ofrecer el reenvío existente con un botón secundario y SHALL NOT impedir completar o saltar cualquiera de las puertas ni empujar el primer campo de búsqueda fuera de la pantalla en móvil.

#### Scenario: Usuario nuevo sin verificar llega a bienvenida

- **WHEN** una persona autenticada con onboarding pendiente y email sin verificar llega a `/welcome`
- **THEN** ve el aviso de verificación antes de las dos puertas y puede interactuar con ambas

#### Scenario: Usuario continúa sin verificar

- **WHEN** una persona sin verificar completa o salta el onboarding sin verificar el email
- **THEN** el onboarding termina con normalidad y la persona llega a Inicio

## ADDED Requirements

### Requirement: Los buscadores del onboarding comparten el motor del diálogo Añadir

Los buscadores de las dos puertas SHALL buscar con el mismo motor que el selector del diálogo «Añadir»: coincidencias locales primero y búsqueda completa después, cancelando la solicitud anterior al cambiar el texto o el tipo. Un fallo de búsqueda SHALL comunicarse como error y SHALL NOT mostrarse como «Sin resultados». El estado de la búsqueda («Buscando…», sin resultados, error) SHALL anunciarse a los lectores de pantalla.

#### Scenario: Fallo de búsqueda

- **WHEN** la búsqueda falla en cualquiera de las dos puertas
- **THEN** el usuario ve un mensaje de error de búsqueda, no «Sin resultados»

#### Scenario: Cambiar el texto cancela la búsqueda anterior

- **WHEN** el usuario sigue escribiendo mientras una búsqueda completa está en curso
- **THEN** la solicitud anterior se aborta y solo cuenta el resultado de la consulta vigente

### Requirement: Uso táctil del onboarding

Los controles de `/welcome` SHALL tener un área táctil de al menos 44 px de alto en móvil y los campos de texto SHALL usar 16 px en móvil para no provocar el zoom automático de iOS. Las carátulas decorativas de las listas de resultados SHALL ocultarse a las tecnologías de asistencia, y cada botón «Quitar» o «Deshacer» SHALL nombrar el elemento al que se refiere.

#### Scenario: Botones del flujo en móvil

- **WHEN** la bienvenida se muestra en un viewport de 375 px
- **THEN** «Saltar por ahora», el botón principal, el conmutador Álbum/Canción, «Quitar» y «Deshacer» miden al menos 44 px de alto y los campos de búsqueda usan 16 px
