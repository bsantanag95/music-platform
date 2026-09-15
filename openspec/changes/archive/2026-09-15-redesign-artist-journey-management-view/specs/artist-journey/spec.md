## MODIFIED Requirements

### Requirement: Vista de gestión agrupada por tipo, en una página dedicada
El sistema SHALL presentar la selección de un recorrido en una página dedicada
(`/me/artist-journeys/[artistId]`, no en un modal ni inline en la página del artista), agrupando
**todos** los álbumes del artista por su categoría (`release_group.category`: `studio`,
`single_ep`, `compilation`, `live_other`), marcando como seleccionados los que ya son parte del
recorrido y como no seleccionados el resto, sin distinguir ni destacar editorialmente ningún
álbum dentro de su grupo de categoría. Dentro de cada grupo, los álbumes SHALL ordenarse por año
de lanzamiento ascendente; los álbumes sin año conocido SHALL ubicarse al final del grupo,
ordenados alfabéticamente entre sí — mismo criterio que ya usa la discografía de la página de
artista (`AlbumGrid`), para no presentar un orden distinto al que el usuario ya vio ahí. Cada
grupo SHALL poder colapsarse y expandirse de forma independiente; por defecto, el grupo `studio`
SHALL estar expandido y el resto de los grupos SHALL estar colapsados. Esta vista agrupada de
casilleros (el editor de la selección) SHALL permanecer oculta por defecto detrás de una acción
explícita que la despliegue, salvo cuando la selección del recorrido está vacía, caso en el que
SHALL aparecer ya desplegada — no hay nada más que mostrar en la página en ese caso. La página
SHALL requerir sesión y SHALL responder con un recorrido inexistente (404) si el usuario
autenticado no tiene un recorrido activo sobre el artista de la URL.

#### Scenario: Vista agrupada de un artista con varias categorías de lanzamiento
- **WHEN** el propietario abre la página de gestión de su recorrido sobre un artista con álbumes
  de estudio, en vivo/misceláneos y compilados
- **THEN** ve un grupo por categoría, cada uno con sus álbumes marcados según si están o no en
  la selección actual

#### Scenario: Estado de colapso por defecto
- **WHEN** el propietario abre la página de gestión por primera vez en una sesión
- **THEN** el grupo de álbumes de estudio aparece expandido y el resto de los grupos aparecen
  colapsados

#### Scenario: Colapsar y expandir un grupo
- **WHEN** el propietario alterna el colapso de un grupo
- **THEN** ese grupo muestra u oculta sus álbumes sin afectar el estado de colapso de los demás
  grupos

#### Scenario: Orden por año dentro de un grupo
- **WHEN** el propietario expande un grupo con álbumes de varios años
- **THEN** los ve ordenados de más antiguo a más nuevo

#### Scenario: Álbumes sin año al final del grupo
- **WHEN** un grupo tiene álbumes con año de lanzamiento conocido y álbumes sin él
- **THEN** los álbumes sin año aparecen después de todos los que sí tienen año, ordenados entre
  sí alfabéticamente

#### Scenario: Sin tratamiento editorial dentro de un grupo
- **WHEN** el propietario ve el grupo "En vivo / Misceláneo" de un artista con lanzamientos en
  vivo muy conocidos
- **THEN** ningún álbum del grupo aparece destacado o pre-sugerido de forma distinta a los
  demás de su mismo tipo

#### Scenario: Sin sesión
- **WHEN** una persona sin sesión abre la página de gestión de un recorrido
- **THEN** es redirigida al inicio de sesión

#### Scenario: Recorrido inexistente
- **WHEN** un usuario autenticado abre la página de gestión de un artista sobre el que nunca
  activó un recorrido
- **THEN** la página responde 404

#### Scenario: El editor está oculto por defecto
- **WHEN** el propietario abre la página de gestión de un recorrido con al menos un álbum
  seleccionado
- **THEN** no ve la grilla de casilleros de inmediato, sino una acción explícita para desplegarla

#### Scenario: El editor se abre automáticamente cuando la selección está vacía
- **WHEN** el propietario abre la página de gestión de un recorrido sin ningún álbum seleccionado
- **THEN** ve la grilla de casilleros ya desplegada, sin necesidad de un clic adicional

## ADDED Requirements

### Requirement: Vista de la selección actual con carátulas, orden y enlaces
El sistema SHALL mostrar, como contenido principal de la página de gestión, la selección actual
del recorrido — no la discografía completa del artista — agrupada por categoría con el mismo
criterio de agrupación y de orden por año que el editor (Requirement "Vista de gestión agrupada
por tipo, en una página dedicada"), incluyendo la carátula de cada álbum. El sistema SHALL ofrecer,
además del orden por año de lanzamiento, un orden alfabético por título, aplicado dentro de cada
grupo y seleccionable por el propietario. El sistema SHALL ofrecer dos modos de visualización
mutuamente excluyentes para esta vista — lista (carátula, título y año) y gráfico (pared de
carátulas) —, aplicados por igual a toda la vista; a diferencia del modo de `/me/artist-journeys`,
el modo de esta vista SHALL NOT persistir entre visitas. El título de cada álbum SHALL enlazar a
su propia página de catálogo. Cada álbum de esta vista SHALL ofrecer una acción de quitarlo
directamente, que SHALL modificar el mismo borrador local del Requirement "Editar un borrador
local y guardar en una sola operación" — sin llamar al servidor hasta que el propietario active
"Guardar". Cuando la selección del recorrido está vacía, esta vista SHALL NOT mostrarse.

#### Scenario: Selección agrupada con carátulas como contenido principal
- **WHEN** el propietario abre la página de gestión de un recorrido con álbumes seleccionados de
  más de una categoría
- **THEN** ve esos álbumes agrupados por categoría, cada uno con su carátula, sin ver los álbumes
  no seleccionados

#### Scenario: Orden alfabético de la selección
- **WHEN** el propietario elige el orden alfabético en la vista de selección
- **THEN** los álbumes de cada grupo se reordenan por título, sin distinguir mayúsculas

#### Scenario: Cambiar a modo gráfico
- **WHEN** el propietario cambia la vista de selección a modo gráfico
- **THEN** ve una pared de carátulas de los álbumes seleccionados, agrupados por categoría, en vez
  de la lista

#### Scenario: Enlace desde el título de un álbum
- **WHEN** el propietario hace clic en el título de un álbum de la selección
- **THEN** llega a la página de ese álbum

#### Scenario: Quitar un álbum desde la vista de selección
- **WHEN** el propietario activa la acción de quitar sobre un álbum de la vista de selección
- **THEN** ese álbum desaparece de la vista y el botón "Guardar" pasa a estar habilitado, sin que
  la selección persistida cambie hasta que el propietario confirme

#### Scenario: Selección vacía no muestra esta vista
- **WHEN** la selección del recorrido está vacía
- **THEN** la página no muestra esta vista, y el editor aparece ya desplegado en su lugar

### Requirement: Foto del artista en el encabezado de gestión
El sistema SHALL mostrar la foto del artista en el encabezado de la página de gestión del
recorrido cuando el catálogo tiene una foto registrada para ese artista, y un reemplazo neutro —
mismo tratamiento que el resto del catálogo — cuando no la tiene. El nombre del artista en ese
mismo encabezado SHALL enlazar a la página de ese artista.

#### Scenario: Foto disponible
- **WHEN** el artista del recorrido tiene una foto registrada en el catálogo
- **THEN** el encabezado de la página de gestión la muestra

#### Scenario: Sin foto registrada
- **WHEN** el artista del recorrido no tiene ninguna foto registrada
- **THEN** el encabezado muestra el mismo reemplazo neutro que usa el resto del catálogo para
  artistas sin foto

#### Scenario: Enlace desde el nombre del artista
- **WHEN** el propietario hace clic en el nombre del artista en el encabezado de la página de
  gestión
- **THEN** llega a la página de ese artista
