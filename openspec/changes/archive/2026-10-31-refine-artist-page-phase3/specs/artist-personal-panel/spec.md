## ADDED Requirements

### Requirement: Valoraciones en el panel del artista

El panel "Tu relación" SHALL tener una fila **Valoraciones** con cuántos discos de la discografía propia del artista
valoró el usuario y la media de sus estrellas ("5 discos · media 4,3"), o "Ningún disco valorado". La fila SHALL NOT
mostrar el total de la discografía (regla de recorridos: nunca "N de M" fuera de su gestión). Con al menos una
valoración, la acción **"Ver sin valorar →"** SHALL activar el filtro "Sin valorar" de la discografía y llevar la vista
a ella; desde otra pestaña SHALL abrir la Discografía con el filtro activo.

#### Scenario: Usuario con valoraciones

- **WHEN** un usuario que valoró 5 discos de Iron Maiden con media 4,3 abre el artista
- **THEN** el panel dice "Valoraciones: 5 discos · media 4,3" con "Ver sin valorar →"

#### Scenario: Ver sin valorar desde Biografía

- **WHEN** el usuario pulsa "Ver sin valorar" en la pestaña Biografía
- **THEN** se abre la Discografía con "Sin valorar" activo
