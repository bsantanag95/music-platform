## ADDED Requirements

### Requirement: Grupos de créditos largos plegados

En el bloque Créditos de esta grabación, los grupos Producción, Sonido y Otros con más de 6
personas (contando a los asistentes) SHALL mostrarse plegados, con un chevron, su nombre y
un resumen con la cantidad, los tres primeros nombres y "y N más", como los niveles de la
pestaña Créditos del álbum; al desplegarlos SHALL verse las mismas filas que hoy. Los
grupos de 6 personas o menos y el grupo Intérpretes SHALL mostrarse siempre abiertos. El
control "+N asistentes" SHALL llevar el chevron común.

#### Scenario: Sonido con 10 personas

- **WHEN** una grabación tiene 10 personas en Sonido
- **THEN** el grupo aparece plegado con "10 · Serban Ghenea, David Hart, Jack Antonoff y
  7 más", y al desplegarlo muestra sus filas

#### Scenario: Producción con 3 personas

- **WHEN** una grabación tiene 3 personas en Producción
- **THEN** el grupo se muestra abierto, sin resumen

#### Scenario: Muchos intérpretes

- **WHEN** una grabación tiene 8 intérpretes
- **THEN** Intérpretes se muestra abierto
