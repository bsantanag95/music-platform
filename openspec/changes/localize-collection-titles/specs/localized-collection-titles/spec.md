## ADDED Requirements

### Requirement: Título derivado por idioma

El título de una colección generada por plantilla SHALL derivarse al leer de su clave de plantilla, su clave de período y
el idioma activo (`es` o `en`), sin persistir traducciones. `user_list.title` SHALL conservarse como título canónico en
español y como respaldo, y las lecturas SHALL NOT modificarlo. Si la plantilla no existe o el período no se puede
interpretar, el sistema SHALL mostrar el título guardado en lugar de fallar.

#### Scenario: Mismo dato, dos idiomas

- **WHEN** se muestra la colección de `new-releases` en `/es/explore` y en `/en/explore`
- **THEN** el título es "Novedades esenciales" en español y "Essential new releases" en inglés

#### Scenario: Plantilla desconocida

- **WHEN** una colección del archivo pertenece a una plantilla que ya no existe
- **THEN** se muestra su título guardado

#### Scenario: Período ilegible

- **WHEN** el período de una colección no cumple el formato esperado de su plantilla
- **THEN** se muestra su título guardado y no se produce ningún error

### Requirement: Períodos con formato del idioma y año

Los títulos de colecciones con período SHALL incluir el año y mostrar el mes con el nombre del idioma: "Cumplen años en
octubre de 2026" / "Anniversaries in October 2026"; "Mejor valorados del 4.º trimestre de 2026" / "Top rated of Q4
2026"; "Lo más reseñado de octubre de 2026" / "Most reviewed in October 2026"; "Ganadores del Grammy 2025" / "Grammy
winners 2025". El título de "Para entrar a {familia}" SHALL usar el nombre de la familia de géneros del idioma
("Rock", "Hip hop", "Folk y cantautor" / "Folk and singer-songwriter").

#### Scenario: Archivo sin ambigüedad

- **WHEN** el archivo contiene "Cumplen años en octubre" de 2025 y de 2026
- **THEN** cada una se muestra con su año

#### Scenario: Familia de géneros

- **WHEN** se muestra una colección `genre-spotlight` con período `2026-W43-folk`
- **THEN** el título nombra la familia en el idioma activo

### Requirement: Una sola derivación en todas las superficies

Toda superficie que muestre el título de una colección generada SHALL usar el título localizado: las tarjetas del rail
de Explorar, la página de colecciones, el archivo, el detalle de la colección, el panel "Destacadas en Explorar" de la
consola, la lista de listas guardadas y la pestaña de listas del perfil de la cuenta curadora. Las listas que no son
colecciones generadas SHALL conservar su título tal como lo escribió quien las creó.

#### Scenario: Consola en inglés

- **WHEN** una persona abre `/en/admin` y el panel de destacadas
- **THEN** las colecciones generadas se listan con su título en inglés

#### Scenario: Guardadas

- **WHEN** una persona con la interfaz en inglés guardó una colección generada
- **THEN** su lista de guardadas la muestra con el título en inglés y enlaza a la ruta de colecciones

#### Scenario: Lista personal intacta

- **WHEN** se muestra una lista creada por una persona
- **THEN** su título se muestra tal cual, sin derivación
