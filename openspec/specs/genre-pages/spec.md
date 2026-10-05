# genre-pages Specification

## Purpose
Página pública de cada género (`/genre/<slug>`): cabecera fija y pestañas (Resumen, Álbumes, Artistas, Listas) por `?tab=`, con sus migas, familias y artistas; el contenido de cada pestaña lo definen las capacidades `genre-page-*`.
## Requirements
### Requirement: Página de género

El sistema SHALL ofrecer la página pública `/{locale}/genre/<slug>` para cada género de estilo visible de la
taxonomía, identificado por su slug guardado (ADR 0023). La página SHALL tener una cabecera fija con el nombre del
género localizado y sus familias (cada una enlaza a `/explore?familia=<clave>`) y, debajo, cuatro pestañas: Resumen,
Álbumes, Artistas y Listas. El contenido de cada pestaña SHALL ser el definido por las capacidades
`genre-page-overview`, `genre-page-catalog` y `genre-page-community`. Cada género relacionado SHALL enlazar a su propia
página. Un slug que no existe, no es un género de estilo (descriptor u oculto) o tiene formato inválido SHALL
responder 404. Un slug con mayúsculas SHALL redirigir al canónico en minúsculas.

#### Scenario: Género con subgéneros y música

- **WHEN** una persona abre `/es/genre/progressive-rock`
- **THEN** ve "rock progresivo", su familia Rock, las cuatro pestañas y, en el Resumen, el lugar del género en el
  árbol con sus subgéneros enlazados, artistas y álbumes del género o de sus subgéneros

#### Scenario: Género sin música en el catálogo

- **WHEN** el género existe pero ningún artista ni álbum del catálogo lo tiene
- **THEN** la página muestra su cabecera y el árbol y el mensaje "Todavía no hay música de este género en el
  catálogo", sin secciones vacías ni pestañas con listados vacíos

#### Scenario: Slug que no es un estilo

- **WHEN** una persona abre `/es/genre/instrumental` (descriptor) o `/es/genre/no-existe`
- **THEN** la respuesta es 404

#### Scenario: Slug con mayúsculas

- **WHEN** una persona abre `/es/genre/Shoegaze`
- **THEN** es redirigida a `/es/genre/shoegaze`

### Requirement: Artistas de un género

La pestaña Artistas de la página de género SHALL listar, paginados, los artistas cuya lista de géneros semilla incluye
el género o uno de sus subgéneros y cuyo tipo es conocido. Cada artista SHALL mostrarse como una tarjeta con su foto
(o un reemplazo), su nombre enlazado y la cantidad de álbumes **del género** acreditados al artista en el catálogo. El
orden predeterminado SHALL ser por esa cantidad de álbumes y, a igualdad, por nombre.

#### Scenario: Orden de artistas

- **WHEN** dos artistas tienen el género y uno tiene más álbumes del género acreditados
- **THEN** ese artista aparece primero

#### Scenario: Álbumes del género, no totales

- **WHEN** un artista tiene 10 álbumes acreditados, de los cuales 2 son del género
- **THEN** su tarjeta dice "2 álbumes" y no "10"

### Requirement: Pestañas de la página de género

La página de género SHALL elegir su pestaña por el parámetro `?tab=` con los valores `albums`, `artists` y `lists`;
sin parámetro, o con un valor desconocido, SHALL mostrar el Resumen. Una pestaña inválida SHALL NOT producir un 404.
Cada pestaña SHALL consultar y renderizar solo sus propios datos. Los parámetros de filtro (`q`, `tipo`, `decada`,
`sub`, `solo`, `orden`, `vista`, `page`) SHALL leerse solo en la pestaña que los usa y un valor inválido SHALL
reemplazarse por el predeterminado de esa pestaña. La pestaña activa SHALL indicarse de forma accesible
(`aria-current="page"`).

#### Scenario: Pestaña por defecto

- **WHEN** una persona abre `/es/genre/shoegaze` sin parámetros
- **THEN** ve el Resumen con la pestaña "Resumen" activa

#### Scenario: Pestaña desconocida

- **WHEN** una persona abre `/es/genre/shoegaze?tab=canciones`
- **THEN** ve el Resumen, con respuesta 200

#### Scenario: Filtro de otra pestaña

- **WHEN** una persona abre `/es/genre/shoegaze?tab=artists&tipo=studio`
- **THEN** el filtro `tipo` se ignora porque la pestaña Artistas no lo usa

### Requirement: Cabecera y migas de la página de género

La cabecera SHALL mostrar las migas Inicio › Explorar › {familia} › {género}, donde la familia es la primera del
género en el orden de la interfaz y enlaza a `/explore?familia=`; un género sin familia SHALL omitir ese tramo. SHALL
mostrar el nombre del género localizado como encabezado de nivel 1 y, para quien tiene sesión, la acción "Me mueve"
definida en `genre-page-personal`. El título del documento SHALL incluir el nombre localizado.

#### Scenario: Migas con familia

- **WHEN** una persona abre un género de la familia Rock
- **THEN** las migas muestran Inicio, Explorar, Rock y el género, y Rock enlaza a `/explore?familia=rock`

#### Scenario: Género sin familia

- **WHEN** el género no pertenece a ninguna familia
- **THEN** las migas omiten el tramo de la familia

