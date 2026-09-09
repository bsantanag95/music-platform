## ADDED Requirements

### Requirement: Página de canción mínima liderada por el álbum

La página de detalle de canción SHALL ser **ligera**: SHALL NOT montar el bloque social
completo de reseñas y rating de estrellas como acción primaria. SHALL presentar, en este
orden de prominencia: el título y el artista acreditado; **el o los álbumes que contienen
la canción** como primera sección de contenido (carátula, título y año, enlazando al
álbum); las acciones de catálogo (registrar escucha, marcar favorito, agregar a lista); y
luego las secciones de comunidad y la ficha técnica. La lista completa de créditos y de
apariciones por edición SHALL presentarse como material secundario ("ficha técnica"), no
como foco de la página.

#### Scenario: El álbum contenedor es lo primero que se ve

- **WHEN** una persona abre la página de una canción que aparece en al menos un álbum
- **THEN** ve el o los álbumes contenedores como primera sección de contenido, con enlace
  a cada álbum, antes de créditos, apariciones y comunidad

#### Scenario: Canción en varias ediciones

- **WHEN** una canción aparece en varias ediciones de uno o más álbumes
- **THEN** la página muestra los álbumes (release-groups) distintos que la contienen,
  ordenados por fecha de primer lanzamiento, y marca el más temprano como aparición
  principal; la lista exhaustiva de ediciones queda en la ficha técnica

#### Scenario: La canción no tiene bloque de reseñas

- **WHEN** un usuario autenticado abre una página de canción
- **THEN** no hay editor de reseña ni de rating de estrellas como acción primaria; la
  expresión primaria disponible es registrar la escucha con una reacción

### Requirement: Reacción cualitativa primaria, estrellas secundarias en canción

En la página de canción, la **reacción cualitativa** (`liked` / `loved` / `obsessed` /
`neutral` / `disliked`), que se registra al anotar una escucha en el diario, SHALL ser la
forma primaria de expresar la relación con la canción. El **rating de estrellas** de la
canción SHALL ofrecerse solo detrás de una divulgación ("más") colapsada por defecto,
ubicada después de la reacción de la comunidad. Si el usuario ya tiene un rating de
estrellas sobre esa canción, la divulgación SHALL abrirse mostrando ese valor (no ocultar
un dato existente). Guardar o borrar el rating desde la divulgación SHALL usar el mismo
contrato de rating de `recording` que ya existe.

#### Scenario: Estrellas ocultas por defecto

- **WHEN** un usuario que nunca valoró la canción abre su página
- **THEN** el control de estrellas no está visible; hay una divulgación "más" que lo revela
  al abrirla

#### Scenario: Estrellas visibles si ya existen

- **WHEN** un usuario que ya puso estrellas a la canción abre su página
- **THEN** la divulgación aparece abierta con su valoración vigente y puede modificarla o
  borrarla

#### Scenario: La reacción se registra desde el diario

- **WHEN** el usuario quiere expresar "obsessed" con una canción
- **THEN** lo hace al registrar una escucha (acción primaria de la página), no mediante un
  control de rating

### Requirement: Reacción agregada pública de la canción

La página de canción SHALL mostrar un resumen de las reacciones **públicas** que la
comunidad registró sobre la canción: el total de personas y la reacción predominante,
presentado con lenguaje cultural, SHALL NOT mostrar porcentajes, gráficos ni rachas. El
resumen SHALL derivarse únicamente de entradas de diario con audiencia `public` y reacción
no nula. Cuando no hay ninguna, la sección SHALL NOT renderizarse.

#### Scenario: Hay reacciones públicas

- **WHEN** varias personas registraron públicamente una escucha de la canción con reacción
- **THEN** la página muestra cuántas fueron y cuál reacción predomina, sin porcentajes ni
  gráfico

#### Scenario: Sin reacciones públicas

- **WHEN** ninguna entrada pública de diario sobre la canción tiene reacción
- **THEN** la sección de reacción de la comunidad no aparece

#### Scenario: Las entradas privadas no cuentan

- **WHEN** las únicas reacciones a la canción están en entradas de diario `private` o
  `followers`
- **THEN** no alimentan el agregado público

### Requirement: Historial de escuchas propio en la canción

Para un usuario autenticado con al menos una escucha propia registrada de la canción, la
página SHALL mostrar un historial compacto de esas escuchas: fecha, contexto de escucha y
reacción propia, con enlace al diario. Para un visitante sin sesión o sin escuchas de esa
canción, la sección SHALL NOT renderizarse.

#### Scenario: Usuario con historial

- **WHEN** un usuario que registró tres escuchas de la canción abre su página
- **THEN** ve esas tres escuchas con su fecha, contexto y reacción, y un enlace a su diario

#### Scenario: Usuario sin historial

- **WHEN** un usuario que nunca registró esa canción abre su página
- **THEN** no ve una sección de historial vacía
