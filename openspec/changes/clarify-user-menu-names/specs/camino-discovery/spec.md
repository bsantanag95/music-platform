## ADDED Requirements

### Requirement: Acceso desde Listas, no desde la barra general
El descubrimiento público `/caminos` SHALL titularse "Listas para completar" ("Lists to complete"
en inglés) y SHALL alcanzarse desde la superficie pública de listas (`/lists`), no desde la barra
general del Header. La vitrina de `/lists` (sin filtros) SHALL incluir una sección "Para completar"
con hasta 8 de las listas que muestra `/caminos`, en el mismo orden (conteo de trackeo activo) y con
el mismo tratamiento de vitrina (conteo sin posición ni insignia de "top"), y un enlace "Ver todas"
hacia `/caminos`. Cuando no hay ninguna lista con trackeo activo, la sección SHALL NOT renderizarse.
La ruta `/caminos`, sus filtros y su endpoint SHALL NOT cambiar.

#### Scenario: Sin enlace en la barra general
- **WHEN** se renderiza el Header, con o sin sesión
- **THEN** la barra general no muestra un enlace a `/caminos`

#### Scenario: Sección en la vitrina de Listas
- **WHEN** una persona abre `/lists` sin filtros y hay listas públicas con trackeo activo
- **THEN** ve la sección "Para completar" con esas listas, cada una con su conteo de personas
  siguiendo su progreso, y un enlace "Ver todas" que lleva a `/caminos`

#### Scenario: Sección ausente sin trackeo
- **WHEN** ninguna lista pública tiene trackeo activo
- **THEN** la vitrina de `/lists` no muestra la sección "Para completar"

#### Scenario: Título de la página de descubrimiento
- **WHEN** una persona abre `/caminos`
- **THEN** el título de la página dice "Listas para completar" y no "Caminos populares"
