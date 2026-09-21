# account-lifecycle Specification

## Purpose
TBD - created by archiving change rework-account-settings. Update Purpose after archive.
## Requirements
### Requirement: Desactivar la cuenta

El sistema SHALL permitir a un usuario autenticado desactivar su cuenta con el factor de
"Autenticación reciente para acciones sensibles". Desactivar SHALL registrar la fecha, cerrar todas
las sesiones de la persona (incluida la actual) y limpiar la cookie de sesión. Desactivar SHALL NOT
borrar ningún contenido, seguimiento, valoración, reseña, comentario, lista ni entrada de la
persona. Una cuenta desactivada SHALL NOT tener sesiones vigentes ni poder crearlas sin reactivarse.

#### Scenario: Desactivar con contraseña

- **WHEN** la persona confirma "Desactivar mi cuenta" con su contraseña correcta
- **THEN** la cuenta queda desactivada, todas sus sesiones se cierran y es dirigida al inicio de
  sesión

#### Scenario: Contraseña incorrecta

- **WHEN** la persona envía una contraseña incorrecta
- **THEN** la API responde `INVALID_CREDENTIALS` y la cuenta sigue activa

#### Scenario: El contenido se conserva

- **WHEN** una cuenta con diario, listas, colección y reseñas se desactiva
- **THEN** ese contenido sigue existiendo en la base de datos, sin cambios

### Requirement: Reactivar al iniciar sesión

Iniciar sesión con contraseña o con Google en una cuenta desactivada SHALL reactivarla: el sistema
SHALL borrar la marca de desactivación y crear la sesión con normalidad. Restablecer la contraseña de
una cuenta desactivada SHALL funcionar y la cuenta se reactiva al iniciar sesión. Al reactivarse, el
perfil, los seguimientos y el contenido SHALL volver a aparecer tal como estaban.

#### Scenario: Volver iniciando sesión

- **WHEN** la persona de una cuenta desactivada inicia sesión con su contraseña
- **THEN** la cuenta queda activa, la sesión se crea y su perfil vuelve a verse

#### Scenario: Volver con Google

- **WHEN** una cuenta desactivada inicia sesión con Google
- **THEN** la cuenta queda activa y la sesión se crea

#### Scenario: Los seguimientos reaparecen

- **WHEN** una cuenta desactivada se reactiva
- **THEN** sus seguidores y las personas que sigue vuelven a contarse en los listados y contadores

### Requirement: Una cuenta desactivada no aparece en superficies sociales

Mientras una cuenta esté desactivada, el sistema SHALL tratarla como inexistente para otras personas
en estas superficies: su página de perfil y las páginas bajo `/users/{username}`, la búsqueda de
usuarios, los listados y contadores de seguidores, seguidos y seguidores en común, las solicitudes de
seguimiento pendientes de o hacia ella, la vista rápida del perfil, el feed, la actividad de la
comunidad y Home, y sus listas en el descubrimiento, las guardadas y las de la comunidad. No SHALL
poder ser seguida ni bloqueada. La API SHALL responder como usuario inexistente. El personal de
moderación SHALL seguir viendo su identidad real en las consultas de moderación.

#### Scenario: Perfil de una cuenta desactivada

- **WHEN** alguien abre `/users/{username}` de una cuenta desactivada
- **THEN** ve la página de usuario no encontrado

#### Scenario: Búsqueda

- **WHEN** alguien busca el usuario de una cuenta desactivada
- **THEN** no aparece en los resultados

#### Scenario: Contadores

- **WHEN** una cuenta desactivada seguía a otra
- **THEN** esa cuenta deja de contarla entre sus seguidores mientras dure la desactivación

#### Scenario: Feed

- **WHEN** una persona sigue a una cuenta que se desactiva
- **THEN** los eventos de esa cuenta dejan de aparecer en su feed

#### Scenario: Listas

- **WHEN** una persona tenía guardada una lista de una cuenta desactivada
- **THEN** la lista no aparece entre sus listas guardadas mientras dure la desactivación

#### Scenario: Seguir a una cuenta desactivada

- **WHEN** un cliente intenta seguir a una cuenta desactivada
- **THEN** la API responde como usuario inexistente y no crea el seguimiento

#### Scenario: Moderación

- **WHEN** una persona con permisos de moderación abre la cola de un reporte contra una cuenta
  desactivada
- **THEN** ve su identidad real

### Requirement: Reseñas y comentarios de una cuenta desactivada

Las reseñas y los comentarios ya publicados por una cuenta desactivada SHALL seguir visibles en las
páginas de catálogo, con la autoría mostrada como «Cuenta desactivada», sin enlace al perfil, sin
vista rápida y sin monograma ni nombre reales. Las valoraciones de la persona SHALL seguir contando
en los agregados del catálogo. Al reactivarse, la autoría real SHALL volver a mostrarse.

#### Scenario: Reseña conservada

- **WHEN** alguien abre un álbum con una reseña de una cuenta desactivada
- **THEN** la reseña se ve con la autoría «Cuenta desactivada» y sin enlace

#### Scenario: Valoraciones agregadas

- **WHEN** una cuenta desactivada había valorado un álbum
- **THEN** el promedio y el conteo del álbum no cambian

#### Scenario: Reactivación

- **WHEN** la cuenta se reactiva
- **THEN** sus reseñas y comentarios vuelven a mostrar su nombre y enlace al perfil

### Requirement: Eliminar la cuenta

El sistema SHALL permitir a un usuario autenticado eliminar su cuenta de forma definitiva. La
petición SHALL incluir el usuario de la cuenta como confirmación y el factor de "Autenticación
reciente para acciones sensibles". Eliminar SHALL borrar el perfil y todo lo que la persona creó
(diario, favoritos, por escuchar, listas, colección, deseos, valoraciones, reseñas, comentarios,
seguimientos, bloqueos, enlaces, preguntas, sesiones e identidades), cerrar la sesión y limpiar la
cookie. No SHALL existir período de gracia ni forma de deshacerlo. El sistema SHALL rechazar la
eliminación, sin borrar nada, cuando el usuario de confirmación no coincida o cuando la cuenta tenga
historial de moderación o editorial que impide borrarla (`ACCOUNT_DELETION_BLOCKED`, 409); en ese caso
la interfaz SHALL ofrecer desactivarla. La interfaz SHALL explicar qué se borra y ofrecer Desactivar
como alternativa antes de confirmar.

#### Scenario: Eliminar con confirmación

- **WHEN** la persona escribe su usuario y su contraseña correcta y confirma
- **THEN** su cuenta y todo lo que creó se borran, la cookie de sesión se limpia y es dirigida al
  inicio

#### Scenario: Usuario de confirmación incorrecto

- **WHEN** el usuario escrito no coincide con el de la cuenta
- **THEN** la API rechaza la petición con un error de validación y no borra nada

#### Scenario: Cuenta con historial de moderación

- **WHEN** una cuenta con acciones de moderación registradas intenta eliminarse
- **THEN** la API responde `ACCOUNT_DELETION_BLOCKED`, no borra nada y la interfaz ofrece desactivar

#### Scenario: Sin filas huérfanas

- **WHEN** se elimina una cuenta con contenido en todas las tablas que la referencian
- **THEN** no queda ninguna fila de esa persona en la base de datos

#### Scenario: Alternativa visible

- **WHEN** la persona abre el diálogo de eliminar
- **THEN** ve la lista de lo que se borra y un enlace a "Desactivar la cuenta"

### Requirement: Exportar los datos propios

El sistema SHALL permitir a un usuario autenticado descargar un archivo JSON con sus datos:
perfil y preferencias, enlaces, destacados y preguntas, diario (incluidas las notas privadas),
valoraciones, reseñas, comentarios, favoritos, por escuchar, listas con sus ítems, colección y
deseos, artistas seguidos, y los usuarios de sus seguidores, seguidos y bloqueados. La respuesta
SHALL ser inmediata (`Content-Disposition: attachment`) y SHALL NOT incluir hashes de contraseña,
tokens, sesiones ni datos privados de otras personas. El sistema SHALL limitar la frecuencia a una
exportación por minuto por usuario (`RATE_LIMITED`).

#### Scenario: Descargar la exportación

- **WHEN** la persona pide exportar sus datos
- **THEN** recibe un archivo JSON con sus datos propios, incluidas las notas privadas del diario

#### Scenario: Sin secretos ni datos ajenos

- **WHEN** se inspecciona el archivo exportado
- **THEN** no contiene hash de contraseña, tokens, sesiones ni contenido privado de otras personas

#### Scenario: Frecuencia limitada

- **WHEN** la persona pide otra exportación pocos segundos después
- **THEN** la API responde `RATE_LIMITED` y no genera el archivo

