# Delta: catalog-search

## MODIFIED Requirements

### Requirement: Estados de búsqueda
La interfaz SHALL mostrar un estado de carga mientras la búsqueda está pendiente y SHALL deshabilitar el envío durante esa operación. SHALL mostrar un mensaje neutro de consulta durante la carga y SHALL mostrar el aviso de primera importación únicamente cuando la solicitud supere el umbral de duración definido (~3s).

#### Scenario: Búsqueda en progreso
- **WHEN** la solicitud todavía no terminó
- **THEN** el botón de búsqueda queda deshabilitado y la interfaz muestra un mensaje contextual de carga neutro, sin afirmar que ocurre una primera importación

#### Scenario: Búsqueda lenta por primera importación
- **WHEN** la solicitud supera el umbral de duración (~3s) sin terminar
- **THEN** la interfaz muestra además el aviso de que puede tratarse de una primera importación

#### Scenario: Artista ya cacheado
- **WHEN** la solicitud termina antes de superar el umbral de duración
- **THEN** nunca se muestra el aviso de primera importación
