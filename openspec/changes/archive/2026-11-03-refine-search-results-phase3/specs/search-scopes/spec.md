## MODIFIED Requirements

### Requirement: Mejor coincidencia con homónimos

Cuando dos o más artistas coinciden exactamente con la consulta, la página SHALL destacar uno
como "Mejor coincidencia" (el primero según el orden del tipo) en una tarjeta propia y SHALL
listar debajo, bajo un encabezado del tipo "Otros artistas llamados «<consulta>»", el resto de
homónimos con su tipo, desambiguación y país (por su nombre en el idioma de la interfaz) cuando se conozcan. Cada fila
de artista SHALL mostrar además, cuando se conozcan, la foto del artista (de Wikimedia Commons, salvo retirada), sus años
de actividad o de vida ("1973–1996", "desde 1973") y, si su discografía ya se exploró en la plataforma, cuántos discos
principales tiene en el catálogo. La tarjeta de "Mejor coincidencia" SHALL sumar hasta tres géneros del artista. Las coincidencias no exactas
SHALL aparecer después.

#### Scenario: KISS
- **WHEN** una persona busca `KISS` en Artistas
- **THEN** ve una tarjeta con la banda de rock estadounidense como mejor coincidencia, luego los
  otros dos KISS con su desambiguación, y después artistas como "Kiss Kiss"

#### Scenario: Elegir entre homónimos
- **WHEN** una persona busca `kiss` en Artistas
- **THEN** la mejor coincidencia muestra la foto, "Grupo · Estados Unidos · desde 1973 · N discos · US rock band" y sus
  géneros, y los homónimos muestran el país por su nombre ("Corea del Sur")

### Requirement: Tipo Usuarios en el buscador global

El tipo **Usuarios** SHALL buscar perfiles por username o nombre visible con las mismas reglas de
privacidad, exclusión de cuentas inactivas, acciones sociales y paginación que la búsqueda de
`/users`, y SHALL NOT consultar MusicBrainz. Si la consulta coincide exactamente (sin distinguir
mayúsculas) con un username, `/search` SHALL redirigir a `/users/<username>`, salvo con `all=1`. Cada fila
SHALL mostrar, bajo el @usuario, los seguidores (solo de perfiles públicos; un perfil privado dice "Perfil privado") y,
con sesión, cuántas de las personas que sigue quien busca siguen a ese usuario ("2 en común"; la cifra, nunca quiénes).
Sin sesión, la lista SHALL mostrar un único aviso "Inicia sesión para seguir a quien encuentres" en lugar de un botón por
fila.

#### Scenario: Username exacto
- **WHEN** una persona busca `fran` en Usuarios y existe el usuario `fran`
- **THEN** la aplicación abre `/users/fran`

#### Scenario: Nombre parcial
- **WHEN** una persona busca `ana` en Usuarios y ningún username es exactamente `ana`
- **THEN** ve la lista de perfiles coincidentes con su acción social y "Cargar más" si hay más
  páginas

#### Scenario: Usuarios sin sesión
- **WHEN** una persona sin sesión busca `ana` en Usuarios
- **THEN** ve un único aviso para iniciar sesión, ninguna fila con botón para seguir y los seguidores de los perfiles
  públicos
