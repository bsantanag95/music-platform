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
conjunto cerrado (sitio web, Bandcamp, Last.fm, Discogs, Instagram, YouTube, SoundCloud,
otro) y una URL válida `http(s)` de máximo 400 caracteres. Los enlaces SHALL tener un orden
explícito definido por el dueño. El sistema SHALL rechazar un sexto enlace, un tipo fuera
del conjunto o una URL inválida con un error de validación localizado.

#### Scenario: Añadir enlaces ordenados

- **WHEN** el dueño guarda un enlace de sitio web y uno de Bandcamp en ese orden
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

### Requirement: Imagen de identidad por monograma

El sistema SHALL representar la identidad visual de cada usuario mediante un monograma
determinista derivado de su username, estable entre renders y sin almacenamiento. El
sistema SHALL NOT ofrecer en esta capacidad una superficie para subir una imagen de avatar.

#### Scenario: Monograma estable

- **WHEN** se renderiza el mismo usuario en el perfil, en la búsqueda y en un destacado
- **THEN** el monograma (letra y color) es idéntico en las tres superficies

### Requirement: Edición de identidad desde el perfil

El dueño SHALL poder editar bio, pronombres, ubicación, zona horaria, enlaces, destacados e
himno desde su propio perfil, sin navegar a una superficie de configuración separada. Cada
editor SHALL tener estados de carga, éxito y error recuperable, y SHALL confirmar los
cambios sin recargar toda la aplicación. Los editores SHALL renderizarse únicamente en la
vista del dueño.

#### Scenario: Editar bio inline

- **WHEN** el dueño abre el editor de bio desde su perfil, cambia el texto y confirma
- **THEN** el perfil refleja la nueva bio sin recargar la página

#### Scenario: Error recuperable al guardar

- **WHEN** una petición de guardado falla
- **THEN** el editor muestra un error localizado, conserva el texto introducido y permite
  reintentar

#### Scenario: Un visitante no ve los editores

- **WHEN** un visitante que no es el dueño abre el perfil
- **THEN** no ve ningún control de edición de identidad

