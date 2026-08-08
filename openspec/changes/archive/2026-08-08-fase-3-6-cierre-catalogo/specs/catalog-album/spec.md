## MODIFIED Requirements

### Requirement: Carátula y fallback
La vista SHALL usar únicamente la carátula miniatura proporcionada por el backend y SHALL mostrar
un fallback visual localizado cuando no exista o cuando la carga de la imagen falle después de
un máximo de dos reintentos con backoff. La carátula proviene de la resolución cacheada a nivel
de release-group (`cover_thumb_url`), no se arma desde el MBID de una release concreta, por lo
que un álbum oficial con portada la muestra sin importar qué edición se ingirió. Un fallo de
carátula no SHALL impedir mostrar el tracklist ni la navegación.

#### Scenario: Carátula disponible
- **WHEN** el detalle devuelve una URL de carátula del release-group y la imagen carga
- **THEN** la vista muestra la imagen mediante el componente centralizado de carátulas

#### Scenario: Carátula ausente
- **WHEN** el detalle no devuelve carátula
- **THEN** la vista muestra un placeholder accesible y el tracklist permanece disponible

#### Scenario: Error transitorio de imagen
- **WHEN** la imagen de carátula falla durante la carga
- **THEN** la vista conserva un estado accesible, reintenta como máximo dos veces con backoff y no
  repite requests indefinidamente

#### Scenario: Fallo definitivo de imagen
- **WHEN** la imagen falla después de agotar los reintentos
- **THEN** la vista muestra el placeholder localizado y mantiene visible el tracklist completo

#### Scenario: Álbum oficial cuya edición ingerida no porta la carátula
- **WHEN** el álbum tiene carátula en Cover Art Archive pero la edición ingerida no es la que carga
  el arte
- **THEN** la vista muestra la carátula del release-group, sin 404 en el navegador
