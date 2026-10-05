## MODIFIED Requirements

### Requirement: Listado de artistas del género

La pestaña Artistas SHALL listar, paginados de 24 en 24, los artistas del género con las tarjetas definidas en
`genre-pages`, y aceptar `q` (nombre sin acentos ni mayúsculas), `orden`, y los filtros `pais`, `debut`, `tam` y
`conocidos`, todos en la URL. `orden` admite `albumes` (predeterminado), `seguidos` (cantidad de personas que siguen al
artista, sin mostrar la cifra), `az`, `recientes` (debut más reciente primero, debut desconocido al final) y `descubrir`
(con señal de comunidad primero, luego más seguidores, luego debut más reciente; ver `genre-artist-discovery`). Los
filtros SHALL combinarse entre sí y con `q`: `pais` (código ISO-2 de un país presente entre los artistas del género; otro
valor se ignora), `debut` (década de debut, solo artistas con debut conocido), `tam=corta` (discografía corta: explorada y con 1 a 5 discos propios; ver `genre-artist-discovery`) y
`conocidos=no` (oculta los artistas conocidos; solo con sesión, sin ella se ignora). Un valor inválido SHALL reemplazarse
por el predeterminado en la página y el servicio SHALL rechazar con `VALIDATION_ERROR` un orden, una década o una
paginación inválidos. Cambiar un filtro SHALL volver a la página 1. La barra de filtros SHALL ofrecer los selectores de
país y de debut solo con opciones reales (países y décadas presentes entre los artistas del género, con su conteo) y
«Limpiar filtros» cuando haya alguno activo. Un listado filtrado sin resultados SHALL mostrar el estado vacío con
«Limpiar filtros», distinto del mensaje de género sin artistas.

#### Scenario: Ordenar alfabéticamente

- **WHEN** una persona elige `orden=az`
- **THEN** los artistas aparecen por nombre ascendente

#### Scenario: Más seguidos

- **WHEN** una persona elige `orden=seguidos`
- **THEN** el artista con más seguidores aparece primero y la tarjeta no muestra la cantidad

#### Scenario: Debut más reciente

- **WHEN** una persona elige `orden=recientes`
- **THEN** los artistas aparecen del debut más reciente al más antiguo y los de debut desconocido al final

#### Scenario: Filtrar por país y debut

- **WHEN** una persona abre `?tab=artists&pais=CL&debut=2010`
- **THEN** ve solo artistas de Chile cuyo debut conocido cae entre 2010 y 2019

#### Scenario: Discografía corta

- **WHEN** una persona activa `tam=corta`
- **THEN** no ve artistas con más de 5 discos propios

#### Scenario: Sin explorar no cuenta como corta

- **WHEN** una persona activa `tam=corta`
- **THEN** no ve artistas cuya discografía no se recorrió entera, aunque no tengan discos conocidos

#### Scenario: Que aún no conozco

- **WHEN** una persona con sesión activa `conocidos=no`
- **THEN** no ve artistas que sigue ni de los que valoró, escuchó o guardó algo

#### Scenario: Filtro de conocimiento sin sesión

- **WHEN** una persona sin sesión abre `?tab=artists&conocidos=no`
- **THEN** el parámetro se ignora y no se ofrece el selector

#### Scenario: Valor inválido

- **WHEN** la URL trae `pais=ZZZ` o `debut=1975`
- **THEN** la página responde 200 sin aplicar ese filtro
