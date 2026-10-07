## MODIFIED Requirements

### Requirement: Actualización periódica

Cuando se lee la discografía de un artista, el sistema SHALL programar una resincronización en segundo
plano si la discografía nunca se recorrió completa, si su última verificación (recorrido completo o
verificación barata) tiene más de 7 días o si hay una solicitud de resincronización posterior a esa
verificación. En todos los casos SHALL responder con los datos guardados sin esperarla. A lo sumo una
resincronización por artista SHALL ejecutarse a la vez.

#### Scenario: Disco nuevo de una banda activa

- **WHEN** una banda publicó un disco después de su última sincronización, el calendario no lo detectó
  y alguien visita su página 8 días después
- **THEN** la página responde con la discografía guardada y el disco nuevo aparece en las
  visitas siguientes, cuando termina la resincronización

#### Scenario: Visitas simultáneas

- **WHEN** dos personas abren a la vez la página de un artista con la discografía vencida
- **THEN** se ejecuta una sola resincronización

#### Scenario: Discografía verificada hace poco

- **WHEN** alguien visita un artista cuya discografía se verificó hace 3 días y no tiene solicitudes
  posteriores
- **THEN** no se programa ninguna resincronización

## ADDED Requirements

### Requirement: Resincronización por lanzamiento detectado

Al terminar cada sincronización del calendario de lanzamientos, el sistema SHALL registrar una solicitud de
resincronización para cada artista que cumpla todo esto: tiene discografía guardada, figura en una entrada
del calendario no excluida y el release-group de esa entrada no está acreditado a él en el catálogo. SHALL
NOT registrarla si la discografía del artista se verificó en las últimas 24 horas. Registrar la solicitud
SHALL NOT hacer requests a MusicBrainz ni a ListenBrainz, y un fallo al registrarla SHALL NOT hacer fallar
la sincronización del calendario. Una solicitud SHALL forzar en la próxima resincronización el recorrido
completo de todas las páginas, sin verificación barata.

#### Scenario: Banda con disco recién publicado

- **WHEN** la sincronización del calendario trae un disco de una banda cuya discografía se verificó hace
  2 días y ese disco no está en su discografía
- **THEN** la banda queda con una solicitud de resincronización y la próxima visita a su página la
  resincroniza en segundo plano, de modo que el disco aparece en la visita siguiente

#### Scenario: Disco ya vinculado por el calendario

- **WHEN** el disco del calendario ya está en el catálogo acreditado a la banda
- **THEN** no se registra ninguna solicitud

#### Scenario: Artista sin discografía guardada

- **WHEN** el calendario trae un disco de un artista que nunca se visitó
- **THEN** no se registra ninguna solicitud y su primera visita hace la ingesta inicial como siempre

#### Scenario: Disco que nunca entra a la discografía

- **WHEN** un disco del calendario sigue sin aparecer en el browse del artista después de resincronizarlo
- **THEN** el artista no vuelve a recibir una solicitud hasta que pasen 24 horas desde su última verificación

### Requirement: Verificación barata antes de la resincronización

Cuando la resincronización periódica de un artista encuentra en la primera página un total de
release-groups mayor a 100, el sistema SHALL compararlo con el total que informó MusicBrainz en la última
sincronización completa. Si coinciden, SHALL guardar los release-groups de esa página, SHALL dar la
discografía por verificada y SHALL NOT pedir las páginas restantes. Si difieren o no se conoce el total
anterior, SHALL continuar con las páginas restantes sin volver a pedir la primera. La verificación barata
SHALL NOT marcar ni desmarcar release-groups fuera de la discografía y SHALL NOT cambiar la fecha de la
última sincronización completa. El sistema SHALL hacer el recorrido completo sin verificación barata cuando
la última sincronización completa tenga más de 30 días, cuando haya una solicitud de resincronización
pendiente y cuando lo pida el script de backfill.

#### Scenario: Artista grande sin cambios

- **WHEN** se resincroniza un artista con 2.077 release-groups, MusicBrainz informa el mismo total que en
  la última sincronización completa y esta tiene 10 días
- **THEN** la resincronización hace una sola request y la discografía queda verificada

#### Scenario: Artista grande con un disco nuevo

- **WHEN** MusicBrainz informa 220 release-groups y la última sincronización completa registró 219
- **THEN** la resincronización pide las páginas 2 y 3, guarda los 220 y actualiza las marcas de fuera de
  la discografía

#### Scenario: Artista con una sola página

- **WHEN** se resincroniza un artista con 31 release-groups
- **THEN** la resincronización hace una sola request y se comporta como un recorrido completo, con marcas

#### Scenario: Recorrido completo vencido

- **WHEN** el total coincide pero la última sincronización completa tiene 31 días
- **THEN** se recorren todas las páginas

#### Scenario: Total anterior desconocido

- **WHEN** se resincroniza por primera vez desde este cambio un artista con 450 release-groups
- **THEN** se recorren todas las páginas y queda registrado el total para el próximo ciclo
