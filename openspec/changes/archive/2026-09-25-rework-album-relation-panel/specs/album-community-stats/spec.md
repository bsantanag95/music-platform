## MODIFIED Requirements

### Requirement: Bloque de comunidad del álbum

La cabecera del álbum SHALL mostrar un bloque de comunidad con: la media de estrellas y la
media del puntaje detallado; la cantidad de valoraciones y de reseñas visibles; la
cantidad de personas que tienen el álbum en su colección ("lo coleccionan") y que lo
tienen en su búsqueda ("lo buscan"); y la cantidad de listas visibles que lo contienen,
con acceso a ellas. Estos agregados SHALL ser iguales para cualquier visitante,
autenticado o no. En escritorio, media, valoraciones y colección SHALL mostrarse como tres
tarjetas; la cantidad de listas SHALL mostrarse como un enlace de texto bajo las tarjetas
("Aparece en N listas") solo cuando N > 0, y SHALL omitirse cuando N = 0.

#### Scenario: Álbum con actividad

- **WHEN** un álbum tiene 1.204 valoraciones, 38 reseñas, 212 personas que lo coleccionan,
  97 que lo buscan y aparece en 64 listas visibles
- **THEN** el bloque muestra esas cifras en tres tarjetas, la media de estrellas y la media
  detallada, y el enlace "Aparece en 64 listas" hacia las listas que lo contienen

#### Scenario: Visitante anónimo

- **WHEN** una persona sin sesión abre el álbum
- **THEN** ve el mismo bloque de comunidad que un usuario autenticado

#### Scenario: En ninguna lista

- **WHEN** ninguna lista visible contiene el álbum
- **THEN** el bloque no muestra tarjeta ni enlace de listas

### Requirement: Umbral mínimo de agregados

El sistema SHALL mostrar la media de estrellas, la media detallada y el histograma solo
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
