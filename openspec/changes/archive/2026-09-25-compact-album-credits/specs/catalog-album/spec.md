## MODIFIED Requirements

### Requirement: Pestaña Créditos

La pestaña Créditos SHALL mostrar únicamente personas acreditadas en el disco (créditos de
personal de nivel edición o grabación), agrupadas en cuatro niveles y en este orden: el
**primer nivel** (acreditadas y miembros del artista principal según el catálogo, o el
propio artista principal cuando es una persona), en un bloque destacado siempre visible;
**Músicos invitados** (intérpretes acreditados que no son miembros); **Producción y
sonido**; y **Arte y otros**, contraído por defecto con la cantidad de créditos. El primer
nivel SHALL rotularse "Artista principal" ("Artistas principales" con más de una persona)
cuando todos los artistas principales del álbum son personas, e "Integrantes de la banda"
en los demás casos. Músicos invitados y Producción y sonido SHALL mostrarse desplegados
cuando tienen hasta 6 personas y contraídos por defecto cuando tienen más, con un resumen
que indica la cantidad y los tres primeros nombres, y SHALL poder desplegarse. Cada persona
SHALL aparecer una sola vez, en el nivel más alto que le corresponde, con todos sus roles y
las pistas en que participa ("todas" cuando participa en todas). La pestaña SHALL NOT
mostrar integrantes calculados por fechas de pertenencia ni personas sin crédito en el
disco, y SHALL NOT mostrar un distintivo de fundador. Un tipo de crédito sin nivel asignado
SHALL mostrarse en Arte y otros. Sin créditos de personal, la pestaña no se muestra.

#### Scenario: Integrante acreditado

- **WHEN** un miembro de la banda está acreditado con guitarra y voz en todas las pistas y
  como coproductor
- **THEN** aparece en Integrantes de la banda con "guitarra, voz, coproducción · todas" y
  no se repite en Producción y sonido

#### Scenario: Miembro sin crédito en el disco

- **WHEN** una persona era miembro de la banda el año del lanzamiento pero no tiene
  créditos en el disco
- **THEN** no aparece en la pestaña

#### Scenario: Invitado en pistas puntuales

- **WHEN** una vocalista no miembro está acreditada solo en la pista 5
- **THEN** aparece en Músicos invitados con "voz · pista 5"

#### Scenario: Créditos de arte contraídos

- **WHEN** el disco tiene 9 créditos de diseño y fotografía
- **THEN** el nivel Arte y otros se muestra contraído como "+9 créditos"

#### Scenario: Álbum de solista

- **WHEN** el único artista principal del álbum es una persona acreditada en su disco
- **THEN** el primer nivel se rotula "Artista principal"

#### Scenario: Muchos músicos invitados

- **WHEN** el disco tiene 23 músicos invitados
- **THEN** el nivel se muestra contraído con "23" y los tres primeros nombres seguidos de
  "y 20 más", y al desplegarlo lista a las 23 personas

#### Scenario: Pocos músicos invitados

- **WHEN** el disco tiene 4 músicos invitados
- **THEN** el nivel se muestra desplegado

## ADDED Requirements

### Requirement: Filas de crédito compactas

Cada fila de la pestaña Créditos SHALL mostrar el nombre de la persona y, aparte, sus roles
y sus pistas en líneas separadas. Con más de 4 roles, la fila SHALL mostrar los 4 primeros
y una acción "+N" que despliega el resto.

#### Scenario: Persona con muchos roles

- **WHEN** un músico está acreditado con 9 roles distintos
- **THEN** la fila muestra 4 roles y "+5", y al desplegar muestra los 9

### Requirement: Presentación de los modificadores de rol

Los modificadores de MusicBrainz SHALL NOT mostrarse como roles propios. En instrumentos y
voces, "additional" y "guest" SHALL omitirse y "solo" SHALL mostrarse como matiz del
instrumento. En los demás tipos, un modificador SHALL combinarse con el tipo en una
etiqueta compuesta cuando existe ("coproducción", "producción ejecutiva", "producción
adicional") y, si no existe, mostrarse entre paréntesis. La familia `membranophone` SHALL
mostrarse como "percusión". Un rol repetido tras aplicar estas reglas SHALL mostrarse una
sola vez. Un valor sin traducción SHALL seguir mostrándose con el texto de MusicBrainz.

#### Scenario: Teclados adicionales

- **WHEN** una persona tiene los créditos `instrument ["additional","keyboard"]` e
  `instrument ["keyboard"]`
- **THEN** sus roles muestran "teclados" una sola vez y ningún "adicional"

#### Scenario: Coproductor

- **WHEN** una persona tiene el crédito `producer ["co"]`
- **THEN** su rol se muestra como "coproducción"

#### Scenario: Programación de percusión

- **WHEN** una persona tiene los créditos `instrument ["membranophone"]` y
  `programming ["membranophone"]`
- **THEN** sus roles se muestran como "percusión, programación (percusión)"
