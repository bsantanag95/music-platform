# Modelo de dominio — music-platform

Este documento describe las entidades del negocio y cómo se relacionan entre sí, en lenguaje conceptual. La traducción a tablas y constraints concretos vive en `03-data/sql-model.md`.

## Usuario

La persona que usa la aplicación: se registra, valora, comenta, arma listas y sigue la actividad de otros usuarios.

Un Usuario puede tener una contraseña local o una o más identidades externas. La identidad del
producto no depende del proveedor con el que inició sesión.

## Identidad de autenticación

Una identidad de autenticación vincula un Usuario con un proveedor local o externo. Para
proveedores OAuth/OIDC se identifica mediante el proveedor y su identificador estable; en OIDC,
este corresponde al sub asociado al issuer. El email es un atributo de la identidad y no una
clave de vinculación suficiente.

Un Usuario puede vincular varias identidades externas y todas resuelven al mismo Usuario del
producto. La vinculación de una identidad externa con un Usuario existente es explícita y no se
realiza automáticamente por coincidencia de email.

## Artista

Puede ser una **persona** o un **grupo**. Una persona puede pertenecer a uno o más grupos a la vez, y puede tener también su propia carrera solista — ambas discografías conviven en el mismo perfil de artista sin tratarse como conceptos separados. Un grupo también es un Artista, con su propio perfil y discografía, compuesto por personas que fueron o son sus miembros a lo largo del tiempo.

Existe además un tipo especial de Artista, "Various Artists", usado para álbumes compilatorios donde no hay un único artista principal, aunque cada canción dentro sí lo tenga.

## Álbum (concepto) y Edición

Un **Álbum** es el concepto general que el usuario reconoce y valora (ej. "The Dark Side of the Moon"). Ese mismo álbum puede tener múltiples **Ediciones**: la versión original, una edición japonesa con bonus tracks, un remaster de aniversario, etc. La valoración y los comentarios pertenecen al Álbum como concepto, no a cada edición por separado — así no se fragmentan entre versiones. El listado de canciones concreto sí depende de qué Edición se esté mirando.

Un Álbum se clasifica en una de cuatro categorías: de estudio, single/EP, compilado, o en vivo/misceláneo.

## Canción (Grabación) y Pista

Una **Canción** (o Grabación) es la interpretación concreta que un usuario valora y comenta. Una misma Canción puede aparecer en muchas Ediciones distintas (el álbum original, un compilado, un bonus track de otro álbum) sin que eso fragmente su valoración: es un único registro con una única caja de comentarios, sin importar en cuántos discos aparezca.

La **Pista** es la posición concreta de una Canción dentro de una Edición particular (número de disco, número de posición) — es un dato de la Edición, no de la Canción en sí.

Una Canción puede ser una versión distinta de otra: una re-grabación, un remix, o una versión en vivo cuentan como una Canción nueva y separada. Un remaster de audio, en cambio, **no** genera una Canción nueva — sigue siendo la misma grabación, solo con distinto tratamiento de audio.

## Crédito

El **Crédito** conecta un Artista con un Álbum o con una Canción, y resuelve los distintos patrones de autoría de la industria:

- Artista único.
- Colaboración con billing menor ("feat.").
- Colaboración a la par (dúo, "Artista A & Artista B").
- Álbumes de Various Artists, donde cada Canción adentro tiene su propio crédito real aunque el Álbum en general no tenga un artista principal fijo.

## Valoración

Un Usuario puede valorar un Artista, un Álbum, o una Canción — nunca más de un objetivo a la vez, y solo una Valoración vigente por Usuario y por objetivo (una nueva valoración reemplaza a la anterior, no la duplica). La Valoración combina dos escalas que deben ser siempre coherentes entre sí: estrellas (de 0.5 a 5, en pasos de 0.5) y una "Valoración detallada" opcional (de 1 a 100).

## Comentario

Igual que la Valoración, un Comentario pertenece a exactamente un Artista, Álbum o Canción — pero, a diferencia de la Valoración, un mismo Usuario puede dejar más de un Comentario sobre el mismo objetivo.

## Perfil

Cada Usuario tiene un perfil cuya visibilidad es **pública** o **privada**. Un perfil público
expone su identidad y sus actividades con audiencia compatible; un perfil privado sigue siendo
descubrible por nombre, pero requiere aprobación para ser seguido y sus actividades son privadas por
defecto. La visibilidad de cada actividad puede sobrescribir la del perfil.

## Seguimiento

El seguimiento es **unilateral**, tipo "seguir": un Usuario sigue a otro sin exigir reciprocidad.
La relación pertenece a la pareja (seguidor, seguido) y puede estar **aceptada** o **pendiente**:

- Seguir un perfil público crea una relación aceptada de inmediato.
- Seguir un perfil privado crea una solicitud pendiente que el propietario puede aprobar o
  rechazar; el solicitante puede cancelarla.
- Dejar de seguir elimina la relación; el propietario puede eliminar a un seguidor propio.

## Bloqueo

Un Usuario puede **bloquear** a otro. El bloqueo impide nuevas relaciones de seguimiento en ambas
direcciones, elimina las relaciones y solicitudes existentes entre ambos y restringe las acciones
sociales entre las cuentas. Bloquear no es lo mismo que dejar de seguir: es una restricción
bidireccional con su propia persistencia.

## Entidades sociales (a definir en detalle en `05-features/`, cuando se llegue a su entrega)

- **Diario de escucha**: registro histórico de escuchas sobre Artista, Álbum o Canción.
- **Lista**: colección curada armada por un Usuario, de **un solo tipo de entidad** (solo
  Álbumes, solo Canciones o solo Artistas), con orden manual y audiencia propia. En la primera
  versión cada lista es propiedad de un único usuario (no colaborativa).
- **Favorito**: marca simple de un Usuario sobre un Artista, Álbum o Canción. Es un toggle
  idempotente (un usuario tiene a lo sumo un favorito por objetivo), con audiencia propia e
  independiente de escucha, valoración y comentario.
- **Colección física**: declaración de un Usuario de que posee una copia física de un Álbum,
  con un formato (`vinyl`/`cd`/`cassette`/`other`), cero o más atributos de edición de un
  vocabulario cerrado, una nota libre opcional y audiencia propia. A diferencia del Favorito,
  **no es un toggle**: un Usuario puede tener varias entradas para el mismo Álbum (distintos
  formatos, o copias distinguibles del mismo formato). Formato y atributos son dato del
  Usuario — el catálogo no modela soporte físico.
- **Actividad**: registro de lo que un Usuario fue valorando/comentando recientemente, visible para
  quienes lo siguen — la función inspirada en el "qué estás escuchando" de MSN.
