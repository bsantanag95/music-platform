# Delta: catalog-artist

## MODIFIED Requirements

### Requirement: Carga progresiva de carátulas

La aplicación SHALL cargar cada carátula después del render inicial mediante el endpoint cover-only del `releaseGroup` (`GET /api/catalog/release-group/{id}/cover`), que resuelve la carátula sin ingestar el tracklist del álbum, SHALL mostrar un estado de carga accesible y SHALL usar un fallback cuando no exista carátula.

#### Scenario: Carátula disponible

- **WHEN** el endpoint cover-only devuelve una carátula válida
- **THEN** la tarjeta reemplaza su skeleton por la miniatura devuelta por el backend sin bloquear la carga inicial del perfil

#### Scenario: Carátula ausente o consulta fallida

- **WHEN** el endpoint cover-only no devuelve carátula o la consulta falla
- **THEN** la tarjeta muestra un fallback visual estable y el resto de la discografía permanece usable
