## ADDED Requirements

### Requirement: Años, lugar y duración en las filas de resultados

Las filas de artista SHALL mostrar, cuando se conozcan, la ciudad o región donde nació o se formó y los años de actividad o
de vida, también para los artistas que solo vienen de MusicBrainz (con las fechas y el lugar que trae la propia búsqueda,
sin otra request). La desambiguación SHALL omitirse cuando repite el país o la ciudad de la fila. Las filas de canción
SHALL mostrar la duración de su grabación principal cuando se conozca.

#### Scenario: Artista solo de MusicBrainz
- **WHEN** una búsqueda de grupos de Chile trae un grupo que aún no está en la base, formado en 1987 en Santiago
- **THEN** su fila muestra "Grupo · Chile · Santiago · desde 1987"

#### Scenario: Desambiguación repetida
- **WHEN** un artista de Chile tiene como desambiguación "Chile"
- **THEN** su fila muestra "Chile" una sola vez

#### Scenario: Duración de una canción
- **WHEN** una búsqueda trae "Paranoid Android" de Radiohead con una grabación de 6:23
- **THEN** su fila muestra 6:23 a la derecha
