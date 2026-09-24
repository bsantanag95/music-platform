## MODIFIED Requirements

### Requirement: Carga progresiva de carátulas
La discografía SHALL incluir, por cada `releaseGroup`, su carátula conocida y si su carátula está resuelta. Una carátula está resuelta cuando su URL es conocida, cuando su ausencia fue confirmada dentro de la ventana de reintento de negativos o cuando fue retirada. La aplicación SHALL renderizar en la carga inicial la carátula (o el fallback visual de álbum sin carátula) de los `releaseGroup` resueltos, sin requests por carátula desde el cliente. Solo para los `releaseGroup` no resueltos, la aplicación SHALL cargar la carátula después del render inicial mediante el endpoint cover-only (`GET /api/catalog/release-group/{id}/cover`), que resuelve la carátula sin ingerir el tracklist del álbum, SHALL mostrar un estado de carga accesible, SHALL reintentar de forma limitada los fallos transitorios y SHALL usar un fallback visual estable cuando no exista carátula o se agoten los reintentos.

#### Scenario: Carátula con URL conocida
- **WHEN** la discografía incluye un `releaseGroup` con URL de carátula conocida
- **THEN** la tarjeta muestra la miniatura desde la carga inicial, sin skeleton y sin consultar el endpoint cover-only

#### Scenario: Ausencia confirmada o carátula retirada
- **WHEN** la discografía incluye un `releaseGroup` cuya ausencia de carátula fue confirmada dentro de la ventana de reintento de negativos, o cuya carátula fue retirada
- **THEN** la tarjeta muestra el fallback visual estable desde la carga inicial, sin consultar el endpoint cover-only

#### Scenario: Negativo vencido se re-resuelve
- **WHEN** la discografía incluye un `releaseGroup` sin carátula cuya última confirmación de ausencia está fuera de la ventana de reintento
- **THEN** la tarjeta resuelve la carátula después del render inicial mediante el endpoint cover-only

#### Scenario: Carátula disponible
- **WHEN** el `releaseGroup` no está resuelto, el endpoint cover-only devuelve una carátula válida y la imagen carga
- **THEN** la tarjeta reemplaza su skeleton por la miniatura devuelta por el backend sin bloquear la carga inicial del perfil

#### Scenario: Fallo transitorio de consulta
- **WHEN** la consulta cover-only falla de forma transitoria
- **THEN** la tarjeta conserva un estado accesible durante como máximo dos reintentos con backoff y no crea un bucle de requests

#### Scenario: Fallo definitivo de imagen
- **WHEN** la URL recibida existe pero la imagen falla después del máximo de reintentos
- **THEN** la tarjeta muestra un placeholder accesible y el resto de la discografía permanece usable

#### Scenario: Carátula ausente
- **WHEN** el endpoint cover-only devuelve `cover: null`
- **THEN** la tarjeta muestra inmediatamente un fallback visual estable y conserva su enlace al álbum
