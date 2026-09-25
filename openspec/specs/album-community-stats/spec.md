# album-community-stats Specification

## Purpose
Mostrar en la cabecera del álbum las cifras de la comunidad (colección, búsqueda, listas y valoraciones) con umbrales mínimos que evitan cifras engañosas.

## Requirements
### Requirement: Bloque de comunidad del álbum

La cabecera del álbum SHALL mostrar un bloque de comunidad con: la media de estrellas y la
media del puntaje detallado; la cantidad de valoraciones y de reseñas visibles; la
cantidad de personas que tienen el álbum en su colección ("lo coleccionan") y que lo
tienen en su búsqueda ("lo buscan"); y la cantidad de listas visibles que lo contienen,
con acceso a ellas. Estos agregados SHALL ser iguales para cualquier visitante,
autenticado o no.

#### Scenario: Álbum con actividad

- **WHEN** un álbum tiene 1.204 valoraciones, 38 reseñas, 212 personas que lo coleccionan,
  97 que lo buscan y aparece en 64 listas visibles
- **THEN** el bloque muestra esas cifras, la media de estrellas y la media detallada

#### Scenario: Visitante anónimo

- **WHEN** una persona sin sesión abre el álbum
- **THEN** ve el mismo bloque de comunidad que un usuario autenticado

### Requirement: Histograma de valoraciones

El bloque de comunidad SHALL mostrar la distribución de las valoraciones por valor de
estrellas (de ½ a 5) como histograma, calculada con una única consulta agrupada.

#### Scenario: Distribución polarizada

- **WHEN** las valoraciones de un álbum se concentran en ★1 y ★5
- **THEN** el histograma muestra dos picos en esos extremos

### Requirement: Umbral mínimo de agregados

El sistema SHALL mostrar la media de estrellas, la media detallada y el histograma solo
cuando el álbum tiene al menos 5 valoraciones; con menos, SHALL mostrar únicamente la
cantidad de valoraciones. Los conteos "lo coleccionan" y "lo buscan" SHALL mostrarse como
"menos de 5" cuando el valor real es mayor que 0 y menor que 5.

#### Scenario: Pocas valoraciones

- **WHEN** un álbum tiene 4 valoraciones
- **THEN** el bloque muestra "4 valoraciones" sin media ni histograma

#### Scenario: Pocos coleccionistas

- **WHEN** 2 personas tienen el álbum en su colección
- **THEN** el bloque muestra "menos de 5" en lugar de 2

#### Scenario: Sin coleccionistas

- **WHEN** nadie tiene el álbum en su colección
- **THEN** el bloque muestra 0 o omite la cifra, sin mostrar "menos de 5"

### Requirement: Anonimato de los agregados

Los conteos "lo coleccionan" y "lo buscan" SHALL contar personas distintas (no entradas ni
copias) e incluir las entradas de cualquier audiencia, y SHALL NOT exponer la identidad
de ninguna de ellas. La señal "Pendiente" (want-to-listen) SHALL NOT agregarse en el
bloque de comunidad.

#### Scenario: Varias copias de una persona

- **WHEN** una persona tiene el álbum en vinilo y en CD
- **THEN** cuenta una sola vez en "lo coleccionan"

#### Scenario: Entrada privada

- **WHEN** una persona tiene el álbum en su colección con audiencia privada
- **THEN** cuenta en el total y el bloque no ofrece forma de saber quién es

#### Scenario: Pendiente no se agrega

- **WHEN** 300 personas tienen el álbum en Pendiente
- **THEN** el bloque de comunidad no muestra ninguna cifra de Pendiente

