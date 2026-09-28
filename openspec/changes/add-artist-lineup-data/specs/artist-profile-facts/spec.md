## MODIFIED Requirements

### Requirement: Actualización de la ficha

Cuando se lee un artista cuya ficha tiene más de 30 días, nunca se sincronizó o cuya alineación
nunca se sincronizó con períodos, el sistema SHALL programar su actualización en segundo plano y
SHALL responder con los datos guardados sin esperarla. La actualización SHALL renovar, en la
misma request a MusicBrainz, la ficha y la alineación (pertenencias con períodos y músicos de
apoyo, capability `artist-lineup`). A lo sumo una actualización por artista SHALL ejecutarse a
la vez. Un script de backfill SHALL sincronizar las fichas existentes en lote, con opciones de
límite y de simulación sin escritura.

#### Scenario: Primera visita

- **WHEN** alguien abre un artista cuya ficha nunca se sincronizó
- **THEN** la página responde con los datos existentes y la ficha se completa en segundo
  plano para las visitas siguientes

#### Scenario: Integrante nuevo

- **WHEN** alguien abre una banda sincronizada hace más de 30 días y MusicBrainz agregó a un
  integrante desde entonces
- **THEN** la actualización en segundo plano lo agrega a la alineación con la misma request que
  renueva la ficha
