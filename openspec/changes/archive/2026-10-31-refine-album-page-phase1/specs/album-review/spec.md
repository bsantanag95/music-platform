## ADDED Requirements

### Requirement: Cabecera del índice de reseñas del álbum

El índice de reseñas de la pestaña Reseñas SHALL conservar su título para lectores de
pantalla sin mostrarlo. El control de orden SHALL mostrarse solo cuando el álbum tiene al
menos dos reseñas visibles; con menos, no hay nada que ordenar.

#### Scenario: Una sola reseña

- **WHEN** el álbum tiene una reseña visible
- **THEN** la pestaña muestra la reseña sin control de orden

#### Scenario: Varias reseñas

- **WHEN** el álbum tiene tres reseñas visibles
- **THEN** la pestaña ofrece el orden Más recientes, Mejor nota y Peor nota
