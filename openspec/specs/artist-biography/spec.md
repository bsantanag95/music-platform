# artist-biography Specification

## Purpose
Mostrar en la pestaña Biografía la introducción completa del artículo de Wikipedia del artista, sin modificarla, con enlace al artículo y la atribución de su licencia.
## Requirements
### Requirement: Pestaña Biografía

La pestaña Biografía SHALL mostrar la introducción completa del artículo de Wikipedia del
artista en el idioma de la interfaz (o en el otro idioma, indicándolo), en párrafos, seguida
de un enlace "Leer el artículo completo en Wikipedia" y de la atribución "Fuente: Wikipedia ·
CC BY-SA 4.0" con enlaces al artículo y a la licencia. La pestaña SHALL NOT modificar ni
traducir el texto.

#### Scenario: Biografía en español

- **WHEN** una persona abre la pestaña Biografía de Pink Floyd en español
- **THEN** ve la introducción completa del artículo en español, el enlace al artículo y la
  atribución

#### Scenario: Biografía en otro idioma

- **WHEN** una persona abre en inglés la pestaña Biografía de un artista que solo tiene
  artículo en español
- **THEN** ve la introducción en español con la indicación de su idioma

### Requirement: Resumen sin repetir en Biografía

Con la pestaña Biografía activa, la cabecera del artista SHALL NOT mostrar el resumen de la biografía ni su enlace
"Seguir leyendo", porque la pestaña ya muestra el texto completo. En las demás pestañas la cabecera SHALL seguir
mostrándolos.

#### Scenario: Pestaña Biografía

- **WHEN** una persona abre la pestaña Biografía de Iron Maiden
- **THEN** el primer párrafo aparece una sola vez, en la pestaña, y la cabecera no tiene "Seguir leyendo"

#### Scenario: Pestaña Discografía

- **WHEN** una persona vuelve a Discografía
- **THEN** la cabecera muestra otra vez el resumen con "Seguir leyendo"

