# genre-page-catalog Specification

## Purpose
Pestañas Álbumes y Artistas de la página de género: listado paginado con búsqueda, filtros, órdenes y vistas, con el estado en la URL.
## Requirements
### Requirement: Listado de álbumes del género

La pestaña Álbumes SHALL listar, paginados de 24 en 24 por `?page=`, los álbumes del género o de sus subgéneros. El
estado del listado SHALL vivir en la URL: búsqueda `q`, tipo `tipo` (`studio`, `single_ep`, `compilation`,
`live_other`), década `decada`, subgénero `sub`, alcance `solo`, orden `orden` y vista `vista`. Un valor inválido SHALL
reemplazarse por el predeterminado en la página y el servicio SHALL rechazar con `VALIDATION_ERROR` una paginación,
década o tipo inválidos. Los filtros SHALL combinarse entre sí. Cambiar un filtro SHALL volver a la página 1.

#### Scenario: Combinar filtros

- **WHEN** una persona abre `?tab=albums&tipo=studio&decada=1970`
- **THEN** ve solo álbumes de estudio con año entre 1970 y 1979

#### Scenario: Valor inválido

- **WHEN** una persona abre `?tab=albums&orden=cualquiera&decada=1975`
- **THEN** la página responde 200 con el orden predeterminado y sin filtrar por década

#### Scenario: Cambiar un filtro

- **WHEN** una persona está en la página 3 y cambia el tipo
- **THEN** la URL resultante vuelve a la página 1

### Requirement: Orden de los álbumes del género

El listado SHALL ofrecer cinco órdenes, todos deterministas con el identificador del álbum como desempate:
`mejor` (predeterminado: promedio de valoraciones cuando el álbum tiene al menos 3, luego año descendente),
`populares` (cantidad de valoraciones descendente, luego `mejor`), `recientes` (año descendente, sin año al final),
`antiguos` (año ascendente, sin año al final) y `az` (título sin acentos ni mayúsculas ascendente). Con `orden=mejor`
y sin otros filtros el resultado SHALL coincidir con el listado por género de Explorar.

#### Scenario: Más recientes primero

- **WHEN** una persona elige `orden=recientes`
- **THEN** los álbumes aparecen del año más nuevo al más antiguo y los de año desconocido al final

#### Scenario: Orden estable

- **WHEN** dos álbumes empatan en el criterio de orden
- **THEN** su orden relativo es el mismo en cada visita y entre páginas

### Requirement: Búsqueda dentro del género

El listado SHALL aceptar un texto `q` que coincida, sin distinguir acentos ni mayúsculas, con el título del
álbum o con el nombre de un artista acreditado. La normalización SHALL ser la misma de la búsqueda del sitio. Una
búsqueda sin resultados SHALL mostrar un estado vacío con la acción "Limpiar filtros", distinto del mensaje de género
sin música.

#### Scenario: Buscar sin acentos

- **WHEN** una persona busca `motorhead` en un género con un álbum de Motörhead
- **THEN** el álbum aparece en los resultados

#### Scenario: Sin resultados

- **WHEN** ningún álbum del género coincide con `q` y los filtros
- **THEN** la pestaña muestra "Limpiar filtros" y no el mensaje "Todavía no hay música de este género"

### Requirement: Subgénero y alcance

El listado SHALL permitir acotar a un subgénero (`sub=<slug>`), que SHALL ser un descendiente del género de la página;
un slug que no lo sea SHALL ignorarse. Por defecto el listado SHALL incluir los subgéneros; con `solo=1` SHALL listar
únicamente los álbumes que tienen ese género exacto como género efectivo, sin descendientes. La barra de filtros SHALL
ofrecer el selector de subgénero solo si el género tiene subgéneros con música.

#### Scenario: Solo el género exacto

- **WHEN** una persona activa "solo este género"
- **THEN** no aparecen álbumes cuyo único género efectivo es un subgénero

#### Scenario: Subgénero ajeno

- **WHEN** la URL trae `sub=` con un género que no desciende del de la página
- **THEN** el filtro se ignora y se listan los álbumes del género

### Requirement: Vistas cuadrícula y lista

El listado de álbumes SHALL ofrecer la vista cuadrícula (predeterminada, con las tarjetas de álbum) y la vista lista
(`vista=lista`), con una fila por álbum: carátula pequeña, título, artista principal, año, tipo y el menú de acciones
del disco. La vista SHALL elegirse solo por la URL, de modo que un enlace se vea igual para todos.

#### Scenario: Vista lista

- **WHEN** una persona abre `?tab=albums&vista=lista`
- **THEN** ve una fila por álbum con título, artista, año y tipo

### Requirement: Listado de artistas del género

La pestaña Artistas SHALL listar, paginados de 24 en 24, los artistas del género con las tarjetas definidas en
`genre-pages`, y aceptar `q` (nombre sin acentos ni mayúsculas) y `orden`: `albumes` (predeterminado), `seguidos`
(cantidad de personas que siguen al artista, sin mostrar la cifra) y `az`.

#### Scenario: Ordenar alfabéticamente

- **WHEN** una persona elige `orden=az`
- **THEN** los artistas aparecen por nombre ascendente

#### Scenario: Más seguidos

- **WHEN** una persona elige `orden=seguidos`
- **THEN** el artista con más seguidores aparece primero y la tarjeta no muestra la cantidad

