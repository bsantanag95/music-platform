## ADDED Requirements

### Requirement: Tono del perfil

Cada perfil SHALL tener un tono de acento derivado de la carátula de su álbum definitorio (ver
`profile-showcase`): el matiz dominante de la carátula, con saturación y luminosidad acotadas para que
el tono contraste al menos 3:1 con el fondo del sitio. El tono SHALL calcularse en el servidor cuando el
dueño elige o cambia su álbum definitorio, SHALL guardarse con el perfil y SHALL NOT recalcularse al
mostrar el perfil. Cuando el dueño no tiene álbum definitorio, la carátula no tiene arte o no tiene un
matiz dominante suficientemente saturado, el tono SHALL ser el ámbar del sitio. El tono SHALL usarse
solo en detalles de la página del perfil accesible —la línea inferior de la cabecera, las comillas de
la bio, la marca de la sección activa de la barra de anclas y la etiqueta del vinilo de la Tarjeta de
Identidad—, nunca en textos de lectura, valoraciones ni en otras páginas.

#### Scenario: Tono desde la carátula

- **WHEN** el dueño elige como álbum definitorio uno cuya carátula es predominantemente roja
- **THEN** su perfil usa un tono rojo en la línea de la cabecera, las comillas de la bio, la sección
  activa de las anclas y la etiqueta del vinilo

#### Scenario: Sin álbum definitorio

- **WHEN** el dueño no tiene álbum definitorio, o lo quita
- **THEN** su perfil usa el ámbar del sitio en esos mismos detalles

#### Scenario: Carátula sin color dominante

- **WHEN** la carátula del álbum definitorio es en blanco y negro o casi sin saturación
- **THEN** el perfil usa el ámbar del sitio

#### Scenario: Contraste mínimo

- **WHEN** el matiz dominante de la carátula, con la luminosidad de referencia, contrasta menos de 3:1
  con el fondo del sitio
- **THEN** el tono guardado se aclara hasta alcanzar ese contraste

#### Scenario: El tono no se calcula al visitar

- **WHEN** un visitante abre un perfil
- **THEN** el tono se lee guardado, sin descargar ni analizar la carátula en esa visita

#### Scenario: Perfiles anteriores al tono

- **WHEN** se despliega el cambio con perfiles que ya tenían álbum definitorio
- **THEN** un script operativo calcula y guarda su tono, y hasta que corra esos perfiles usan el ámbar
