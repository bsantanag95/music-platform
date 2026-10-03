# genre-search Specification

## Purpose
Búsqueda pública de géneros por nombre (español o inglés, sin acentos ni mayúsculas) sobre la taxonomía, usada por el selector de géneros de la identidad musical.
## Requirements
### Requirement: Búsqueda de géneros

El sistema SHALL ofrecer `GET /api/genres/search?q=` público, que devuelve géneros de estilo visibles cuyo nombre en
español o en inglés contiene el texto sin distinguir mayúsculas ni tildes. El texto SHALL tener entre 1 y 60 caracteres;
vacío devuelve los 12 géneros más usados. El resultado SHALL ordenar coincidencia exacta, prefijo y resto y, dentro de
cada grupo, por uso y luego por nombre, con un máximo de 20. Los descriptores y los ocultos SHALL NOT aparecer. Un texto
inválido SHALL responder `400 VALIDATION_ERROR`.

#### Scenario: Buscar sin tildes

- **WHEN** un cliente busca `psicodelico`
- **THEN** el resultado incluye "rock psicodélico" y "psychedelic rock"

#### Scenario: Búsqueda vacía

- **WHEN** un cliente busca con el texto vacío
- **THEN** recibe los 12 géneros más usados

#### Scenario: Descriptor excluido

- **WHEN** un cliente busca `instrumental`
- **THEN** el género descriptor "instrumental" no aparece en el resultado

### Requirement: Selector de géneros

El editor de "Géneros que me mueven" SHALL ofrecer un buscador con resultados navegables con teclado, que permite agregar
hasta 5 géneros, ver los elegidos como chips que se pueden quitar y un contador "n de 5". Con el campo vacío SHALL
ofrecer los géneros más usados. Al llegar a 5 SHALL impedir agregar más hasta quitar uno.

#### Scenario: Buscar y agregar

- **WHEN** la persona escribe "shoe" y elige "shoegaze"
- **THEN** el género queda entre los elegidos y el contador aumenta

#### Scenario: Máximo

- **WHEN** ya hay 5 géneros elegidos
- **THEN** los resultados no se pueden agregar hasta quitar uno

