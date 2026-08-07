# catalog-artist

Perfil público de artista en el catálogo navegable, con enriquecimiento de stub y discografía agrupada.

## Requirements

### Requirement: Perfil localizado de artista
La aplicación SHALL exponer un perfil público en `/{locale}/artist/{id}` para los locales soportados y SHALL mostrar el nombre del artista, su tipo traducido, su biografía cuando exista, su discografía disponible y breadcrumbs localizados dentro del encabezado global del catálogo.

#### Scenario: Artista válido en español
- **WHEN** una persona visita `/es/artist/<id-válido>`
- **THEN** la aplicación muestra el nombre y los datos musicales del artista, las etiquetas de interfaz aparecen en español y el breadcrumb enlaza al inicio

#### Scenario: Artista válido en inglés
- **WHEN** una persona visita `/en/artist/<id-válido>`
- **THEN** la aplicación muestra el mismo contenido musical, las etiquetas de interfaz aparecen en inglés y el breadcrumb enlaza al inicio

#### Scenario: Artista inexistente
- **WHEN** una persona visita un id que no corresponde a ningún artista
- **THEN** la aplicación responde con un 404 amigable y localizado, sin mostrar el mensaje crudo del backend

### Requirement: Enriquecimiento de artistas stub
La aplicación SHALL enriquecer automáticamente un artista almacenado como stub cuando se visite su perfil y SHALL renderizar el perfil enriquecido si MusicBrainz entrega los datos.

#### Scenario: Visita de artista stub
- **WHEN** una persona visita el perfil de un artista cuyo tipo almacenado es `unknown`
- **THEN** el servicio de catálogo intenta enriquecerlo antes de mostrar la información y la página presenta los datos obtenidos

### Requirement: Discografía agrupada
La aplicación SHALL mostrar los grupos de lanzamiento agrupados y etiquetados por las categorías `studio`, `single_ep`, `compilation` y `live_other`, manteniendo el título original de cada grupo.

#### Scenario: Categorías con contenido
- **WHEN** el artista tiene grupos de lanzamiento en una o más categorías
- **THEN** cada grupo aparece bajo la sección traducida correspondiente y cada tarjeta conserva su título sin traducir

#### Scenario: Categoría vacía
- **WHEN** el artista no tiene grupos de lanzamiento en una categoría
- **THEN** esa categoría no muestra una sección vacía ni rompe el layout del perfil

### Requirement: Datos opcionales del artista
La aplicación SHALL renderizar un fallback visual cuando el artista no tenga foto y SHALL omitir o presentar de forma neutra la biografía cuando sea nula, sin impedir la navegación de la página.

#### Scenario: Artista sin foto ni biografía
- **WHEN** la respuesta del artista contiene `photoUrl` y `bio` nulos
- **THEN** el encabezado muestra el fallback visual y el resto del perfil se renderiza correctamente

### Requirement: Carga progresiva de carátulas
La aplicación SHALL cargar cada carátula después del render inicial mediante el endpoint cover-only del `releaseGroup` (`GET /api/catalog/release-group/{id}/cover`), que resuelve la carátula sin ingestar el tracklist del álbum, SHALL mostrar un estado de carga accesible y SHALL usar un fallback cuando no exista carátula.

#### Scenario: Carátula disponible
- **WHEN** el endpoint cover-only devuelve una carátula válida
- **THEN** la tarjeta reemplaza su skeleton por la miniatura devuelta por el backend sin bloquear la carga inicial del perfil

#### Scenario: Carátula ausente o consulta fallida
- **WHEN** el endpoint cover-only no devuelve carátula o la consulta falla
- **THEN** la tarjeta muestra un fallback visual estable y el resto de la discografía permanece usable

### Requirement: Enlaces preparados para álbumes
Las tarjetas de discografía SHALL construir enlaces locale-aware a `/album/[id]` usando la navegación interna del proyecto, sin construir URLs de carátula manualmente.

#### Scenario: Enlace de álbum conserva el locale
- **WHEN** una persona selecciona una tarjeta desde `/es/artist/<id>` o `/en/artist/<id>`
- **THEN** el enlace apunta al detalle del álbum con el mismo locale activo y el id propio del `releaseGroup`