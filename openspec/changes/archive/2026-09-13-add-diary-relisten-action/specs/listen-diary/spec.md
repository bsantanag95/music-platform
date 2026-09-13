## MODIFIED Requirements

### Requirement: Acciones rápidas desde la fila del diario

El sistema SHALL permitir, desde el menú de una fila del diario propio, registrar una escucha
adicional sobre el mismo objetivo de esa fila, agregar ese objetivo a una lista propia
compatible, y marcar el objetivo en Want to Listen ("Quiero volver a escuchar") cuando el
objetivo es un artista o un álbum — nunca una canción, mismo alcance que la capability
`want-to-listen` —, todo sin salir de `/me/diary`.

#### Scenario: Registrar otra escucha desde la fila

- **WHEN** el usuario elige "Registrar otra escucha" en el menú de una fila
- **THEN** el sistema crea una nueva entrada de diario sobre el mismo objetivo, con audiencia
  `private` por defecto, y la muestra al principio del listado con su panel de ampliación ya
  abierto

#### Scenario: Agregar a lista desde la fila

- **WHEN** el usuario elige "Agregar a lista" en el menú de una fila y selecciona una lista propia
  compatible con el tipo del objetivo
- **THEN** el objetivo de esa entrada se agrega a la lista elegida

#### Scenario: Sin listas compatibles

- **WHEN** el usuario abre "Agregar a lista" desde una fila y no tiene ninguna lista propia
  compatible con el tipo del objetivo
- **THEN** el sistema ofrece crear una lista nueva del tipo correspondiente sin salir del diario

#### Scenario: Quiero volver a escuchar desde la fila

- **WHEN** el usuario elige "Quiero volver a escuchar" en el menú de una fila cuyo objetivo es
  un artista o un álbum
- **THEN** el sistema alterna la entrada de Want to Listen del objetivo (la crea si no existía,
  la quita si ya existía) y anuncia el resultado efectivo ("se agregó" o "se quitó") de forma
  accesible, con una confirmación visual momentánea sobre la fila

#### Scenario: Sin acción de Want to Listen para canciones

- **WHEN** el usuario abre el menú de una fila cuyo objetivo es una canción
- **THEN** no encuentra ninguna opción de "Quiero volver a escuchar" en ese menú
