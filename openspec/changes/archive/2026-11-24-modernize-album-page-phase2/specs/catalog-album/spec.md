## ADDED Requirements

### Requirement: Compositores en la lista de canciones

Cada pista de la pestaña Canciones SHALL mostrar, debajo del título, los autores de su obra (composición y letra) según los créditos
del catálogo, con cada nombre enlazado a su página y en el orden de los créditos. La línea SHALL anunciarse como composición a los
lectores de pantalla. Una pista sin autores conocidos SHALL NOT mostrar la línea ni un texto de relleno.

#### Scenario: Pista con un autor

- **WHEN** una persona abre The Number of the Beast
- **THEN** bajo «Invaders» ve «Steve Harris» enlazado a su página

#### Scenario: Pista con varios autores

- **WHEN** una pista tiene como autores a Adrian Smith y Clive Burr
- **THEN** la línea muestra «Adrian Smith, Clive Burr»

#### Scenario: Pista sin autores

- **WHEN** una pista no tiene autoría en el catálogo
- **THEN** la fila muestra título y duración sin línea de compositores

## MODIFIED Requirements

### Requirement: Ficha técnica del álbum

La portada SHALL mostrar una ficha técnica en una línea con, en este orden: los géneros, el lanzamiento (con la precisión conocida:
día, mes o solo año), la duración (cantidad de pistas y duración total), el sello (el de la edición representativa, cuando el catálogo
lo conoce), la producción (hasta dos productores del disco según los créditos, enlazados) y la edición (la edición representativa con
su etiqueta y, cuando existe la pestaña Ediciones, un acceso «N ediciones →» a ella). Cada dato SHALL conservar su rótulo para lectores
de pantalla. La ficha SHALL renderizar únicamente los datos que existen: uno sin valor SHALL omitirse, nunca mostrarse con un guion o un
texto de relleno.

#### Scenario: Ficha completa

- **WHEN** un álbum tiene fecha canónica, tracklist con duraciones y edición representativa
- **THEN** la ficha muestra Lanzamiento, Duración y Edición con sus valores

#### Scenario: Álbum sin fecha

- **WHEN** el álbum no tiene fecha canónica conocida
- **THEN** la ficha omite el Lanzamiento y el resto conserva su orden

#### Scenario: Precisión anual

- **WHEN** el álbum solo tiene `first_release_year`
- **THEN** el Lanzamiento muestra solo el año

#### Scenario: Producción y ediciones

- **WHEN** una persona abre The Number of the Beast
- **THEN** la ficha muestra «Martin Birch» enlazado y «Edición Estándar · 51 ediciones →»
