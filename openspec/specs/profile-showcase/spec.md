# profile-showcase Specification

## Purpose
Sección "Empieza por aquí" (antes "Destacados"): hasta 4 recomendaciones fijables (artista/álbum/canción, tipos mezclados, orden manual, nota opcional a la vista), más la Tarjeta de Identidad (artista definitorio, álbum definitorio e himno), que se elige solo desde su propio editor. Fase 5, cambio redesign-user-profile; reformulado en simplify-profile-curation.
## Requirements
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

### Requirement: Sección "Empieza por aquí"

El sistema SHALL permitir que un usuario fije hasta 4 entidades del catálogo en la sección
**"Empieza por aquí"** de su perfil: recomendaciones dirigidas a quien lo visita, distintas de
sus favoritos y de su Tarjeta de Identidad. Cada ítem SHALL apuntar a exactamente una entidad
—artista, álbum (release group) o canción (recording)— y los tipos SHALL poder mezclarse. Cada
ítem SHALL admitir una nota opcional de máximo 120 caracteres; cuando la tenga, la sección SHALL
mostrarla junto al ítem, completa y sin recortar. Los ítems SHALL tener un orden explícito
definido por el dueño. La sección SHALL NOT excluir un ítem por coincidir con el artista o el
álbum de la Tarjeta de Identidad. El sistema SHALL rechazar un quinto ítem o una nota demasiado
larga con un error de validación localizado. La sección SHALL NOT renderizarse cuando el dueño
no tiene ningún ítem.

#### Scenario: Fijar destacados de tipos mezclados

- **WHEN** el dueño fija un artista, dos álbumes y una canción con ese orden
- **THEN** el perfil muestra los cuatro en ese orden en "Empieza por aquí", en las vistas
  autorizada y de dueño

#### Scenario: Exceder el máximo

- **WHEN** el dueño intenta fijar un quinto ítem
- **THEN** la API responde con un error de validación y el conjunto de ítems no cambia

#### Scenario: Nota por destacado

- **WHEN** el dueño añade la nota "mi puerta de entrada al jazz" a un álbum de la sección
- **THEN** el perfil muestra esa nota completa junto al álbum

#### Scenario: Ítem sin nota

- **WHEN** el dueño fija un ítem sin escribir nota
- **THEN** el perfil lo muestra con su carátula, título y artista, sin línea de nota ni marcador
  de que falta

#### Scenario: Coincidencia con la Tarjeta de Identidad

- **WHEN** el dueño fija en "Empieza por aquí" el mismo álbum que definió en su Tarjeta de
  Identidad
- **THEN** el perfil muestra el álbum en ambos lugares y no lo oculta de ninguno

#### Scenario: Entidad destacada eliminada del catálogo

- **WHEN** una entidad fijada deja de existir en el catálogo
- **THEN** el perfil omite ese ítem y muestra el resto sin hueco

#### Scenario: Los destacados no aparecen en el perfil privado sin autorización

- **WHEN** un visitante no autorizado abre un perfil privado con ítems en "Empieza por aquí"
- **THEN** no ve la sección

### Requirement: Tarjeta de Identidad del perfil

La Tarjeta de Identidad del perfil SHALL componerse, cuando existan, del **artista
definitorio**, el **álbum definitorio** y el **himno** del dueño, elegidos siempre a mano y
nunca derivados de actividad. Cada uno SHALL ser una referencia directa a una entidad del
catálogo: el sistema NO SHALL requerir que sea además un ítem de "Empieza por aquí" o un
favorito, ni SHALL alterar esas condiciones al elegirla o quitarla. Elegir otro artista (u
otro álbum) SHALL reemplazar al anterior: a lo sumo uno por tipo. El artista, el álbum y el
himno SHALL editarse únicamente desde el editor de la Tarjeta de Identidad; ningún otro editor
(como "Empieza por aquí") SHALL ofrecer marcarlos ni elegirlos. La Tarjeta SHALL tener
tratamiento visual propio, SHALL componerse con lo que exista sin huecos por lo ausente y NO
SHALL renderizarse cuando el dueño no tiene ninguno de los tres.

#### Scenario: Elegir el artista definitorio

- **WHEN** el dueño elige un artista en el editor de la Tarjeta de Identidad
- **THEN** ese artista aparece en la Tarjeta, junto al himno y al álbum definitorio si existen

#### Scenario: Elegir el álbum definitorio

- **WHEN** el dueño elige un álbum en el editor de la Tarjeta de Identidad
- **THEN** ese álbum aparece en la Tarjeta, sin crear un ítem de "Empieza por aquí" ni un
  favorito

#### Scenario: Reemplazar el definitorio del mismo tipo

- **WHEN** el dueño ya tiene un álbum definitorio y elige otro distinto
- **THEN** el nuevo reemplaza al anterior en la Tarjeta y el anterior no cambia en ningún otro
  lugar del perfil

#### Scenario: Otros editores no ofrecen marcar identidad

- **WHEN** el dueño abre el editor de "Empieza por aquí"
- **THEN** no ve controles de himno ni marcador "me define"

#### Scenario: Independencia de los favoritos

- **WHEN** el dueño quita de sus favoritos el álbum que definió en la Tarjeta
- **THEN** la Tarjeta sigue mostrando ese álbum

#### Scenario: Tarjeta de Identidad incompleta

- **WHEN** el dueño tiene himno pero no eligió artista ni álbum definitorios
- **THEN** la Tarjeta de Identidad muestra solo el himno, sin huecos por los elementos ausentes

#### Scenario: Ningún elemento de identidad

- **WHEN** el dueño no tiene himno, artista ni álbum definitorios
- **THEN** la Tarjeta de Identidad no se renderiza

### Requirement: Vinilo que asoma en la Tarjeta de Identidad

En la Tarjeta de Identidad del perfil, el álbum definitorio y el himno SHALL presentarse como una funda:
detrás de la carátula SHALL haber un disco de vinilo, con su etiqueta en el tono del perfil (ver
`social-profiles`, "Tono del perfil"), que se desliza parcialmente fuera de la funda al pasar el cursor
o al enfocar el elemento con el teclado, y vuelve al retirarlos. En dispositivos sin cursor el disco
SHALL quedar quieto, asomando apenas. Con la preferencia de movimiento reducido el disco SHALL NOT
animarse. El disco SHALL ser decorativo (oculto a lectores de pantalla), SHALL NOT tapar el título ni
el artista del elemento y SHALL NOT provocar desplazamiento horizontal de la página. El artista
definitorio SHALL NOT llevar vinilo.

#### Scenario: Cursor sobre el álbum definitorio

- **WHEN** un visitante pasa el cursor sobre el álbum definitorio de la Tarjeta de Identidad
- **THEN** el vinilo se desliza parcialmente fuera de la carátula, por encima del elemento vecino, y
  vuelve al retirar el cursor

#### Scenario: Teclado

- **WHEN** un visitante enfoca el enlace del himno con el teclado
- **THEN** el vinilo asoma igual que con el cursor

#### Scenario: Pantalla táctil

- **WHEN** un visitante abre el perfil en un teléfono
- **THEN** el vinilo del álbum y del himno asoma apenas, quieto, sin desplazamiento horizontal de la
  página

#### Scenario: Movimiento reducido

- **WHEN** el visitante tiene activada la preferencia de movimiento reducido
- **THEN** el vinilo no se anima

#### Scenario: Artista definitorio

- **WHEN** un visitante ve el artista definitorio
- **THEN** su foto se muestra sin vinilo

