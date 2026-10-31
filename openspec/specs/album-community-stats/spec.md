# album-community-stats Specification

## Purpose
Mostrar en la cabecera del álbum las cifras de la comunidad (colección, búsqueda, listas y valoraciones) con umbrales mínimos que evitan cifras engañosas.
## Requirements
### Requirement: Bloque de comunidad del álbum

La cabecera del álbum SHALL mostrar un bloque de comunidad con: la media de estrellas; la cantidad de valoraciones y de reseñas visibles; la
cantidad de personas que tienen el álbum en su colección ("lo coleccionan") y que lo
tienen en su búsqueda ("lo buscan"); y la cantidad de listas visibles que lo contienen,
con acceso a ellas. Estos agregados SHALL ser iguales para cualquier visitante,
autenticado o no. En cualquier ancho, las cifras SHALL mostrarse en una franja de una
fila dividida en celdas, con la cifra arriba y su etiqueta debajo, como el bloque de
comunidad del artista: Media (solo cuando hay media según el umbral), Valoraciones y Lo
coleccionan. El detalle de reseñas bajo Valoraciones y el de "lo buscan" bajo Lo
coleccionan SHALL omitirse cuando su cifra es 0. La cantidad de listas SHALL mostrarse
como un enlace de texto bajo la franja ("Aparece en N listas") solo cuando N > 0, y SHALL
omitirse cuando N = 0.

#### Scenario: Álbum con actividad

- **WHEN** un álbum tiene 1.204 valoraciones, 38 reseñas, 212 personas que lo coleccionan,
  97 que lo buscan y aparece en 64 listas visibles
- **THEN** la franja muestra la media, 1.204 valoraciones con "38 reseñas" y 212 que lo
  coleccionan con "97 lo buscan", y el enlace "Aparece en 64 listas" hacia las listas que lo
  contienen

#### Scenario: Visitante anónimo

- **WHEN** una persona sin sesión abre el álbum
- **THEN** ve el mismo bloque de comunidad que un usuario autenticado

#### Scenario: En ninguna lista

- **WHEN** ninguna lista visible contiene el álbum
- **THEN** el bloque no muestra tarjeta ni enlace de listas

#### Scenario: Sin media del puntaje detallado
- **WHEN** un álbum tiene valoraciones con puntaje detallado
- **THEN** el bloque muestra la media en estrellas y no muestra ninguna media ni escala
  `/100` de la comunidad

#### Scenario: Poca actividad

- **WHEN** un álbum tiene 2 valoraciones, ninguna reseña, menos de 5 personas que lo
  coleccionan y nadie que lo busque
- **THEN** la franja muestra solo Valoraciones (2) y Lo coleccionan (<5), sin celda de
  Media ni los textos "Sin reseñas" o "0 lo buscan"

#### Scenario: Comunidad en móvil

- **WHEN** una persona abre un álbum en 375 px
- **THEN** la franja de comunidad se ve en una fila, sin desbordamiento horizontal

### Requirement: Histograma de valoraciones

El bloque de comunidad SHALL mostrar la distribución de las valoraciones por valor de
estrellas (de ½ a 5) como histograma, calculada con una única consulta agrupada.

#### Scenario: Distribución polarizada

- **WHEN** las valoraciones de un álbum se concentran en ★1 y ★5
- **THEN** el histograma muestra dos picos en esos extremos

### Requirement: Umbral mínimo de agregados

El sistema SHALL mostrar la media de estrellas y el histograma solo
cuando el álbum tiene al menos 5 valoraciones; con menos, SHALL mostrar únicamente la
cantidad de valoraciones. Los conteos "lo coleccionan" y "lo buscan" SHALL mostrarse como
"menos de 5" cuando el valor real es mayor que 0 y menor que 5. En las tarjetas, el valor
principal SHALL mostrarse en forma compacta ("<5") con el mismo tamaño tipográfico que las
demás cifras, y el texto completo ("menos de 5") SHALL estar disponible para lectores de
pantalla y como texto de ayuda al pasar el puntero.

#### Scenario: Pocas valoraciones

- **WHEN** un álbum tiene 4 valoraciones
- **THEN** el bloque muestra "4 valoraciones" sin media ni histograma

#### Scenario: Pocos coleccionistas

- **WHEN** 2 personas tienen el álbum en su colección
- **THEN** la tarjeta muestra "<5" en lugar de 2 y los lectores de pantalla anuncian
  "menos de 5"

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

