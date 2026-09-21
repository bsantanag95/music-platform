# profile-identity Specification

## Purpose
Identidad extendida del perfil (bio, pronombres, ubicación, zona horaria, enlaces externos tipados, monograma) y su edición inline por el dueño. Fase 5, cambio redesign-user-profile.
## Requirements
### Requirement: Campos de identidad extendida

El sistema SHALL permitir que un usuario autenticado registre una bio (máximo 200
caracteres), pronombres (máximo 40), una ubicación en texto libre (máximo 80) y una zona
horaria. Todos los campos SHALL ser opcionales y SHALL poder vaciarse. El sistema SHALL
recortar espacios sobrantes y SHALL rechazar valores que excedan sus límites con un error
de validación localizado, sin modificar los datos.

#### Scenario: Guardar bio y pronombres

- **WHEN** el dueño guarda una bio de 120 caracteres y los pronombres "elle"
- **THEN** el perfil persiste ambos valores y los muestra en la identidad extendida en las
  tres vistas

#### Scenario: Vaciar un campo

- **WHEN** el dueño guarda una bio vacía sobre una bio existente
- **THEN** el perfil deja de mostrar la bio y no muestra un hueco

#### Scenario: Valor demasiado largo

- **WHEN** el dueño envía una bio de 201 caracteres
- **THEN** la API responde con un error de validación y la bio anterior no cambia

### Requirement: Enlaces externos del perfil

El sistema SHALL permitir hasta 5 enlaces externos por perfil, cada uno con un tipo de un
conjunto cerrado (Bandcamp, Last.fm, Discogs, Instagram, YouTube, SoundCloud, X, TikTok,
Spotify y Enlace) y un valor que el sistema valida y normaliza según su tipo, dando como
resultado una URL `http(s)` de máximo 400 caracteres. Los enlaces SHALL tener un orden explícito
definido por el dueño. El sistema SHALL rechazar un sexto enlace, un tipo fuera del conjunto o un
valor inválido para su tipo con un error de validación localizado.

#### Scenario: Añadir enlaces ordenados

- **WHEN** el dueño guarda un enlace genérico y uno de Bandcamp en ese orden
- **THEN** el perfil muestra ambos enlaces en ese orden en la identidad extendida

#### Scenario: Exceder el máximo

- **WHEN** el dueño intenta guardar un conjunto de 6 enlaces
- **THEN** la API responde con un error de validación y el conjunto de enlaces no cambia

#### Scenario: URL inválida

- **WHEN** el dueño envía un enlace con la URL "javascript:alert(1)"
- **THEN** la API rechaza el enlace con un error de validación

#### Scenario: Los enlaces son visibles en el perfil privado

- **WHEN** un visitante no autorizado abre un perfil privado con enlaces externos
- **THEN** ve los enlaces externos como parte de la identidad extendida

#### Scenario: Los enlaces de tipo sitio web anteriores pasan a Enlace

- **WHEN** se aplica este cambio sobre un perfil con enlaces del antiguo tipo "Sitio web"
- **THEN** esos enlaces pasan al tipo Enlace conservando su URL y su posición, y el tipo "Sitio web"
  deja de existir

### Requirement: Imagen de identidad por monograma

El sistema SHALL representar la identidad visual de cada usuario mediante un monograma
determinista derivado de su username, estable entre renders y sin almacenamiento. El
sistema SHALL NOT ofrecer en esta capacidad una superficie para subir una imagen de avatar.

#### Scenario: Monograma estable

- **WHEN** se renderiza el mismo usuario en el perfil, en la búsqueda y en un destacado
- **THEN** el monograma (letra y color) es idéntico en las tres superficies

### Requirement: Edición de identidad desde el perfil

El dueño SHALL poder editar bio, pronombres, ubicación, zona horaria, enlaces, la Tarjeta de
Identidad (artista, álbum e himno) y "Empieza por aquí" desde su propio perfil, sin salir de la
página, activando el modo edición (ver `profile-edit-mode`), y SHALL poder editar la misma
información desde el área de ajustes (ver `owner-settings`). Ambas vías SHALL usar los mismos
editores, y cada dato SHALL tener un único editor: el himno, el artista y el álbum definitorios
se editan solo en el editor de la Tarjeta de Identidad. Cada editor SHALL tener estados de
carga, éxito y error recuperable, y SHALL confirmar los cambios sin recargar toda la aplicación.
Los editores SHALL renderizarse únicamente en vistas del dueño: su perfil con el modo edición
activo y su área de ajustes.

#### Scenario: Editar bio inline

- **WHEN** el dueño activa el modo edición, abre el editor de la Placa desde su perfil, cambia
  el texto y confirma
- **THEN** el perfil refleja la nueva bio sin recargar la página

#### Scenario: Error recuperable al guardar

- **WHEN** una petición de guardado falla
- **THEN** el editor muestra un error localizado, conserva el texto introducido y permite
  reintentar

#### Scenario: Un visitante no ve los editores

- **WHEN** un visitante que no es el dueño abre el perfil
- **THEN** no ve ningún control de edición de identidad

#### Scenario: Un único editor para el himno

- **WHEN** el dueño quiere cambiar su himno
- **THEN** lo hace en el editor de la Tarjeta de Identidad; el editor de "Empieza por aquí" no
  ofrece elegirlo

### Requirement: Enlaces de red social por nombre de usuario

Para los tipos Instagram, X, TikTok, YouTube, SoundCloud, Bandcamp, Last.fm, Discogs y Spotify, el
valor SHALL ser el nombre de usuario de la persona en ese sitio (con o sin `@` inicial) y el
sistema SHALL construir y guardar la URL canónica del perfil (por ejemplo
`https://www.instagram.com/ana`). Cada sitio SHALL validar el usuario con sus propias reglas de
longitud y caracteres. Si el valor es un enlace de un host del sitio elegido (incluidos los alias
del sitio, como `twitter.com` para X), el sistema SHALL extraer el usuario del enlace en vez de
rechazarlo; los parámetros de consulta y el fragmento del enlace SHALL ignorarse. El sistema SHALL
rechazar el valor cuando sea un enlace de otro sitio, cuando no contenga un usuario (por ejemplo,
la portada del sitio o una publicación) o cuando el usuario no cumpla las reglas del sitio.

#### Scenario: Usuario con arroba

- **WHEN** el dueño elige Instagram y escribe "@ana"
- **THEN** el sistema guarda el enlace `https://www.instagram.com/ana`

#### Scenario: Enlace completo del sitio correcto

- **WHEN** el dueño elige Instagram y pega "https://instagram.com/ana?igsh=abc"
- **THEN** el sistema extrae el usuario "ana" y guarda `https://www.instagram.com/ana`

#### Scenario: Alias del sitio

- **WHEN** el dueño elige X y pega "https://twitter.com/ana"
- **THEN** el sistema guarda `https://x.com/ana`

#### Scenario: Enlace de otro sitio

- **WHEN** el dueño elige Instagram y pega "https://tiktok.com/@ana"
- **THEN** el sistema rechaza el valor con un error de validación que indica que no es un enlace de
  Instagram

#### Scenario: Portada sin usuario

- **WHEN** el dueño elige Instagram y escribe "instagram.com" o "https://instagram.com"
- **THEN** el sistema rechaza el valor con un error que indica que falta el usuario

#### Scenario: Usuario con punto no es un dominio

- **WHEN** el dueño elige Instagram y escribe "ana.perez"
- **THEN** el sistema lo trata como usuario y guarda `https://www.instagram.com/ana.perez`

#### Scenario: Bandcamp por subdominio

- **WHEN** el dueño elige Bandcamp y escribe "mibanda"
- **THEN** el sistema guarda `https://mibanda.bandcamp.com`

#### Scenario: YouTube sin handle

- **WHEN** el dueño elige YouTube y pega un enlace de canal con formato `/channel/…`
- **THEN** el sistema rechaza el valor con un error que pide su usuario con formato `@usuario`

#### Scenario: Usuario inválido para el sitio

- **WHEN** el dueño elige Instagram y escribe un usuario con espacios o caracteres no permitidos
- **THEN** el sistema rechaza el valor con un error de validación

### Requirement: Enlace con esquema implícito

Para el tipo Enlace (`other`), el valor SHALL aceptarse sin esquema: si no trae `http://` ni
`https://` el sistema SHALL anteponer `https://`; si trae `http://` explícito SHALL respetarlo. El
sistema SHALL rechazar un esquema distinto de `http` y `https` (como `javascript:`, `mailto:` o
`ftp:`), un valor sin dominio válido (sin un punto en el nombre de host) y un valor con espacios. El
sistema SHALL NOT ofrecer un tipo "Sitio web" separado: Enlace cubre cualquier dirección web.

#### Scenario: Sin esquema

- **WHEN** el dueño elige Enlace y escribe "www.link.com"
- **THEN** el sistema guarda `https://www.link.com` sin mostrar ningún error

#### Scenario: Dominio simple sin esquema

- **WHEN** el dueño elige Enlace y escribe "link.com/mi-pagina"
- **THEN** el sistema guarda `https://link.com/mi-pagina`

#### Scenario: Http explícito

- **WHEN** el dueño escribe "http://viejo.example"
- **THEN** el sistema guarda `http://viejo.example` sin cambiarlo a https

#### Scenario: Esquema no web

- **WHEN** el dueño escribe "javascript:alert(1)" o "mailto:ana@example.com"
- **THEN** el sistema rechaza el valor con un error de validación

#### Scenario: Sin dominio

- **WHEN** el dueño escribe "hola"
- **THEN** el sistema rechaza el valor con un error de validación

### Requirement: Enlaces guardados que no coinciden con su tipo

El sistema SHALL NOT modificar ni eliminar los enlaces ya guardados que no coincidan con su tipo
(por ejemplo, un enlace de tipo Instagram que apunta a la portada del sitio). El perfil SHALL seguir
mostrándolos, con un ícono genérico de enlace y el nombre del sitio como nombre accesible. El editor
SHALL mostrarlos con su URL guardada y un aviso; al guardar el conjunto, un enlace que siga sin
coincidir con su tipo SHALL bloquear el guardado con un error asociado a su fila, hasta que la
persona lo corrija o lo quite.

#### Scenario: Enlace preexistente se sigue mostrando

- **WHEN** un visitante abre el perfil de alguien con un enlace Instagram guardado que apunta a
  `http://instagram.com`
- **THEN** ve el enlace con un ícono genérico y el perfil no falla

#### Scenario: El editor pide corregirlo

- **WHEN** el dueño abre el editor con ese enlace y guarda sin modificarlo
- **THEN** el guardado se bloquea con un error en esa fila que pide escribir su usuario de Instagram

#### Scenario: Quitarlo resuelve el bloqueo

- **WHEN** el dueño quita esa fila y guarda
- **THEN** el conjunto se guarda con los demás enlaces

### Requirement: Enlaces como íconos en el perfil

El perfil SHALL mostrar cada enlace externo como el ícono de su sitio, sin el nombre como texto
visible. Cada ícono SHALL ser un enlace que abre en una pestaña nueva con `rel="noopener noreferrer
nofollow"`, con un nombre accesible que incluya el sitio y el usuario (por ejemplo "Instagram:
@ana") o el dominio (para Enlace), y con un tooltip equivalente. El ícono de Enlace SHALL ser una
cadena y el de cada red el de su marca. El ícono SHALL ocultarse a las tecnologías de asistencia para
que el nombre accesible sea el único anunciado.

#### Scenario: Ícono con nombre accesible

- **WHEN** el perfil de un usuario tiene un enlace de Instagram con usuario "ana"
- **THEN** muestra el ícono de Instagram como enlace con el nombre accesible "Instagram: @ana" y sin
  el texto "Instagram" visible

#### Scenario: Enlace muestra la cadena y el dominio

- **WHEN** un perfil tiene un enlace de tipo Enlace hacia `https://www.link.com/inicio`
- **THEN** muestra el ícono de cadena con el nombre accesible "Enlace: link.com" y un tooltip
  equivalente

#### Scenario: Ícono genérico para un enlace que no coincide

- **WHEN** el perfil tiene un enlace de un tipo por usuario cuya URL no coincide con el sitio
- **THEN** muestra el ícono genérico de enlace en lugar del de la marca

### Requirement: Validación en el editor de enlaces

El editor de enlaces SHALL validar cada fila con las mismas reglas que el servidor y mostrar el error
de la fila, localizado, junto al campo y asociado a él para tecnologías de asistencia. El campo de
valor NO SHALL usar la validación nativa de URL del navegador. Según el tipo, el editor SHALL mostrar
un prefijo del sitio y una vista previa del enlace que se guardará (tipos por usuario) o un ejemplo
de dominio (Enlace). Al cambiar el tipo de una fila se SHALL conservar el texto
escrito y revalidarlo.

#### Scenario: Error por fila

- **WHEN** el dueño escribe un valor inválido en una fila y pulsa guardar
- **THEN** la fila muestra su mensaje de error, no se envía la petición y las demás filas
  conservan lo escrito

#### Scenario: Sin validación nativa

- **WHEN** el dueño escribe "www.link.com" en una fila de Enlace y pulsa guardar
- **THEN** el navegador no muestra ningún aviso de URL inválida y el enlace se guarda

#### Scenario: Vista previa del enlace

- **WHEN** el dueño elige Instagram y escribe "@ana"
- **THEN** la fila muestra la vista previa `instagram.com/ana` antes de guardar

#### Scenario: Cambiar el tipo conserva el texto

- **WHEN** el dueño cambia una fila de Instagram a TikTok con "ana" escrito
- **THEN** el texto "ana" se conserva y la vista previa pasa a `tiktok.com/@ana`

