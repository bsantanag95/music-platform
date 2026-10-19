## MODIFIED Requirements

### Requirement: Historia de una categoría

`/{locale}/awards/{premio}/categories/{clave}` SHALL ser el historial de la categoría: bajo el título, el nombre del premio, la
cantidad de ediciones cubiertas y el rango de años; "Ganadores por año", una fila con el ganador de cada ceremonia (de la más
reciente a la más antigua) enlazada a su año en la misma página; y cada ceremonia cubierta, de la más reciente a la más antigua, con
su ganador y, cuando la cobertura es completa, sus nominados plegados, desplegados solo en la más reciente. SHALL mostrar "Los más
nominados": los artistas con al menos dos nominaciones en la categoría, con sus nominaciones (las victorias incluidas) y sus
victorias, atribuidas al artista nominado, al artista principal del álbum o la grabación o, sin sujeto del catálogo, al crédito
curado. SHALL enlazar las demás categorías del premio, en el orden de la ceremonia, y la categoría predecesora y la sucesora cuando
existan. El enlace que lleva a esta página desde la ceremonia SHALL decir "Historial de la categoría" ("Historial" en las categorías
compactas). Una clave inexistente SHALL responder como página no encontrada.

#### Scenario: Historia de Álbum del año

- **WHEN** una persona abre `/es/awards/grammy/categories/album-of-the-year`
- **THEN** ve por año, de 2026 a 2021, el ganador y los nominados de cada ceremonia, con los nominados de 2026 desplegados y los demás plegados

#### Scenario: Ganadores por año

- **WHEN** una persona abre `/es/awards/lo-nuestro/categories/album-of-the-year`
- **THEN** ve bajo el título "Premio Lo Nuestro · 6 ediciones · 2021–2026" y una fila con el ganador de cada año, y al elegir 2024 la página salta a ese año

#### Scenario: Los más nominados

- **WHEN** KAROL G fue nominada tres veces a la categoría y ganó una
- **THEN** figura en "Los más nominados" con "3 nominaciones · 1 victoria"

#### Scenario: Categoría renombrada

- **WHEN** una categoría tiene una predecesora con otro nombre
- **THEN** la página muestra "Antes llamada …" con un enlace a la historia de la predecesora
