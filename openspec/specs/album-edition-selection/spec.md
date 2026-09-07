# album-edition-selection Specification

## Purpose
TBD - created by archiving change canonicalize-release-group. Update Purpose after archive.
## Requirements
### Requirement: Selección determinista de la edición representativa

El sistema SHALL elegir para cada `release_group` una única **edición representativa**
(fila `release`) mediante una función de ranking pura y documentada sobre las ediciones
que MusicBrainz reporta para ese grupo. El ranking SHALL aplicar los siguientes criterios
en orden estricto de prioridad, pasando al siguiente solo ante empate:

1. Estado `Official` antes que cualquier otro estado o estado ausente.
2. Fecha de lanzamiento más temprana (una edición sin fecha SHALL ordenarse después de
   cualquier edición con fecha).
3. Edición **estándar**: sin marcadores `deluxe`, `expanded`, `anniversary`, `remaster`,
   `remastered`, `super deluxe`, `special edition` ni equivalentes en el título o en la
   `disambiguation` del release.
4. País primario: `[Worldwide]` / `XW` / `US` / `GB` / `XE` antes que otros países; sin
   país conocido, después de los anteriores.
5. Empaquetado estándar (no `Box`, no ediciones de coleccionista) cuando MusicBrainz lo
   informa.
6. Recuento total de pistas más cercano a la mediana de recuentos de las ediciones
   `Official` del grupo (penaliza ediciones truncadas y ediciones infladas con bonus
   tracks).
7. Desempate final estable por `mbid` ascendente.

La función SHALL ser determinista: la misma lista de ediciones de entrada SHALL producir
siempre la misma elección, independientemente del orden en que MusicBrainz las devuelva.

#### Scenario: Original oficial frente a reedición deluxe

- **WHEN** un `release_group` tiene una edición `Official` de 1994 sin marcadores y una
  edición `Official` "Deluxe Edition" de 2015
- **THEN** el sistema elige la edición de 1994 como representativa

#### Scenario: Orden de entrada indiferente

- **WHEN** el mismo conjunto de ediciones se evalúa dos veces con distinto orden de lista
- **THEN** ambas evaluaciones eligen la misma edición representativa

#### Scenario: Sin ediciones oficiales

- **WHEN** ningún `release` del grupo tiene estado `Official`
- **THEN** el ranking se aplica igual sobre el resto y elige una edición según los
  criterios 2–7, sin abortar la ingesta

#### Scenario: Grupo sin ediciones ingeribles

- **WHEN** MusicBrainz no devuelve ningún `release` utilizable para el grupo
- **THEN** el read-model de álbum responde `no_editions` / `NO_EDITIONS_FOUND` y no se
  persiste ninguna fila `release` ni `track`

### Requirement: Etiqueta de edición derivada

El sistema SHALL guardar en `release.edition_label` un valor derivado de la edición
elegida: la `disambiguation` de MusicBrainz cuando exista, o el sufijo de edición del
título, o `"standard"` cuando la edición no tiene marcador alguno. El sistema SHALL NOT
guardar `"original"` de forma incondicional.

#### Scenario: Edición corriente

- **WHEN** la edición representativa no tiene `disambiguation` ni sufijo de edición
- **THEN** `edition_label` queda como `"standard"`

#### Scenario: Edición con disambiguation

- **WHEN** la edición representativa tiene `disambiguation` `"Japanese edition"`
- **THEN** `edition_label` queda como `"Japanese edition"`

### Requirement: Re-canonicalización sin afectar datos sociales

El sistema SHALL exponer una operación de servicio, invocable desde un script
(`scripts/recanonicalize-release-group.ts`), que reevalúa la edición representativa de un
`release_group` y, si el resultado difiere de la edición ingerida, reemplaza sus filas
`release` y `track` de forma idempotente. La operación SHALL NOT crear, modificar ni
eliminar filas de `rating`, `favorite`, `comment`, `listen_entry`, `user_list_item`,
`user_pinned_item` ni `collection_entry`, porque todas referencian el `release_group` y no
la edición. El script SHALL ofrecer un modo `--dry-run` que informa qué edición elegiría
sin escribir nada.

#### Scenario: Corrección de una edición subóptima

- **WHEN** un `release_group` fue ingerido con una edición remaster y se ejecuta la
  re-canonicalización, que ahora elige la edición original
- **THEN** las filas `release` y `track` del grupo se reemplazan por las de la edición
  original y las valoraciones, escuchas, favoritos, comentarios y entradas de lista y
  colección de ese álbum permanecen intactas

#### Scenario: Re-canonicalización sin cambios

- **WHEN** la re-canonicalización reevalúa un grupo cuya edición ingerida ya es la
  representativa
- **THEN** no se modifica ninguna fila y la operación termina sin error

#### Scenario: Dry-run

- **WHEN** el script se ejecuta con `--dry-run` sobre un grupo
- **THEN** informa la edición que elegiría y no escribe en la base de datos

