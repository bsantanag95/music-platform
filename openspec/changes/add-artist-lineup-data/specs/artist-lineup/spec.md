## ADDED Requirements

### Requirement: Períodos de pertenencia

El sistema SHALL guardar cada relación de pertenencia a un grupo que entrega MusicBrainz como un
período propio de la pertenencia persona ↔ grupo, con su fecha de inicio y de fin en la
precisión que tengan, si terminó, sus instrumentos, y las marcas de integrante fundador y de
integrante adicional separadas de los instrumentos. La pertenencia SHALL conservar un resumen
(instrumentos y fechas) derivado de sus períodos en la misma escritura. Una relación con fin
anterior al inicio SHALL guardarse sin fechas.

#### Scenario: Integrante que se fue y volvió

- **WHEN** se sincroniza Mötley Crüe y Vince Neil tiene relaciones 1981–1992, 1997–2015 y
  2018 sin fin
- **THEN** su pertenencia guarda tres períodos, los dos primeros terminados y el tercero
  abierto, cada uno con voz principal y la marca de fundador

#### Scenario: Marcas separadas de los instrumentos

- **WHEN** una relación trae los atributos `electric bass guitar` y `original`
- **THEN** el período guarda el instrumento `electric bass guitar` y la marca de fundador, y el
  resumen de la pertenencia no incluye `original`

#### Scenario: Dato incoherente

- **WHEN** una relación trae un fin anterior a su inicio
- **THEN** el período se guarda sin fechas y la sincronización no falla

### Requirement: Músicos de apoyo

El sistema SHALL guardar las relaciones de apoyo de MusicBrainz (instrumental, vocal y
genérica) entre una persona y el artista al que apoya, sea un grupo o un solista, con su tipo,
instrumentos o tipos de voz, fechas y si terminó. Los músicos de apoyo SHALL NOT tratarse como
integrantes en ninguna otra superficie, incluidos los créditos del álbum. El sistema SHALL NOT
distinguir apoyo en vivo de apoyo en estudio, porque MusicBrainz no lo distingue.

#### Scenario: Baterista de gira de una banda

- **WHEN** se sincroniza Mötley Crüe y Samantha Maloney tiene apoyo instrumental de batería
  2000–2002
- **THEN** se guarda como músico de apoyo de la banda, terminado, y no como integrante

#### Scenario: Banda de gira de un solista

- **WHEN** se sincroniza a un solista con un músico de apoyo instrumental
- **THEN** el apoyo se guarda aunque el artista apoyado sea una persona

### Requirement: Sincronización por lado

Al sincronizar un grupo, el sistema SHALL reemplazar sus pertenencias (con sus períodos) y el
apoyo que recibe. Al sincronizar una persona, SHALL reemplazar sus pertenencias (con sus
períodos), el apoyo que da y el apoyo que recibe. Una sincronización SHALL NOT borrar
relaciones fuera de su alcance. Los artistas relacionados que no existen SHALL crearse como
stub con su tipo.

#### Scenario: Sincronizar a un integrante no borra al resto de la banda

- **WHEN** se sincroniza a John 5, integrante de Mötley Crüe
- **THEN** se reemplazan sus pertenencias y su apoyo, y las pertenencias de los demás
  integrantes de Mötley Crüe no cambian

#### Scenario: Banda nueva de un integrante

- **WHEN** un integrante sincronizado pertenece a una banda que no está en el catálogo
- **THEN** la banda se crea como stub de tipo grupo, enlazable

### Requirement: Clasificación de la alineación

El sistema SHALL clasificar a los integrantes de un grupo en actuales (algún período abierto) y
antiguos (todos sus períodos terminados), y a sus músicos de apoyo en actuales y anteriores con
el mismo criterio. Un período sin fechas y sin la marca de terminado SHALL contar como abierto
y marcarse con período desconocido. Si el grupo terminó, en lugar de actuales SHALL formar la
"Última alineación" quienes tienen un período que termina en el año de fin del grupo o sigue
abierto, y todo el apoyo SHALL ser anterior. Dentro de cada grupo el orden SHALL ser:
fundadores primero, luego por año del primer período, los sin año al final, y por nombre. Los
instrumentos de una persona SHALL agruparse en líneas de instrumentos con el mismo conjunto de
períodos.

#### Scenario: Integrante sin fechas

- **WHEN** DJ Larceny tiene una relación sin fechas y sin terminar
- **THEN** queda entre los actuales con período desconocido

#### Scenario: Grupo separado

- **WHEN** Pink Floyd terminó en 2014 y David Gilmour y Nick Mason tienen períodos que terminan
  en 2014
- **THEN** ambos forman la Última alineación y los demás integrantes son antiguos

#### Scenario: Instrumentos agregados en un período

- **WHEN** Tommy Lee toca batería en tres períodos y suma coros, teclados y piano solo en el
  último
- **THEN** su rol tiene dos líneas: batería con los tres períodos, y coros, teclados y piano con
  el último

### Requirement: Integrantes sincronizados en segundo plano

Al mostrar la alineación de un grupo, o los músicos de apoyo de un solista, el sistema SHALL
programar en segundo plano la sincronización de sus integrantes y músicos de apoyo cuya alineación está pendiente o tiene más
de 30 días (ficha y pertenencias en una request por persona, sin Wikimedia), con un tope de 10
personas por visita, priorizando actuales, luego antiguos y luego apoyo. A lo sumo una
sincronización por grupo SHALL ejecutarse a la vez, y la página SHALL responder sin esperarla.
Un fallo con una persona SHALL NOT detener a las demás.

#### Scenario: Primera visita a una banda grande

- **WHEN** alguien abre la alineación de Mötley Crüe con 14 personas sin sincronizar
- **THEN** la página responde con la alineación de la banda, se sincronizan 10 personas en
  segundo plano y las 4 restantes en una visita siguiente

#### Scenario: Visitas simultáneas

- **WHEN** dos personas abren la alineación del mismo grupo a la vez
- **THEN** solo una sincronización de integrantes se ejecuta

### Requirement: Lectura de la alineación

El sistema SHALL entregar la alineación de un artista sin consultar MusicBrainz. Para un grupo:
integrantes y músicos de apoyo clasificados, cada uno con año de muerte si terminó, marcas,
líneas de instrumentos y sus otras afiliaciones (sus demás grupos, como actuales o antiguos, y
los artistas a los que da apoyo), sin el grupo que se está viendo; y la cantidad de personas
cuya alineación sigue pendiente. Para una persona: sus grupos con sus períodos, los artistas a
los que da apoyo y sus propios músicos de apoyo, estos con sus otras afiliaciones.

#### Scenario: Integrante con otras bandas

- **WHEN** se lee la alineación de Mötley Crüe y John 5 ya está sincronizado
- **THEN** John 5 trae sus otras bandas, con Marilyn Manson como antigua, y no trae a Mötley
  Crüe entre ellas

#### Scenario: Integrante fallecido

- **WHEN** Randy Castillo está sincronizado y su ficha terminó en 2002
- **THEN** su entrada trae el año de muerte 2002

#### Scenario: Integrantes pendientes

- **WHEN** 4 personas de la alineación todavía no se sincronizaron
- **THEN** la lectura informa 4 pendientes y esas personas no traen otras afiliaciones
