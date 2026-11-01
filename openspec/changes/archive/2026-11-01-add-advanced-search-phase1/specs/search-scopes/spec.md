## MODIFIED Requirements

### Requirement: Redirección por coincidencia exacta única

En el tipo Artistas, si entre las coincidencias locales y de MusicBrainz existe **exactamente
un** artista cuyo nombre normalizado (sin distinguir mayúsculas, acentos ni espacios extra) es
igual a la consulta normalizada, `/search` SHALL redirigir a `/artist/<id>` de ese artista,
agregando `from=search` y la consulta. El perfil SHALL mostrar entonces un aviso discreto
"¿No era este?" que enlaza a `/search?type=artist&q=<consulta>&all=1`; con `all=1` la página
SHALL listar los resultados sin redirigir. Si la pata de MusicBrainz falló, la unicidad no es
verificable y la página SHALL NOT redirigir. Con dos o más coincidencias exactas SHALL NOT
redirigir. Con algún filtro activo (`artistType` o un filtro de `advanced-search-filters`) SHALL NOT redirigir.

#### Scenario: Nombre único
- **WHEN** una persona busca `Sabrina Carpenter` en Artistas y solo un artista se llama así
- **THEN** la aplicación abre el perfil de Sabrina Carpenter con el aviso "¿No era este?"

#### Scenario: Volver a la lista
- **WHEN** la persona pulsa "¿No era este?" en ese perfil
- **THEN** ve la lista de resultados de `Sabrina Carpenter` sin volver a ser redirigida

#### Scenario: Homónimos
- **WHEN** una persona busca `KISS` y existen tres artistas llamados exactamente así
- **THEN** la página no redirige y muestra los resultados

#### Scenario: MusicBrainz caído
- **WHEN** la búsqueda de artistas en MusicBrainz falla y la base local tiene un único `Icon`
- **THEN** la página no redirige, muestra lo local y avisa que faltan resultados de MusicBrainz

#### Scenario: Con filtros activos
- **WHEN** una persona busca `Sabrina Carpenter` en Artistas con `country=US` y solo un artista se llama así
- **THEN** la página no redirige y muestra la lista filtrada
