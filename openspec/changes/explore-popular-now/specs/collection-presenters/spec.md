## ADDED Requirements

### Requirement: Presentador de lo más popular del mes

El presentador de `popular-month` SHALL resumir el mes de su período, SHALL numerar los discos y SHALL describir cada disco con su
número de personas del mes ("12 personas") solo cuando alcanza 5; por debajo el disco SHALL ir sin cartela. Si el período no se puede
interpretar, SHALL abstenerse.

#### Scenario: Personas del mes

- **WHEN** un disco tuvo 12 personas distintas con algún gesto en el mes
- **THEN** su cartela dice "12 personas"

#### Scenario: Pocas personas

- **WHEN** un disco tuvo 3 personas en el mes
- **THEN** aparece numerado sin cartela

#### Scenario: Período ilegible

- **WHEN** el período de la colección no es un mes válido
- **THEN** el presentador se abstiene y la colección cae al presentador de su familia

## REMOVED Requirements

### Requirement: Presentador de lo más reseñado del mes

**Reason**: La plantilla `most-reviewed-month` se retira; la reemplaza `popular-month`, que mide todos los gestos de la comunidad y no
solo las reseñas.
**Migration**: Ver "Presentador de lo más popular del mes". Las colecciones archivadas de `most-reviewed-month` se muestran con el
presentador de su familia (comportamiento de una plantilla retirada).
