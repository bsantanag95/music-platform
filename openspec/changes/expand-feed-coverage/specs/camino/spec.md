## ADDED Requirements

### Requirement: Entradas de feed de un Camino propio
Crear un Camino y completarlo SHALL generar entradas propias en el feed de actividad de los
seguidores (capability `activity-feed`, `kind = "camino"`), distintas de los eventos de lista, de
los que el Camino sigue excluido. Ambas SHALL respetar la audiencia del Camino (`followers` o
`public`), su moderación y su archivado. El completado SHALL derivarse en lectura con el mismo
criterio de progreso del Camino, sin persistir estado. Activar el seguimiento de progreso sobre
un Camino o una lista ajena NO SHALL generar ninguna entrada de feed: sigue siendo una decisión
privada de quien trackea.

#### Scenario: Crear un Camino visible
- **WHEN** el dueño crea un Camino con audiencia `public`
- **THEN** sus seguidores ven una entrada "creó un Camino" enlazada a la página del Camino

#### Scenario: Completar un Camino visible
- **WHEN** el dueño registra la escucha del último álbum pendiente de su Camino `followers`
- **THEN** sus seguidores ven una entrada "completó un Camino" con la fecha de esa escucha

#### Scenario: Trackear no se publica
- **WHEN** una persona activa el tracking sobre un Camino ajeno
- **THEN** ni el dueño ni nadie más ve una entrada de feed por ese gesto
