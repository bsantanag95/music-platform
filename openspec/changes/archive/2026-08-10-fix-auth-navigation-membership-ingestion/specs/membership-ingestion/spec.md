# membership-ingestion

Sincronización cacheada de relaciones persona/grupo desde MusicBrainz.

## ADDED Requirements

### Requirement: Consulta de relaciones de artista
El cliente MusicBrainz SHALL exponer una operación de detalle de artista con `inc=artist-rels`, manteniendo User-Agent obligatorio, rate limit y el cliente como único punto de salida externo.

#### Scenario: Artista con relaciones
- **WHEN** la ingesta solicita las relaciones de un artista con MBID
- **THEN** el cliente consulta `/artist/{mbid}` con `artist-rels` y devuelve las relaciones tipadas

### Requirement: Filtrado de membresías
La ingesta SHALL considerar únicamente relaciones `member of band` cuyo target sea un artista y SHALL identificar persona y grupo por sus tipos confirmados.

#### Scenario: Relación persona-grupo válida
- **WHEN** MusicBrainz devuelve una relación entre un artista `Person` y un target `Group`, `Orchestra` o `Choir`
- **THEN** la ingesta crea o actualiza una fila persona↔grupo

#### Scenario: Relación no aplicable
- **WHEN** una relación tiene otro tipo o su target no es un artista
- **THEN** la ingesta la ignora sin crear una membership

### Requirement: Sincronización idempotente
La aplicación SHALL sincronizar memberships solo cuando `memberships_synced_at` sea `NULL`, SHALL releer ese flag dentro de un `pg_advisory_xact_lock` por artista para evitar llamadas MusicBrainz duplicadas, SHALL ejecutar artistas, memberships, reconciliación y flag en una única transacción, SHALL marcarlo únicamente después de una sincronización exitosa y SHALL impedir duplicados por `(person_id, group_id)`.

#### Scenario: Primera sincronización
- **WHEN** un artista no tiene `memberships_synced_at` y MusicBrainz responde correctamente
- **THEN** la aplicación persiste las relaciones válidas, marca la fecha de sincronización y devuelve los datos desde la base

#### Scenario: Segunda visita cacheada
- **WHEN** el mismo artista ya tiene `memberships_synced_at`
- **THEN** la aplicación no llama a MusicBrainz y lee memberships exclusivamente desde PostgreSQL

#### Scenario: Error externo
- **WHEN** MusicBrainz falla durante la sincronización
- **THEN** la aplicación no marca la sincronización como completa y devuelve un error recuperable sin inventar memberships

#### Scenario: Error durante la persistencia
- **WHEN** falla una escritura de artista o membership después de recibir una respuesta válida
- **THEN** PostgreSQL revierte las escrituras de esa sincronización y el flag permanece `NULL`

#### Scenario: Solicitudes concurrentes
- **WHEN** dos solicitudes intentan sincronizar el mismo artista al mismo tiempo
- **THEN** el lock serializa la sección crítica, la segunda relee el flag y no vuelve a llamar a MusicBrainz

#### Scenario: Reconciliación de relaciones
- **WHEN** una respuesta válida ya no contiene una membership previamente persistida
- **THEN** se elimina únicamente esa relación del artista objetivo y no se modifican memberships de otros artistas

### Requirement: Consolidación de relaciones duplicadas
La ingesta SHALL consolidar varias relaciones para una misma pareja persona/grupo en una única fila, combinando roles y conservando el intervalo más amplio representable.

#### Scenario: Varios roles
- **WHEN** una persona tiene varias relaciones con el mismo grupo y distintos atributos
- **THEN** la membership conserva los roles combinados, el mínimo `joined_on` conocido y el máximo `left_on` conocido sin convertir un extremo a `NULL` por faltar la otra fecha

### Requirement: Integridad SQL de memberships
La base de datos SHALL imponer unicidad de `(person_id, group_id)` y SHALL mantener la validación de tipos persona/grupo mediante el trigger existente.

#### Scenario: Inserción concurrente
- **WHEN** dos procesos intentan persistir la misma membership
- **THEN** PostgreSQL conserva una sola fila válida y la aplicación puede completar el upsert sin duplicar datos
