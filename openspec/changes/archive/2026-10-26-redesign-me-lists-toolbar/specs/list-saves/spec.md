## MODIFIED Requirements

### Requirement: Superficie "Guardadas"
El sistema SHALL exponer al usuario autenticado la lista paginada de las listas que guardó,
mostrando por cada una su título, dueño (con enlace al perfil), tipo de entidad, conteo de
ítems, carátulas disponibles, si la está siguiendo y, cuando la lista es de álbumes
(`entityType = 'release-group'`), si activó el tracking de su propio progreso sobre ella
(Requirement "Trackear el progreso propio sobre una lista ajena"). La superficie SHALL mostrar
solo los guardados del propio usuario y SHALL NOT ser accesible para terceros. El orden por defecto SHALL ser
por fecha de guardado, de la más reciente a la más antigua. La superficie SHALL aceptar búsqueda por título (`q`),
filtro por tipo de entidad (`entityType`) y orden alfabético (`sort=alpha`), aplicados en el servidor, y la respuesta
SHALL incluir `counts` por tipo de entidad contados sin filtros. Los filtros SHALL reflejarse en la URL como en «Mis
listas». Un valor inválido SHALL responder `400` con `VALIDATION_ERROR`.

#### Scenario: Ver las listas guardadas
- **WHEN** un usuario con listas guardadas abre la pestaña "Guardadas"
- **THEN** ve sus listas guardadas paginadas, con dueño, conteo y estado de seguimiento

#### Scenario: Sin listas guardadas
- **WHEN** un usuario que no guardó ninguna lista abre "Guardadas"
- **THEN** ve un estado vacío localizado que explica cómo guardar listas, no un error técnico

#### Scenario: Paginación inválida
- **WHEN** se envía una paginación fuera de rango
- **THEN** la API responde `400` con código `VALIDATION_ERROR` y no ejecuta la lectura

#### Scenario: Estado de tracking visible en una lista de álbumes
- **WHEN** un usuario abre "Guardadas" y tiene activado el tracking de progreso sobre una de sus
  listas guardadas de álbumes
- **THEN** esa entrada indica que está trackeando su progreso, junto al resto de su información

#### Scenario: Sin indicador de tracking en listas de artistas o canciones
- **WHEN** un usuario ve en "Guardadas" una lista guardada de artistas o de canciones
- **THEN** esa entrada no ofrece ningún indicador ni control de tracking

#### Scenario: Filtrar las guardadas
- **WHEN** el usuario elige Canciones en "Guardadas" y ordena alfabéticamente
- **THEN** solo ve sus listas guardadas de canciones, por título, y la URL lleva `?tab=saved&type=recording&sort=alpha`
