# album-quick-actions Specification

## Purpose
Llevar el menú de acciones por disco a la búsqueda, Explorar, las listas de álbumes ajenas y la tira de la discografía del álbum, con las marcas del usuario pedidas al abrirlo mediante su endpoint, y unificar el menú de Explorar conservando sus acciones de listas y colección.
## Requirements
### Requirement: Menú de acciones del disco en más superficies

El menú "…" de acciones por disco (capability `discography-quick-actions`) SHALL estar en los
resultados de búsqueda de álbumes (al final de cada fila), en las tarjetas de álbum de Explorar
(esquina de la portada), en los discos de una lista de álbumes de otra persona en sus tres vistas
(al final de la fila en índice y detallada, esquina de la portada en gráfica) y en la tira de la
discografía de la página del álbum (esquina de la portada, salvo el disco actual). Las acciones,
la accesibilidad y el comportamiento sin sesión SHALL ser los mismos que en la discografía. Solo
un menú SHALL estar abierto a la vez en cada superficie.

#### Scenario: Registrar una escucha desde la búsqueda

- **WHEN** una persona busca "Dr. Feelgood", abre "…" en el resultado y activa "Registrar escucha"
- **THEN** la escucha se registra sin salir de la búsqueda

#### Scenario: Lista ajena

- **WHEN** una persona ve la lista de álbumes de otra persona y abre "…" en un disco
- **THEN** puede guardarlo en Pendiente o en sus listas desde ahí

#### Scenario: Lista propia

- **WHEN** el dueño gestiona su propia lista
- **THEN** los discos muestran sus controles de gestión y no el menú de acciones

#### Scenario: Disco actual en la tira

- **WHEN** una persona está en la página de *Theatre of Pain*
- **THEN** la tira de la discografía ofrece el menú en los demás discos y no en *Theatre of Pain*

### Requirement: Marcas del disco bajo demanda

Fuera de la discografía del artista, el menú SHALL pedir las marcas del disco al abrirse, sin
consultarlas en la carga de la página. Mientras llegan, las acciones SHALL mostrarse
deshabilitadas con su forma final; si la carga falla, el menú SHALL mostrar un error con la opción
de reintentar. Para un visitante sin sesión no SHALL hacerse la consulta.

#### Scenario: Abrir el menú de un disco favorito

- **WHEN** una persona con sesión abre "…" en Explorar sobre un disco que tiene como favorito
- **THEN** el menú muestra Favorito activado una vez que llegan las marcas

#### Scenario: Sin sesión

- **WHEN** un visitante sin sesión abre "…" en un resultado de búsqueda
- **THEN** ve la invitación a iniciar sesión y no se consultan marcas

### Requirement: Endpoint de marcas de un disco

`GET /api/me/release-groups/{id}/marks` SHALL devolver, para el usuario en sesión, si escuchó el
disco, su nota y puntaje detallado, si es favorito, si está en Pendiente y las listas propias que
lo contienen. Sin sesión SHALL responder `401 AUTH_REQUIRED`, con un id inválido `400` y con un
disco inexistente `404 ALBUM_NOT_FOUND`. La respuesta SHALL NOT guardarse en caché.

#### Scenario: Disco con marcas

- **WHEN** una persona que calificó un disco con 4 estrellas y lo tiene en una lista pide sus marcas
- **THEN** la respuesta trae la nota 4 y esa lista

#### Scenario: Sin sesión

- **WHEN** se piden las marcas de un disco sin sesión
- **THEN** la respuesta es `401 AUTH_REQUIRED`

### Requirement: Menú unificado en Explorar

La tarjeta de álbum de Explorar SHALL usar el menú de acciones del disco en lugar de su menú
anterior, y SHALL conservar en él las acciones que el menú común no tiene: "Ver en listas" y las
acciones de colección "Lo busco" y "Ya la tengo", con el mismo comportamiento que antes.

#### Scenario: Colección desde Explorar

- **WHEN** una persona abre "…" en una tarjeta de Explorar y elige "Lo busco"
- **THEN** el disco se agrega a sus deseados, como con el menú anterior

#### Scenario: Favorito con estado

- **WHEN** una persona abre "…" en una tarjeta de un disco que ya es favorito
- **THEN** Favorito aparece activado, a diferencia del menú anterior

