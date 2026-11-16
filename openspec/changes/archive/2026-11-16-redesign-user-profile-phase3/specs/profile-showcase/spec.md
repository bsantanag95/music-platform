## ADDED Requirements

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
