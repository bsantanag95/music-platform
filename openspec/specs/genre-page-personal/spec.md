# genre-page-personal Specification

## Purpose
Relación personal con un género: «Tu huella en el género», la acción «Me mueve» con su endpoint atómico e idempotente y la cifra de personas a las que les mueve.
## Requirements
### Requirement: Tu huella en el género

Con sesión, el Resumen SHALL mostrar la sección "Tu huella en este género", calculada solo con los datos del propio
lector sobre los álbumes del género o de sus subgéneros: cantidad de álbumes que valoró, su media de estrellas, sus 3
álbumes mejor valorados (a igualdad, el más reciente primero) y cantidad de álbumes del género en su lista Pendiente.
Una persona sin sesión SHALL NOT ver la sección ni provocar su cálculo. Si no tiene actividad en el género, la sección
SHALL mostrar una invitación a empezar por los Esenciales o, si estos se omiten, por la pestaña Álbumes. La huella de
una persona SHALL NOT mostrarse a terceros.

#### Scenario: Lector con actividad

- **WHEN** una persona que valoró 7 álbumes del género abre la página
- **THEN** ve "7 álbumes valorados", su media y sus 3 favoritos del género

#### Scenario: Lector sin actividad

- **WHEN** una persona sin valoraciones ni pendientes del género abre la página
- **THEN** ve la invitación a empezar y ninguna cifra en cero

#### Scenario: Visitante anónimo

- **WHEN** una persona sin sesión abre la página
- **THEN** no ve la sección

### Requirement: Me mueve

Con sesión, la cabecera SHALL ofrecer la acción "Me mueve", que agrega el género a "Géneros que me mueven" de la
identidad musical de la persona, y "Ya me mueve" para quitarlo. La acción SHALL usar un endpoint idempotente que
modifique la lista de forma atómica y no reemplace la lista completa: `PUT /api/me/profile/genres/{slug}` agrega el
género y `DELETE /api/me/profile/genres/{slug}` lo quita. Agregar un género que ya estaba SHALL responder 200 con la
lista actual. Agregar con la lista llena (5 géneros) SHALL responder 409 con código `MUSIC_IDENTITY_GENRES_FULL`. Un
slug que no es un estilo visible SHALL responder 404 con `GENRE_NOT_FOUND`. Sin sesión SHALL responder 401. Si la lista
cambió desde otra pestaña, la acción SHALL conservar los demás géneros. Con la lista llena la interfaz SHALL mostrar el
motivo (por código de error localizado) y no ofrecer reemplazar sin que la persona lo haga desde su perfil.

#### Scenario: Agregar el género

- **WHEN** una persona con 2 géneros pulsa "Me mueve"
- **THEN** su lista pasa a 3 géneros, incluido este, y el botón cambia a "Ya me mueve"

#### Scenario: Lista llena

- **WHEN** una persona con 5 géneros pulsa "Me mueve"
- **THEN** la respuesta es 409 `MUSIC_IDENTITY_GENRES_FULL`, la lista no cambia y la interfaz explica el motivo

#### Scenario: Edición concurrente

- **WHEN** la persona agregó un género en otra pestaña y luego pulsa "Me mueve" en una página abierta antes
- **THEN** su lista final contiene ambos géneros

#### Scenario: Idempotencia

- **WHEN** se envían dos `PUT` seguidos para el mismo género
- **THEN** ambos responden 200 y la lista contiene el género una sola vez

#### Scenario: Quitar un género que no estaba

- **WHEN** se envía `DELETE` para un género que la persona no tenía
- **THEN** la respuesta es 200 con la lista sin cambios

### Requirement: Personas a las que les mueve el género

La cabecera SHALL mostrar "Les mueve a N personas" con la cantidad de cuentas activas con perfil público que declaran
exactamente este género en su identidad musical, solo cuando N sea al menos 5. SHALL NOT mostrar una lista de nombres
ni la cifra bajo el umbral. La cifra SHALL ser igual para cualquier visitante.

#### Scenario: Umbral alcanzado

- **WHEN** 12 cuentas activas con perfil público declaran el género
- **THEN** la cabecera muestra "Les mueve a 12 personas"

#### Scenario: Bajo el umbral

- **WHEN** solo 3 cuentas lo declaran
- **THEN** la cabecera no muestra la cifra

#### Scenario: Perfil privado o cuenta desactivada

- **WHEN** una cuenta con perfil privado o desactivada declara el género
- **THEN** no cuenta en la cifra

