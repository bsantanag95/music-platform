# genre-page-community Specification

## Purpose
Señales de la comunidad en la página de género: listas públicas del género y reseñas recientes, con la visibilidad, los bloqueos y la moderación del resto de la app.
## Requirements
### Requirement: Listas de la comunidad del género

La pestaña Listas SHALL listar, paginadas, las listas públicas de álbumes que contienen al menos 3 álbumes del género o
de sus subgéneros. Una lista SHALL contar solo si es de audiencia pública, de tipo estándar, visible para moderación,
sin retiro de marca oficial, de una persona con perfil público y cuenta activa, y sin bloqueo en ninguna dirección con
el lector (condiciones idénticas a las de "listas públicas que contienen un ítem"). El orden SHALL ser por cantidad de
guardados descendente, luego por cantidad de álbumes del género y luego por fecha. Cada entrada SHALL mostrar título,
dueño con enlace, cantidad de ítems, carátulas y la cantidad de álbumes del género que contiene; con sesión SHALL
mostrar el estado de guardado. El Resumen SHALL mostrar un carrusel de hasta 6 listas con "Ver todo →" y SHALL omitirlo
si no hay ninguna.

#### Scenario: Lista con suficientes álbumes del género

- **WHEN** una lista pública contiene 5 álbumes del género
- **THEN** aparece en la pestaña Listas con "5 álbumes de este género"

#### Scenario: Lista con pocos álbumes

- **WHEN** una lista pública contiene solo 2 álbumes del género
- **THEN** no aparece en la pestaña Listas

#### Scenario: Lista privada o de perfil privado

- **WHEN** una lista es privada, solo para seguidores o de una persona con perfil privado
- **THEN** no aparece para ningún lector

#### Scenario: Bloqueo

- **WHEN** existe un bloqueo entre el lector y el dueño de una lista
- **THEN** esa lista no aparece para el lector

#### Scenario: Género sin listas

- **WHEN** ninguna lista cumple las condiciones
- **THEN** el Resumen no muestra el carrusel y la pestaña Listas muestra un estado vacío con invitación a crear una

### Requirement: Reseñas recientes del género

El Resumen SHALL mostrar las 5 reseñas más recientes de álbumes del género o de sus subgéneros con visibilidad
`visible`, con las mismas reglas que la página del álbum: el autor de una cuenta desactivada se muestra enmascarado y,
con sesión, se excluyen las reseñas de autores bloqueados en cualquier dirección. Cada reseña SHALL mostrar el álbum
(carátula y título), el autor, las estrellas y un extracto, y enlazar a su detalle. SHALL omitirse la sección si no hay
reseñas.

#### Scenario: Reseñas recientes

- **WHEN** hay reseñas visibles de álbumes del género
- **THEN** el Resumen muestra las 5 más nuevas, cada una enlazada a su detalle

#### Scenario: Reseña oculta por moderación

- **WHEN** una reseña del género tiene moderación `hidden`
- **THEN** no aparece

#### Scenario: Autor bloqueado

- **WHEN** el lector tiene un bloqueo con el autor de una reseña del género
- **THEN** esa reseña no aparece para el lector

#### Scenario: Género sin reseñas

- **WHEN** ningún álbum del género tiene reseñas visibles
- **THEN** el Resumen no muestra la sección

