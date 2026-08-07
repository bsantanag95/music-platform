# catalog-album

Delta para el detalle público de álbum en el catálogo navegable.

## MODIFIED Requirements

### Requirement: Carátula y fallback

La vista SHALL usar únicamente la carátula miniatura proporcionada por el backend y SHALL mostrar un fallback visual localizado cuando no exista. La carátula proviene de la resolución cacheada a nivel de release-group (`cover_thumb_url`), no se arma desde el MBID de una release concreta, por lo que un álbum oficial con portada la muestra sin importar qué edición se ingirió.

#### Scenario: Carátula disponible

- **WHEN** el detalle devuelve una URL de carátula del release-group
- **THEN** la vista muestra la imagen mediante el componente centralizado de carátulas

#### Scenario: Carátula ausente

- **WHEN** el detalle no devuelve carátula
- **THEN** la vista muestra un placeholder accesible y el tracklist permanece disponible

#### Scenario: Álbum oficial cuya edición ingerida no porta la carátula

- **WHEN** el álbum tiene carátula en Cover Art Archive pero la edición ingerida no es la que carga el arte
- **THEN** la vista muestra la carátula del release-group, sin 404 en el navegador
