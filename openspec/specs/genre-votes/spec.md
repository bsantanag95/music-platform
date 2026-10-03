# genre-votes Specification

## Purpose
Votos de la comunidad (+1 / −1) sobre los géneros de un álbum y propuestas del vocabulario cerrado: quién puede votar, tope, supervivencia del voto, privacidad y umbral de cifras.
## Requirements
### Requirement: Voto de género sobre un álbum

El sistema SHALL permitir a una persona votar cada género de un álbum con +1 o −1, y proponer un
género de la taxonomía que el álbum no tiene votándolo +1. Cada persona SHALL tener a lo sumo un
voto por álbum y género; votar de nuevo SHALL reemplazar el valor y retirar el voto SHALL borrarlo.
Solo SHALL poder votarse un género de tipo estilo y visible: los descriptores y los ocultos SHALL
rechazarse con `400 VALIDATION_ERROR`. Una persona SHALL tener como máximo 8 géneros votados por
álbum; el voto 9 SHALL rechazarse con `400 VALIDATION_ERROR` sin modificar nada. Los votos son
solo de álbum: el artista y la canción SHALL NOT recibir votos de género.

#### Scenario: Votar un género existente

- **WHEN** una persona con acceso vota +1 "shoegaze" en un álbum que ya lo tiene
- **THEN** su voto queda guardado y el puntaje de "shoegaze" sube en 1

#### Scenario: Proponer un género

- **WHEN** una persona con acceso vota +1 "dream pop", que el álbum no tiene
- **THEN** el álbum pasa a tener "dream pop" con puntaje 1

#### Scenario: Cambiar y retirar el voto

- **WHEN** la persona cambia su +1 a −1 y luego retira el voto
- **THEN** el voto se reemplaza y después desaparece, sin dejar fila

#### Scenario: Descriptor u oculto

- **WHEN** se intenta votar "instrumental" o un género oculto
- **THEN** la petición responde `400 VALIDATION_ERROR` y no se guarda nada

#### Scenario: Tope de 8

- **WHEN** una persona con 8 géneros votados en un álbum vota un noveno
- **THEN** la petición responde `400 VALIDATION_ERROR` y sus votos no cambian

### Requirement: Quién puede votar

Solo SHALL poder votar una persona autenticada, con la cuenta no desactivada, sin una restricción
`social_activity` vigente y que haya interactuado con ese álbum, es decir, que tenga una
valoración, una entrada de diario o un elemento de colección de ese álbum. La interacción SHALL
comprobarse al escribir el voto. Sin sesión SHALL responder `401`; con una restricción vigente,
`403 SOCIAL_SUSPENSION_ACTIVE`; sin interacción, `403 GENRE_VOTE_NO_INTERACTION`.

#### Scenario: Con valoración

- **WHEN** una persona que valoró el álbum vota un género
- **THEN** el voto se acepta

#### Scenario: Sin interacción

- **WHEN** una persona sin valoración, entrada ni colección de ese álbum intenta votar
- **THEN** la petición responde `403 GENRE_VOTE_NO_INTERACTION`

#### Scenario: Restricción social

- **WHEN** una persona con restricción `social_activity` vigente intenta votar
- **THEN** la petición responde `403 SOCIAL_SUSPENSION_ACTIVE`

### Requirement: Supervivencia de los votos

Un voto SHALL sobrevivir a que la persona quite su valoración, su entrada o su colección del
álbum. Los votos de una cuenta desactivada SHALL dejar de contar mientras lo esté y SHALL volver
a contar al reactivarla. Al eliminar la cuenta o el álbum, los votos SHALL borrarse en cascada.

#### Scenario: Quitar la valoración

- **WHEN** una persona que votó "shoegaze" quita después su valoración del álbum
- **THEN** su voto sigue contando

#### Scenario: Cuenta desactivada

- **WHEN** una cuenta con votos se desactiva
- **THEN** sus votos no cuentan en el puntaje, y al reactivarla vuelven a contar

#### Scenario: Cuenta eliminada

- **WHEN** se elimina una cuenta
- **THEN** sus votos de género se borran

### Requirement: Privacidad de los votos

Un voto individual SHALL ser visible solo para su autor. Los agregados (puntaje por género) SHALL
ser públicos. Los votos SHALL NOT generar eventos del feed ni de actividad. Las cifras de votos
(▲ y ▼ por género) SHALL exponerse solo cuando el álbum tenga al menos 5 votantes distintos; con
menos, solo SHALL exponerse el orden de los géneros.

#### Scenario: Pocos votantes

- **WHEN** un álbum tiene 3 votantes distintos
- **THEN** los visitantes ven los géneros ordenados sin cifras de votos

#### Scenario: Suficientes votantes

- **WHEN** un álbum tiene 6 votantes distintos
- **THEN** los visitantes ven, por género, los votos ▲ y ▼

#### Scenario: Voto ajeno

- **WHEN** una persona consulta los votos de un álbum
- **THEN** solo recibe su propio voto por género, nunca el de otra persona

#### Scenario: Sin actividad

- **WHEN** una persona vota un género
- **THEN** no se crea ningún evento en el feed de actividad

