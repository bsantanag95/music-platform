## ADDED Requirements

### Requirement: Panel de votación en el álbum

La cabecera del álbum SHALL ofrecer a toda persona con sesión un botón "Votar géneros" junto a los
chips de géneros. El botón SHALL abrir un panel con los géneros del álbum y, por cada uno, el voto
propio (▲ a favor, ▼ en contra, ambos conmutables) y, solo si el álbum tiene al menos 5
votantes, las cifras de votos. El panel SHALL incluir un buscador de géneros (el de
`GET /api/genres/search`) para proponer uno nuevo, que se vota +1 al elegirlo. Los descriptores
SHALL NOT aparecer ni ser buscables como propuesta. Quien no pueda votar SHALL ver el panel con los
controles desactivados y el motivo ("Valora, escucha o colecciona el álbum para votar" o el de la
restricción). Sin sesión SHALL ofrecerse iniciar sesión.

#### Scenario: Persona con acceso

- **WHEN** una persona que valoró el álbum abre el panel y pulsa ▲ en "shoegaze"
- **THEN** el voto se guarda, el botón ▲ queda activo y el orden de los chips se actualiza

#### Scenario: Persona sin interacción

- **WHEN** una persona sin valoración, entrada ni colección abre el panel
- **THEN** los controles están desactivados y se explica cómo obtener acceso

#### Scenario: Proponer desde el buscador

- **WHEN** la persona busca "dream pop" y lo elige
- **THEN** se vota +1 y el género aparece en el panel con su ▲ activo

#### Scenario: Retirar el voto

- **WHEN** la persona pulsa de nuevo el ▲ que tenía activo
- **THEN** el voto se retira

### Requirement: API de votos de género

`GET /api/catalog/release-group/{id}/genre-votes` SHALL ser público y devolver los géneros del
álbum con su puntaje, si son principal o secundarios y, según el umbral de 5 votantes, las
cifras; con sesión SHALL incluir además el voto propio por género (`mine`) y si puede votar
(`canVote`, con la razón cuando no). `PUT /api/me/release-groups/{id}/genre-votes/{slug}` con
`{ "value": 1 | -1 }` SHALL crear o cambiar el voto y `DELETE` SHALL retirarlo. Un `value` fuera de
{−1, 1} SHALL responder `400 VALIDATION_ERROR`; un álbum o género inexistente, `404`.

#### Scenario: Lectura anónima

- **WHEN** un visitante sin sesión pide los votos de un álbum
- **THEN** recibe los géneros con puntaje y sin `mine` ni votos individuales

#### Scenario: Valor inválido

- **WHEN** se envía `{ "value": 2 }`
- **THEN** la respuesta es `400 VALIDATION_ERROR` y no se guarda nada

#### Scenario: Género inexistente

- **WHEN** el slug no corresponde a ningún género
- **THEN** la respuesta es `404`
