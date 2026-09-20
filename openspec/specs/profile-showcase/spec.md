# profile-showcase Specification

## Purpose
Cuatro destacados fijables (artista/álbum/canción, tipos mezclados, nota opcional) e himno elegido manualmente. Fase 5, cambio redesign-user-profile.
## Requirements
### Requirement: Cuatro destacados

El sistema SHALL permitir que un usuario fije hasta 4 entidades del catálogo como
destacados de su perfil. Cada destacado SHALL apuntar a exactamente una entidad —artista,
álbum (release group) o canción (recording)— y los tipos SHALL poder mezclarse. Cada
destacado SHALL admitir una nota opcional de máximo 120 caracteres. Los destacados SHALL
tener un orden explícito definido por el dueño. El sistema SHALL rechazar un quinto
destacado o una nota demasiado larga con un error de validación localizado.

#### Scenario: Fijar destacados de tipos mezclados

- **WHEN** el dueño fija un artista, dos álbumes y una canción con ese orden
- **THEN** el perfil muestra los cuatro destacados en ese orden en las vistas autorizada y
  de dueño

#### Scenario: Exceder el máximo

- **WHEN** el dueño intenta fijar un quinto destacado
- **THEN** la API responde con un error de validación y el conjunto de destacados no cambia

#### Scenario: Nota por destacado

- **WHEN** el dueño añade la nota "mi puerta de entrada al jazz" a un álbum destacado
- **THEN** el perfil muestra esa nota junto al álbum

#### Scenario: Entidad destacada eliminada del catálogo

- **WHEN** una entidad fijada como destacado deja de existir en el catálogo
- **THEN** el perfil omite ese destacado y muestra el resto sin hueco

#### Scenario: Los destacados no aparecen en el perfil privado sin autorización

- **WHEN** un visitante no autorizado abre un perfil privado con destacados
- **THEN** no ve la sección de destacados

### Requirement: Himno del usuario

El sistema SHALL permitir que un usuario elija manualmente una canción (recording) del
catálogo como su himno. El himno SHALL ser opcional y SHALL poder quitarse. El sistema
SHALL NOT derivar el himno automáticamente de la última escucha ni de ninguna otra
actividad.

#### Scenario: Elegir un himno

- **WHEN** el dueño elige una canción como himno
- **THEN** el perfil muestra esa canción como himno en las vistas autorizada y de dueño

#### Scenario: Quitar el himno

- **WHEN** el dueño quita su himno
- **THEN** el perfil deja de mostrar la sección de himno

#### Scenario: El himno es independiente de la última escucha

- **WHEN** el dueño registra una escucha de una canción distinta a su himno
- **THEN** el himno del perfil no cambia

### Requirement: Marcar un artista o álbum como definitorio

El sistema SHALL permitir al dueño marcar **a lo sumo uno** de tipo artista y **a lo sumo
uno** de tipo álbum (release group) como "lo que me define". El marcador SHALL ser exclusivo
por tipo: marcar una entidad distinta del mismo tipo como definitoria SHALL quitar el
marcador de la anterior. El marcador es una referencia directa a la entidad — el sistema NO
SHALL requerir que sea además un destacado general o un álbum favorito para poder marcarla, ni
SHALL alterar su condición de destacado general o de álbum favorito al marcarla o
desmarcarla. El artista definitorio, el álbum definitorio y el himno del usuario (ver "Himno
del usuario") SHALL componer juntos, cuando existan, la **Tarjeta de Identidad** del perfil,
con tratamiento visual propio y distinto del resto de los destacados y de los álbumes
favoritos. Un destacado o álbum favorito sin marcar SHALL seguir formando parte de su muro
general, sin aparecer en la Tarjeta de Identidad.

#### Scenario: Marcar un destacado de tipo artista como definitorio

- **WHEN** el dueño marca uno de sus destacados de tipo artista como "me define"
- **THEN** ese artista aparece en la Tarjeta de Identidad del perfil, junto al himno y al
  álbum definitorio si existen

#### Scenario: Marcar un álbum favorito como definitorio sin duplicarlo

- **WHEN** el dueño marca como "me define" un álbum que solo tiene fijado como álbum
  favorito, sin agregarlo también a sus destacados generales
- **THEN** ese álbum aparece en la Tarjeta de Identidad del perfil, y sigue apareciendo una
  sola vez (en Álbumes favoritos) fuera de ella — no hace falta agregarlo dos veces

#### Scenario: Marcar un segundo destacado del mismo tipo

- **WHEN** el dueño ya tiene un álbum marcado como definitorio y marca otro álbum distinto
  (destacado o favorito) como definitorio
- **THEN** el marcador pasa al nuevo álbum; el anterior deja de aparecer en la Tarjeta de
  Identidad pero sigue siendo un destacado general o un álbum favorito, según corresponda

#### Scenario: Tarjeta de Identidad incompleta

- **WHEN** el dueño tiene himno pero no marcó ningún destacado de tipo artista ni de álbum
  como definitorio
- **THEN** la Tarjeta de Identidad muestra solo el himno, sin huecos por los elementos
  ausentes

#### Scenario: Ningún elemento de identidad

- **WHEN** el dueño no tiene himno ni ningún destacado marcado como definitorio
- **THEN** la Tarjeta de Identidad no se renderiza

### Requirement: Carátula del himno

El himno SHALL mostrar la carátula real de la canción cuando el catálogo la tenga
disponible, con la misma resolución de carátulas que el resto del catálogo (ver
`cover-art-resolution`), y SHALL mostrar la silueta de disco del sistema únicamente cuando
no exista carátula disponible.

#### Scenario: Himno con carátula disponible

- **WHEN** la canción elegida como himno tiene una carátula disponible en el catálogo
- **THEN** el perfil muestra esa carátula junto al himno, no un disco genérico

#### Scenario: Himno sin carátula disponible

- **WHEN** la canción elegida como himno no tiene carátula disponible
- **THEN** el perfil muestra la silueta de disco del sistema
