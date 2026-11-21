## MODIFIED Requirements

### Requirement: Navegación rápida de Explorar

La vista `/explore` SHALL mostrar, bajo el título, una fila de enlaces ("En esta página") con un enlace por cada
sección que se renderiza, en el mismo orden de la página, cada uno hacia el ancla de su sección: `colecciones`,
`popular`, `generos`, `decadas`, `novedades`, `proximos`, `premios`, `salon-de-la-fama` y `mejor-valorados`. La fila SHALL NOT
enlazar a una sección omitida y SHALL omitirse por completo cuando se rendericen menos de 4 secciones. La fila SHALL
quedar fija bajo la cabecera global mientras se recorre la portada, sin tapar el título de la sección a la que se salta, y SHALL
marcar como actual (`aria-current`) el enlace de la sección que está a la vista. Sin JavaScript, la fila SHALL seguir funcionando como
enlaces a las anclas, sin sección marcada. En pantallas angostas la fila SHALL desplazarse en horizontal y SHALL mantener visible el
enlace marcado. Las etiquetas SHALL ser cortas y estar en el locale activo.

#### Scenario: Fila con todas las secciones

- **WHEN** `/es/explore` renderiza las 9 secciones
- **THEN** la fila muestra "Colecciones, Popular, Géneros, Décadas, Novedades, Próximos, Premios, Salón de la Fama, Mejor valorados",
  cada una enlazada a su ancla

#### Scenario: Sección omitida

- **WHEN** Novedades y Próximos lanzamientos no tienen contenido
- **THEN** la fila no los incluye y ninguno de sus enlaces apunta a un ancla inexistente

#### Scenario: Pocas secciones

- **WHEN** `/explore` renderiza solo 3 secciones
- **THEN** la fila de navegación rápida no aparece

#### Scenario: Salto a una sección

- **WHEN** una persona activa "Premios" en la fila
- **THEN** la página se desplaza a la sección Premios sin que el encabezado global ni la fila fija tapen su título

#### Scenario: La fila acompaña al bajar

- **WHEN** una persona baja hasta la sección Décadas
- **THEN** la fila sigue visible bajo la cabecera global y el enlace "Décadas" está marcado como actual

#### Scenario: Sin JavaScript

- **WHEN** la portada de Explorar se carga sin JavaScript
- **THEN** la fila muestra los enlaces a las anclas y ninguno aparece marcado
