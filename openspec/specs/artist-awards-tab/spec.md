# artist-awards-tab Specification

## Purpose
Mostrar en la página del artista los premios que lo reconocen como intérprete (por él, sus discos o sus grabaciones), agrupados por ceremonia en su propia pestaña y resumidos en la ficha de la cabecera.
## Requirements
### Requirement: Pestaña Premios del artista

La página de artista SHALL tener una pestaña **Premios** (`/{locale}/artist/{id}/awards`) cuando el artista tiene al
menos una nominación como intérprete: a él mismo, a un disco o a una grabación donde tiene crédito principal, en una
categoría que premia al intérprete (las de compositores no cuentan). La pestaña SHALL mostrar una tarjeta por ceremonia,
de la más reciente a la más antigua, con el nombre del premio y el año enlazados a la página de la ceremonia (o de la
clase, en un salón de la fama) y, por nominación, la categoría en el idioma de la interfaz, el disco nominado enlazado a
su álbum (o lo nominado, si no es el artista) y el resultado: "Ganó", "Nominado" o, en un salón de la fama,
"Incorporado". Lo ganado SHALL ir primero dentro de cada ceremonia. Arriba, un resumen SHALL dar los ganados, las
nominaciones en competencias y las incorporaciones a salones de la fama. Sin nominaciones la pestaña SHALL NOT existir y
su URL SHALL responder 404.

#### Scenario: Artista con muchos premios

- **WHEN** una persona abre la pestaña Premios de Bad Bunny
- **THEN** ve "29 ganados · 54 nominaciones" y una tarjeta por ceremonia desde la más reciente

#### Scenario: Salón de la fama

- **WHEN** un disco del artista está en una clase del Salón de la Fama de los Grammy
- **THEN** su tarjeta enlaza a la clase y la nominación dice "Incorporado", sin contar como premio ganado

#### Scenario: Sin premios

- **WHEN** una persona abre `/artist/{id}/awards` de un artista sin nominaciones
- **THEN** recibe 404 y la barra de pestañas no muestra Premios

### Requirement: Premios en la ficha del artista

Con alguna nominación, la ficha de la cabecera SHALL sumar una fila "Premios" con las mismas cifras del resumen y un
enlace "Ver →" a la pestaña Premios.

#### Scenario: Fila de la ficha

- **WHEN** una persona abre Bad Bunny
- **THEN** la ficha dice "Premios: 29 ganados · 54 nominaciones · Ver →"

