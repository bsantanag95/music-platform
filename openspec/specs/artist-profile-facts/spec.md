# artist-profile-facts Specification

## Purpose
Guardar la ficha del artista desde MusicBrainz (país, lugares, fechas de vida o actividad y enlaces curados) en la misma request que sus pertenencias, sin géneros ni etiquetas, y mantenerla al día.
## Requirements
### Requirement: Datos de ficha desde MusicBrainz

El sistema SHALL guardar, por cada artista con MBID, los datos de ficha que entrega
MusicBrainz: país (código ISO), nombre del lugar de inicio y del lugar de fin, fecha de
inicio y fecha de fin con la precisión que tengan (año, año y mes, o fecha completa) y si
el artista terminó. Para una persona, inicio y fin SHALL interpretarse como nacimiento y
muerte; para un grupo, como formación y separación. Estos datos SHALL obtenerse en la misma
request a MusicBrainz que ya trae las pertenencias del artista, sin requests adicionales.

#### Scenario: Grupo separado

- **WHEN** se enriquece Pink Floyd (MusicBrainz: `GB`, inicio en London, 1965–2014, terminó)
- **THEN** el artista guarda país `GB`, lugar de inicio "London", inicio `1965`, fin `2014`
  y la marca de terminado

#### Scenario: Persona viva

- **WHEN** se enriquece a una solista nacida el 11 de mayo de 1999 sin fecha de fin
- **THEN** el artista guarda inicio `1999-05-11` con precisión diaria, sin fin y sin la
  marca de terminado

#### Scenario: Una sola request

- **WHEN** se sincronizan a la vez las pertenencias y la ficha de un artista
- **THEN** se hace una sola request a MusicBrainz para ambas

### Requirement: Sin géneros ni etiquetas de MusicBrainz

El sistema SHALL NOT ingerir los géneros ni las etiquetas de MusicBrainz: son datos
suplementarios con licencia CC BY-NC-SA 3.0 (no comercial). La fuente de los géneros del
artista queda para una decisión posterior.

#### Scenario: Artista con géneros en MusicBrainz

- **WHEN** se sincroniza la ficha de un artista que tiene géneros en MusicBrainz
- **THEN** la request no pide géneros ni etiquetas y el artista no guarda ninguno

### Requirement: Enlaces curados

El sistema SHALL guardar, a partir de las relaciones de URL de MusicBrainz, solo estos
enlaces del artista, en este orden fijo: sitio oficial, Bandcamp y una plataforma de
streaming (la primera disponible entre Spotify, Apple Music, Deezer y YouTube Music). El
enlace a Wikipedia SHALL derivarse del artículo en el idioma de lectura (capability
`artist-wikimedia-enrichment`). El sistema SHALL NOT guardar redes sociales, tiendas, bases
de datos ni el resto de las relaciones de URL.

#### Scenario: Artista con muchas relaciones de URL

- **WHEN** un artista tiene sitio oficial, Bandcamp, Spotify, Apple Music, cinco redes
  sociales y Discogs en MusicBrainz
- **THEN** se guardan sitio oficial, Bandcamp y Spotify, en ese orden

#### Scenario: Sin Spotify

- **WHEN** un artista tiene Apple Music y Deezer, pero no Spotify
- **THEN** el enlace de streaming guardado es Apple Music

### Requirement: Desambiguación con su nombre real

El texto de desambiguación de MusicBrainz SHALL guardarse como desambiguación del artista y
SHALL NOT presentarse como biografía. La búsqueda y las sugerencias SHALL seguir usándolo
para distinguir artistas homónimos.

#### Scenario: Homónimos en la búsqueda

- **WHEN** una búsqueda devuelve dos artistas llamados igual
- **THEN** cada resultado puede mostrar su desambiguación para distinguirlos

### Requirement: Actualización de la ficha

Cuando se lee un artista cuya ficha tiene más de 30 días, nunca se sincronizó o cuya alineación
nunca se sincronizó con períodos, el sistema SHALL programar su actualización en segundo plano y
SHALL responder con los datos guardados sin esperarla. La actualización SHALL renovar, en la
misma request a MusicBrainz, la ficha y la alineación (pertenencias con períodos y músicos de
apoyo, capability `artist-lineup`). A lo sumo una actualización por artista SHALL ejecutarse a
la vez. Un script de backfill SHALL sincronizar las fichas existentes en lote, con opciones de
límite y de simulación sin escritura.

#### Scenario: Primera visita

- **WHEN** alguien abre un artista cuya ficha nunca se sincronizó
- **THEN** la página responde con los datos existentes y la ficha se completa en segundo
  plano para las visitas siguientes

#### Scenario: Integrante nuevo

- **WHEN** alguien abre una banda sincronizada hace más de 30 días y MusicBrainz agregó a un
  integrante desde entonces
- **THEN** la actualización en segundo plano lo agrega a la alineación con la misma request que
  renueva la ficha

