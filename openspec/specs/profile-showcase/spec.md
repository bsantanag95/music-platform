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

