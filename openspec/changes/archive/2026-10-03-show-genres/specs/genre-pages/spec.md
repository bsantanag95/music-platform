## ADDED Requirements

### Requirement: Página de género

El sistema SHALL ofrecer la página pública `/{locale}/genre/<slug>` para cada género de estilo visible de la
taxonomía, identificado por su slug guardado (ADR 0023). La página SHALL mostrar el nombre del género localizado,
sus familias (cada una enlaza a `/explore?familia=<clave>`), el género o los géneros de los que es subgénero, sus
subgéneros, sus géneros cercanos (de los que es fusión y los que lo influyeron, sin repetir padres ni subgéneros,
hasta 8), los artistas con ese género o un subgénero, y los álbumes de ese género o de un subgénero, paginados por
`?page=` con el mismo orden determinista que Explorar. Cada género relacionado SHALL enlazar a su propia página. Un
slug que no existe, no es un género de estilo (descriptor u oculto) o tiene formato inválido SHALL responder 404. Un
slug con mayúsculas SHALL redirigir al canónico en minúsculas.

#### Scenario: Género con subgéneros y música

- **WHEN** una persona abre `/es/genre/progressive-rock`
- **THEN** ve "rock progresivo", su familia Rock, "Subgénero de: rock", sus subgéneros con enlace, artistas del
  género y un listado paginado de álbumes de ese género o de sus subgéneros

#### Scenario: Género sin música en el catálogo

- **WHEN** el género existe pero ningún artista ni álbum del catálogo lo tiene
- **THEN** la página muestra su cabecera y relaciones y el mensaje "Todavía no hay música de este género en el
  catálogo", sin secciones vacías

#### Scenario: Slug que no es un estilo

- **WHEN** una persona abre `/es/genre/instrumental` (descriptor) o `/es/genre/no-existe`
- **THEN** la respuesta es 404

#### Scenario: Slug con mayúsculas

- **WHEN** una persona abre `/es/genre/Shoegaze`
- **THEN** es redirigida a `/es/genre/shoegaze`

### Requirement: Artistas de un género

La sección de artistas de la página de género SHALL listar hasta 12 artistas cuya lista de géneros semilla incluye el
género o uno de sus subgéneros, ordenados por cantidad de álbumes acreditados en el catálogo y, a igualdad, por nombre.

#### Scenario: Orden de artistas

- **WHEN** dos artistas tienen el género y uno tiene más álbumes acreditados
- **THEN** ese artista aparece primero
