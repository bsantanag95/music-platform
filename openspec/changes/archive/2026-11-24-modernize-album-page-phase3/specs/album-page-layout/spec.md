## ADDED Requirements

### Requirement: Comentarios sin sesión en una frase

Sin sesión, la sección de comentarios SHALL invitar a iniciar sesión una sola vez. Sin comentarios, SHALL mostrar una única frase que
dice que todavía no hay comentarios y enlaza al inicio de sesión para comentar; con comentarios, el enlace SHALL ir arriba de la lista.
El mismo comportamiento SHALL aplicarse en las páginas de álbum, artista y canción, que comparten la sección.

#### Scenario: Álbum sin comentarios

- **WHEN** una persona sin sesión abre un álbum sin comentarios
- **THEN** ve «Todavía no hay comentarios. Inicia sesión para comentar» en una sola línea, con el enlace

#### Scenario: Con comentarios

- **WHEN** una persona sin sesión abre un álbum con comentarios
- **THEN** ve el enlace «Inicia sesión para comentar» arriba de la lista

## MODIFIED Requirements

### Requirement: Pestañas de contenido

La página SHALL ofrecer las pestañas Canciones, Créditos, Ediciones y Reseñas, en ese
orden. Canciones SHALL ser siempre la pestaña activa al llegar a la página sin pestaña
explícita. Solo la pestaña Reseñas SHALL mostrar un contador (cantidad de reseñas
visibles), escrito tras el nombre sin paréntesis, y solo cuando hay al menos una reseña. Una pestaña sin contenido que mostrar
SHALL ocultarse, salvo Canciones y Reseñas. La página SHALL NOT ofrecer una pestaña de
notas adicionales.

#### Scenario: Llegada a la página

- **WHEN** una persona abre `/{locale}/album/{id}`
- **THEN** la pestaña activa es Canciones, sin importar cuántas reseñas tenga el álbum

#### Scenario: Contador de reseñas

- **WHEN** el álbum tiene 17 reseñas visibles
- **THEN** la pestaña se rotula "Reseñas 17" y ninguna otra pestaña muestra contador

#### Scenario: Pestaña sin contenido

- **WHEN** el álbum no tiene créditos de personal registrados
- **THEN** la pestaña Créditos no se muestra

#### Scenario: Sin reseñas

- **WHEN** el álbum no tiene reseñas visibles
- **THEN** la pestaña se rotula "Reseñas", sin "0"

### Requirement: Franja de discografía

La página SHALL mostrar, bajo el contenido de las pestañas, una franja con los álbumes del
artista principal ordenados por fecha de lanzamiento, con el álbum actual resaltado y
enlaces directos al álbum anterior y al siguiente cuando existan. Su título SHALL usar la misma escala que el de los
comentarios.

#### Scenario: Álbum intermedio

- **WHEN** el álbum tiene uno anterior y uno posterior en la discografía del artista
- **THEN** la franja enlaza a ambos y resalta el álbum actual

#### Scenario: Primer álbum

- **WHEN** el álbum es el primero de la discografía
- **THEN** la franja no muestra enlace al anterior
