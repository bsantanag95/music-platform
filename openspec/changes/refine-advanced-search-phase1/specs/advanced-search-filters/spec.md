## ADDED Requirements

### Requirement: Barra de criterios con el formulario recogido

Con una búsqueda en curso, `/search/advanced` SHALL mostrar el formulario recogido en una barra con una pastilla por
criterio activo (un rango es una pastilla; cada país y cada tipo de lanzamiento, una) y un botón **Editar búsqueda** que
abre el formulario con los valores de la URL. Cada pastilla SHALL ser un enlace a la misma búsqueda sin ese criterio
(quitar un texto quita también su coincidencia exacta); quitar el último criterio SHALL llevar a la pestaña sin campos.
Sin búsqueda, el formulario SHALL verse abierto y sin barra. Una búsqueda nueva SHALL volver a recoger el formulario.

#### Scenario: Buscar recoge el formulario
- **WHEN** una persona busca grupos de Chile con inicio entre 1980 y 1989
- **THEN** ve la barra con "Grupo", "Chile" e "Inicio 1980–1989" y los resultados justo debajo, sin el formulario

#### Scenario: Quitar un criterio
- **WHEN** una persona pulsa la pastilla "Chile" en esa búsqueda
- **THEN** la página navega a la misma búsqueda sin `country=CL`

#### Scenario: Editar
- **WHEN** una persona pulsa **Editar búsqueda**
- **THEN** el formulario se abre con los campos de la búsqueda en curso

### Requirement: Encabezado de resultados de la búsqueda avanzada

El encabezado de resultados SHALL mostrar la cifra total con separador de miles y lo que se cuenta: "grupos" o "personas"
si se filtró por tipo de artista, "artistas" si no; "álbumes"; "canciones". SHALL NOT acotarse a "más de 1000" ni
repetirse en el aviso de búsqueda amplia.

#### Scenario: Cifra de grupos
- **WHEN** una búsqueda de grupos de Chile formados entre 1980 y 1989 da 53 resultados
- **THEN** el encabezado dice "53 grupos"

### Requirement: Sin coincidencias en la búsqueda avanzada

Sin resultados, la página SHALL ofrecer un enlace por criterio activo que lleva a la búsqueda sin ese criterio y, con 2 a
4 criterios, la cantidad de resultados que daría, que SHALL llegar sin retrasar el resto del estado. Con un nombre o
título, SHALL ofrecer la misma búsqueda en `/search`, que tolera errores de escritura. Con un único criterio SHALL
ofrecer **Limpiar**.

#### Scenario: Nombre inexistente con país
- **WHEN** una persona busca en Artistas el nombre `zzqxv blorp` con Chile y no hay resultados
- **THEN** ve "Sin «zzqxv blorp»" y "Sin Chile" con sus cifras y "Buscar «zzqxv blorp» en la búsqueda rápida"

### Requirement: Búsqueda amplia sugiere campos

Sin nombre ni título y con más de 500 resultados, la página SHALL avisar que solo se muestran los primeros y SHALL sugerir
hasta tres campos sin valor que acotan el tipo (Artistas: país, año de inicio, tipo; Álbumes: año de lanzamiento,
artista; Canciones: artista, álbum, duración). Cada sugerencia SHALL abrir el formulario con el foco en ese campo.

#### Scenario: Solo directos
- **WHEN** una persona busca en Álbumes solo "Directos y otros"
- **THEN** ve "14.514 álbumes", el aviso con "Año de lanzamiento" y "Artista", y al pulsar "Año de lanzamiento" el
  formulario se abre con el foco en "desde"

### Requirement: Canciones sin título en lista simple

En la pestaña Canciones sin título, los resultados SHALL mostrarse como una lista simple de canciones, sin el bloque de
mejor coincidencia con los álbumes de la primera.

#### Scenario: Canciones largas de un artista
- **WHEN** una persona busca canciones de Radiohead de 7:00 o más, sin título
- **THEN** ve la lista de canciones, sin "Álbumes que contienen…"
