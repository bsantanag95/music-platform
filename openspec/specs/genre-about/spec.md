# genre-about Specification

## Purpose
Texto «Sobre el género» desde Wikipedia (ADR 0027): almacenamiento por idioma, sincronización en segundo plano, bloque con atribución CC BY-SA y script de relleno.
## Requirements
### Requirement: Texto del género desde Wikipedia

El sistema SHALL guardar, por género de estilo con `wikidata_id` y por idioma (`es`, `en`), la descripción corta de
Wikidata y la introducción del artículo de Wikipedia con su título y su URL canónica, sin traducción automática. Se
SHALL llegar a Wikidata únicamente por el `wikidata_id` del género (que la taxonomía obtuvo de la declaración atada al
MBID de MusicBrainz) y nunca buscando una entidad por nombre. Todas las requests SHALL pasar por el cliente único de
Wikimedia. Un texto guardado SHALL tener siempre la URL de su artículo.

#### Scenario: Género con artículo en ambos idiomas

- **WHEN** se sincroniza un género cuyo ítem de Wikidata enlaza artículos en español e inglés
- **THEN** se guardan la descripción, el resumen, el título y la URL de cada idioma

#### Scenario: Género sin artículo en español

- **WHEN** el ítem solo enlaza el artículo en inglés
- **THEN** se guarda el texto en inglés y no se inventa ni traduce el de español

#### Scenario: Género sin `wikidata_id`

- **WHEN** el género no tiene `wikidata_id`
- **THEN** se marca como sincronizado sin texto y no se hace ninguna request a Wikimedia

### Requirement: Sincronización en segundo plano

La sincronización SHALL ejecutarse en segundo plano al visitar un género cuyo texto nunca se sincronizó o tiene más de
30 días, bajo un candado por género de modo que visitas simultáneas hagan una sola. La página SHALL construirse sin
esperar a Wikimedia: la primera visita responde sin texto. Si falla la lectura de la entidad de Wikidata, no se SHALL
escribir nada y el género quedará pendiente para la próxima visita; si falla el extracto de un idioma, se SHALL
conservar el texto anterior de ese idioma. Un fallo de Wikimedia SHALL NOT afectar la respuesta de la página.

#### Scenario: Primera visita

- **WHEN** una persona abre un género nunca sincronizado
- **THEN** la página responde de inmediato sin el bloque "Sobre el género" y la sincronización queda en curso

#### Scenario: Texto vigente

- **WHEN** el texto se sincronizó hace 10 días
- **THEN** no se hace ninguna request a Wikimedia

#### Scenario: Wikimedia caído

- **WHEN** la sincronización falla al leer la entidad
- **THEN** el texto anterior sigue guardado y visible, y no se actualiza la marca de sincronización

#### Scenario: Visitas simultáneas

- **WHEN** dos visitas simultáneas disparan la sincronización del mismo género
- **THEN** solo una consulta a Wikimedia se ejecuta

### Requirement: Bloque "Sobre el género"

El Resumen SHALL mostrar, bajo la cabecera, el bloque "Sobre el género" con el texto del idioma de la ruta; si falta,
el del otro idioma indicando cuál es. SHALL mostrar el primer párrafo, de hasta unos 600 caracteres cortados en límite
de oración, y el resto tras un control desplegable. El bloque SHALL incluir de forma visible la atribución "Fuente:
Wikipedia" con enlace al artículo (con su título) y a la licencia CC BY-SA 4.0. Un género sin texto SHALL NOT mostrar
el bloque ni un hueco.

#### Scenario: Texto en el idioma de la ruta

- **WHEN** una persona abre `/es/genre/shoegaze` y existe el texto en español
- **THEN** ve el primer párrafo, "Leer más" y "Fuente: Wikipedia" enlazando al artículo y a la licencia

#### Scenario: Respaldo en otro idioma

- **WHEN** no hay texto en español pero sí en inglés
- **THEN** el bloque muestra el texto en inglés indicando que está en inglés

#### Scenario: Título del artículo distinto del nombre

- **WHEN** el artículo se titula "Música culta" y el género se muestra como "música clásica"
- **THEN** la atribución nombra el título del artículo

#### Scenario: Género sin texto

- **WHEN** el género no tiene texto en ningún idioma
- **THEN** el Resumen no muestra el bloque

### Requirement: Relleno de textos de géneros

El sistema SHALL ofrecer un script de relleno que sincronice los géneros de estilo con `wikidata_id` ordenados por
cantidad de álbumes descendente, que omita los que estén vigentes, admita `--limit`, `--dry-run` y `--force` (con
`--slug` para un solo género) y que pueda interrumpirse y reanudarse sin repetir trabajo. SHALL ejecutarse como un solo
proceso para respetar la cola serial del cliente de Wikimedia.

#### Scenario: Reanudar

- **WHEN** el relleno se interrumpe tras 300 géneros y se vuelve a ejecutar
- **THEN** continúa con los géneros pendientes sin repetir los 300 vigentes

#### Scenario: Simulación

- **WHEN** se ejecuta con `--dry-run`
- **THEN** informa lo que sincronizaría y no escribe en la base

