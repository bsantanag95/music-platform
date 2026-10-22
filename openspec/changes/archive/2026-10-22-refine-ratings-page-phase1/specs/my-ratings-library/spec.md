## ADDED Requirements

### Requirement: Fallo al cambiar las estrellas desde la fila
Si guardar las estrellas desde la fila del modo Detallada falla, la fila SHALL mostrar un aviso
accesible (`role="alert"`) con el mensaje de error de guardado, SHALL conservar las estrellas
anteriores y SHALL permitir reintentar; el aviso SHALL desaparecer al reintentar. El error NO SHALL
ignorarse en silencio.

#### Scenario: Falla el guardado
- **WHEN** la persona cambia las estrellas de una fila de 4★ a 5★ y el guardado falla
- **THEN** la fila sigue mostrando 4★ y aparece el aviso "No pudimos guardar el cambio. Intenta de nuevo."

#### Scenario: Reintentar quita el aviso
- **WHEN** tras el fallo la persona vuelve a elegir estrellas
- **THEN** el aviso desaparece mientras se guarda, y reaparece solo si vuelve a fallar
