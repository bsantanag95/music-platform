## ADDED Requirements

### Requirement: Enlace a Wikidata solo desde MusicBrainz

El sistema SHALL identificar la entidad de Wikidata de un artista únicamente a partir de la
relación de URL `wikidata` que declara MusicBrainz para ese artista. El sistema SHALL NOT
buscar la entidad por nombre ni por ninguna otra heurística. Un artista sin esa relación
SHALL quedar sin foto, descripción, resumen ni lugar desde Wikimedia.

#### Scenario: Artista enlazado

- **WHEN** MusicBrainz declara para Los Bunkers la relación `wikidata` a `Q2737642`
- **THEN** el sistema enriquece el artista desde esa entidad

#### Scenario: Artista sin enlace

- **WHEN** un artista no tiene relación `wikidata` en MusicBrainz
- **THEN** el sistema no consulta Wikimedia para ese artista y la página se construye sin
  esos datos

### Requirement: Foto libre con crédito

La foto del artista SHALL provenir únicamente de la propiedad de imagen (P18) de su entidad
de Wikidata, que apunta a un archivo de Wikimedia Commons. El sistema SHALL aceptar la foto
solo si los metadatos del archivo en Commons declaran una licencia libre de una lista
permitida (dominio público, CC0, CC BY y CC BY-SA en cualquier versión) y SHALL rechazar
cualquier archivo marcado como no libre o con licencia desconocida. Por cada foto aceptada
el sistema SHALL guardar el nombre del archivo, el autor, el nombre corto de la licencia, el
enlace a la licencia y el enlace a la página del archivo, para mostrar el crédito que exige
la licencia. El sistema SHALL servir una miniatura de Commons de a lo sumo 500 px de ancho y
SHALL NOT usar nunca la miniatura del resumen de Wikipedia.

#### Scenario: Foto CC BY-SA

- **WHEN** la imagen de Wikidata de Kuervos del Sur es un archivo de Commons con licencia
  CC BY-SA 4.0 y autora Carolina Marlene Gatica Molina
- **THEN** el artista guarda la foto con autora, licencia "CC BY-SA 4.0" y los enlaces a la
  licencia y al archivo

#### Scenario: Foto en dominio público

- **WHEN** la imagen de Wikidata está en dominio público
- **THEN** se acepta y se guarda con la licencia "Dominio público" y el autor declarado

#### Scenario: Miniatura no libre del resumen de Wikipedia

- **WHEN** el resumen de Wikipedia en inglés de un artista trae como miniatura una imagen de
  uso justo alojada fuera de Commons
- **THEN** el sistema no la usa como foto del artista

#### Scenario: Licencia no permitida

- **WHEN** el archivo de Commons declara una licencia fuera de la lista permitida o no
  declara licencia
- **THEN** el artista queda sin foto

### Requirement: Descripción y resumen por idioma

Para cada idioma de la interfaz (español e inglés), el sistema SHALL guardar la descripción
corta de la entidad de Wikidata en ese idioma, si existe, y el resumen del artículo de
Wikipedia enlazado desde esa entidad en ese idioma, si existe. El resumen SHALL ser la
introducción del artículo en texto plano, con el título y la URL del artículo. Si no hay
artículo en un idioma, la lectura en ese idioma SHALL devolver el resumen del otro idioma
indicando su idioma de origen. El sistema SHALL NOT traducir textos automáticamente.

#### Scenario: Artículo en ambos idiomas

- **WHEN** Pink Floyd tiene artículo en la Wikipedia en español y en inglés
- **THEN** la lectura en español devuelve el resumen en español y la lectura en inglés, el
  resumen en inglés, cada uno con su URL

#### Scenario: Artículo solo en español

- **WHEN** Kuervos del Sur solo tiene artículo en la Wikipedia en español
- **THEN** la lectura en inglés devuelve el resumen en español indicando que su idioma es el
  español

#### Scenario: Sin artículo

- **WHEN** la entidad de Wikidata no enlaza ningún artículo de Wikipedia en español ni en
  inglés
- **THEN** la lectura no devuelve resumen

#### Scenario: Sin descripción en un idioma

- **WHEN** la entidad no tiene descripción en inglés
- **THEN** la lectura en inglés no devuelve descripción, sin usar la de otro idioma

### Requirement: Lugar de nacimiento o de formación

El sistema SHALL guardar, traducido a cada idioma de la interfaz, el lugar de nacimiento
(P19) de una persona o el lugar de formación (P740) de un grupo, junto con el país de ese
lugar. Si Wikidata no tiene ese dato, la lectura SHALL usar como respaldo el lugar de inicio
de MusicBrainz, sin país cuando MusicBrainz no permite determinarlo.

#### Scenario: Persona que vive en otro país

- **WHEN** Mon Laferte tiene en MusicBrainz país `MX` y en Wikidata lugar de nacimiento
  Viña del Mar (Chile)
- **THEN** la lectura en español devuelve "Viña del Mar, Chile" como lugar de nacimiento

#### Scenario: Grupo con lugar de formación

- **WHEN** Pink Floyd tiene en Wikidata lugar de formación Londres (Reino Unido)
- **THEN** la lectura en español devuelve "Londres, Reino Unido" y la lectura en inglés
  "London, United Kingdom"

#### Scenario: Respaldo de MusicBrainz

- **WHEN** Wikidata no tiene lugar de formación y MusicBrainz tiene lugar de inicio
  "Concepción"
- **THEN** la lectura devuelve "Concepción" como lugar de formación

### Requirement: Cliente propio de Wikimedia

Todas las requests a Wikidata, Wikipedia y Commons SHALL pasar por un único cliente, que
SHALL exigir un User-Agent configurado (con contacto, según la política de Wikimedia) y
SHALL fallar cerrado si falta, y SHALL serializar las requests en una cola propia. Ningún
otro módulo SHALL construir URLs de la API de Wikimedia.

#### Scenario: Falta el User-Agent

- **WHEN** el entorno no define el User-Agent de Wikimedia
- **THEN** el cliente lanza un error de configuración y no hace la request

### Requirement: Actualización y aislamiento de fallos

El enriquecimiento desde Wikimedia SHALL ejecutarse en segundo plano cuando el artista nunca
se enriqueció o su último enriquecimiento tiene más de 30 días, y SHALL NOT bloquear la
respuesta de la página. Un fallo de Wikimedia (red, límite de uso, entidad borrada) SHALL
conservar los datos guardados anteriormente y SHALL NOT impedir que la página se construya.
Si una actualización encuentra que la foto ya no existe o dejó de tener una licencia
permitida, SHALL quitarla. Un script de backfill SHALL enriquecer los artistas existentes en
lote, con opciones de límite y de simulación sin escritura.

#### Scenario: Wikimedia no responde

- **WHEN** Wikidata responde con error durante la actualización de un artista ya
  enriquecido
- **THEN** el artista conserva su foto y su resumen anteriores

#### Scenario: Foto borrada de Commons

- **WHEN** una actualización encuentra que el archivo de la foto fue borrado de Commons
- **THEN** el artista queda sin foto

### Requirement: Retiro de una foto a pedido

El sistema SHALL permitir retirar la foto de un artista a pedido mediante un script
operativo, dejando una marca que impide volver a asignarle esa foto en actualizaciones
posteriores hasta que la marca se quite.

#### Scenario: Retiro

- **WHEN** se retira la foto de un artista con el script
- **THEN** la foto deja de mostrarse y la siguiente actualización no la vuelve a asignar
