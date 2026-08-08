## MODIFIED Requirements

### Requirement: Carga progresiva de carátulas
La aplicación SHALL cargar cada carátula después del render inicial mediante el endpoint cover-only
del `releaseGroup` (`GET /api/catalog/release-group/{id}/cover`), que resuelve la carátula sin
ingerir el tracklist del álbum, SHALL mostrar un estado de carga accesible, SHALL reintentar de
forma limitada los fallos transitorios y SHALL usar un fallback visual estable cuando no exista
carátula o se agoten los reintentos.

#### Scenario: Carátula disponible
- **WHEN** el endpoint cover-only devuelve una carátula válida y la imagen carga
- **THEN** la tarjeta reemplaza su skeleton por la miniatura devuelta por el backend sin bloquear
  la carga inicial del perfil

#### Scenario: Fallo transitorio de consulta
- **WHEN** la consulta cover-only falla de forma transitoria
- **THEN** la tarjeta conserva un estado accesible durante como máximo dos reintentos con backoff
  y no crea un bucle de requests

#### Scenario: Fallo definitivo de imagen
- **WHEN** la URL recibida existe pero la imagen falla después del máximo de reintentos
- **THEN** la tarjeta muestra un placeholder accesible y el resto de la discografía permanece usable

#### Scenario: Carátula ausente
- **WHEN** el endpoint cover-only devuelve `cover: null`
- **THEN** la tarjeta muestra inmediatamente un fallback visual estable y conserva su enlace al álbum
