## RENAMED Requirements

- FROM: `### Requirement: Cuatro destacados`
- TO: `### Requirement: Sección "Empieza por aquí"`

## MODIFIED Requirements

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

## REMOVED Requirements

### Requirement: Marcar un artista o álbum como definitorio

**Reason**: El marcador ★ "me define" de los editores de Destacados y de Álbumes favoritos
duplicaba al editor de la Tarjeta de Identidad y ocultaba del muro el ítem marcado. Con la
sección Álbumes favoritos retirada y el marcador fuera de Destacados, el artista y el álbum
definitorios se eligen solo desde la Tarjeta.

**Migration**: Sustituido por el requisito "Tarjeta de Identidad del perfil". Los datos no
cambian: el artista y el álbum definitorios siguen guardados como referencias directas en
`user_showcase`.

## ADDED Requirements

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
