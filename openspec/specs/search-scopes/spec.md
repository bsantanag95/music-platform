# search-scopes Specification

## Purpose

Búsqueda del catálogo por tipo (Artistas, Álbumes, Canciones y Usuarios) con el tipo dentro del propio campo, al estilo de Metal Archives: tipo por defecto, contrato de URL `?type=`, cambio de tipo sin reescribir, redirección por coincidencia exacta única, mejor coincidencia ante homónimos, filtro Persona/Grupo y usuarios en el buscador global.

## Requirements
### Requirement: Selector de tipo dentro del campo de búsqueda

El buscador (Header y `/search`) SHALL presentar el tipo de búsqueda como parte del propio
campo: un control a la izquierda del texto que muestra el ícono y el nombre del tipo activo y
permite elegir entre **Artistas**, **Álbumes**, **Canciones** y **Usuarios**. El placeholder del
campo SHALL reflejar el tipo activo. En viewport móvil el control SHALL poder reducirse al ícono
sin perder su nombre accesible. Ningún otro tipo (géneros, sellos, músicos) SHALL ofrecerse en
esta versión.

#### Scenario: Elegir el tipo antes de escribir
- **WHEN** una persona abre el selector del campo y elige **Álbumes**
- **THEN** el control muestra "Álbumes", el placeholder invita a buscar álbumes y el envío
  busca en ese tipo

#### Scenario: Tipos ofrecidos
- **WHEN** una persona abre el selector de tipo
- **THEN** ve exactamente Artistas, Álbumes, Canciones y Usuarios

#### Scenario: Selector anunciable
- **WHEN** una persona con lector de pantalla llega al selector
- **THEN** el control anuncia su función, el tipo activo y la lista de opciones al abrirse

### Requirement: Tipo por defecto

Cuando no hay un tipo explícito, el buscador SHALL usar **Artistas**. El sistema SHALL NOT
recordar el último tipo usado entre visitas o navegaciones: cada campo del Header arranca en
Artistas. Dentro de `/search`, el campo SHALL arrancar con el tipo de la URL, de modo que
refinar una búsqueda conserva el tipo elegido.

#### Scenario: Header recién cargado
- **WHEN** una persona que antes buscó en Álbumes navega a otra página y usa el Header
- **THEN** el selector del Header muestra Artistas

#### Scenario: Refinar dentro de resultados
- **WHEN** una persona está en `/search?type=album&q=destroyer` y reescribe la consulta en el
  campo de la página
- **THEN** la nueva búsqueda se envía con `type=album`

### Requirement: Contrato de URL por tipo

`/search` SHALL leer `type` (`artist` | `album` | `song` | `user`) y `q`. Un `type` ausente o
desconocido SHALL tratarse como `artist`. Los valores heredados de las pestañas anteriores
SHALL mapearse: `artists` y `all` → `artist`, `albums` → `album`. La página SHALL ejecutar
únicamente la búsqueda del tipo indicado.

#### Scenario: Tipo explícito
- **WHEN** una persona abre `/search?type=song&q=taste`
- **THEN** la página ejecuta solo la búsqueda de canciones para `taste`

#### Scenario: Enlace antiguo
- **WHEN** una persona abre `/search?q=poison&type=albums`
- **THEN** la página busca álbumes para `poison`

#### Scenario: Sin tipo
- **WHEN** una persona abre `/search?q=radiohead`
- **THEN** la página busca artistas para `radiohead`

### Requirement: Cambiar de tipo sin reescribir

La página de resultados SHALL ofrecer, junto al resumen de la búsqueda, accesos para repetir la
misma consulta en cada uno de los otros tipos. Elegir uno SHALL navegar a
`/search?type=<otro>&q=<misma consulta>` sin que la persona reescriba el texto. Cuando un tipo
no tiene resultados, el estado vacío SHALL incluir esos mismos accesos.

#### Scenario: Tipo equivocado
- **WHEN** una persona busca `back for the attack` en Artistas y no hay coincidencias útiles
- **THEN** el estado vacío ofrece "Buscar en Álbumes" y un clic navega a
  `/search?type=album&q=back%20for%20the%20attack`

### Requirement: Redirección por coincidencia exacta única

En el tipo Artistas, si entre las coincidencias locales y de MusicBrainz existe **exactamente
un** artista cuyo nombre normalizado (sin distinguir mayúsculas, acentos ni espacios extra) es
igual a la consulta normalizada, `/search` SHALL redirigir a `/artist/<id>` de ese artista,
agregando `from=search` y la consulta. El perfil SHALL mostrar entonces un aviso discreto
"¿No era este?" que enlaza a `/search?type=artist&q=<consulta>&all=1`; con `all=1` la página
SHALL listar los resultados sin redirigir. Si la pata de MusicBrainz falló, la unicidad no es
verificable y la página SHALL NOT redirigir. Con dos o más coincidencias exactas SHALL NOT
redirigir.

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

### Requirement: Mejor coincidencia con homónimos

Cuando dos o más artistas coinciden exactamente con la consulta, la página SHALL destacar uno
como "Mejor coincidencia" (el primero según el orden del tipo) en una tarjeta propia y SHALL
listar debajo, bajo un encabezado del tipo "Otros artistas llamados «<consulta>»", el resto de
homónimos con su tipo, desambiguación y país cuando se conozcan. Las coincidencias no exactas
SHALL aparecer después.

#### Scenario: KISS
- **WHEN** una persona busca `KISS` en Artistas
- **THEN** ve una tarjeta con la banda de rock estadounidense como mejor coincidencia, luego los
  otros dos KISS con su desambiguación, y después artistas como "Kiss Kiss"

### Requirement: Filtro Persona o Grupo en Artistas

La página de resultados de Artistas SHALL ofrecer un filtro **Todos / Persona / Grupo** reflejado
en la URL (`artistType=person|group`). El filtro SHALL aplicarse tanto a las coincidencias locales
como a la consulta a MusicBrainz. Los artistas de tipo `unknown` SHALL aparecer solo con
**Todos**.

#### Scenario: Buscar músicos
- **WHEN** una persona busca `dokken` en Artistas con el filtro Persona
- **THEN** ve personas como Don Dokken y no la banda Dokken

### Requirement: Tipo Usuarios en el buscador global

El tipo **Usuarios** SHALL buscar perfiles por username o nombre visible con las mismas reglas de
privacidad, exclusión de cuentas inactivas, acciones sociales y paginación que la búsqueda de
`/users`, y SHALL NOT consultar MusicBrainz. Si la consulta coincide exactamente (sin distinguir
mayúsculas) con un username, `/search` SHALL redirigir a `/users/<username>`, salvo con `all=1`.

#### Scenario: Username exacto
- **WHEN** una persona busca `fran` en Usuarios y existe el usuario `fran`
- **THEN** la aplicación abre `/users/fran`

#### Scenario: Nombre parcial
- **WHEN** una persona busca `ana` en Usuarios y ningún username es exactamente `ana`
- **THEN** ve la lista de perfiles coincidentes con su acción social y "Cargar más" si hay más
  páginas

