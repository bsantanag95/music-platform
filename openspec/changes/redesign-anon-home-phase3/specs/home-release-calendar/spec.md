## ADDED Requirements

### Requirement: Horario de lanzamientos en la portada sin sesión

En la portada sin sesión, la selección anónima SHALL presentarse como un horario en dos
partes, «Recientes» y «Próximos», cada una ordenada por fecha (de la más reciente a la más
antigua en «Recientes» y de la más cercana a la más lejana en «Próximos»), con una fila por
disco que muestra la fecha, la carátula en miniatura, el título, el artista y su estado
(publicado o próximo), y que enlaza a la página del disco. Cada parte SHALL mostrar al
principio como máximo seis discos y SHALL ofrecer ver el resto de su parte sin salir de la
página. Desde anchos de escritorio las dos partes SHALL ir lado a lado; en pantallas
angostas, una debajo de la otra. La selección, sus filtros y sus topes NO SHALL cambiar. El
Inicio con sesión SHALL conservar su riel con el selector de vistas.

#### Scenario: Horario en escritorio
- **WHEN** un visitante sin sesión abre `/[locale]` en una pantalla de 1440 px y hay
  lanzamientos recientes y próximos
- **THEN** ve «Recientes» y «Próximos» lado a lado, cada fila con su fecha, título,
  artista y estado, ordenadas por fecha

#### Scenario: Más de seis discos en una parte
- **WHEN** la selección anónima tiene 12 lanzamientos recientes
- **THEN** «Recientes» muestra seis y ofrece ver los otros seis en la misma página

#### Scenario: Solo próximos
- **WHEN** la selección anónima no tiene lanzamientos recientes pero sí próximos
- **THEN** el horario muestra solo «Próximos», sin una parte vacía

#### Scenario: El Inicio con sesión conserva el riel
- **WHEN** un usuario autenticado abre `/[locale]`
- **THEN** los lanzamientos se muestran en el riel con el selector «De tus artistas | Populares»
