## Why

El menú "…" de acciones por disco (`add-discography-quick-actions`) solo existe en la
discografía del artista. En las otras superficies donde se descubren álbumes —los resultados de
búsqueda (el flujo canónico del producto), Explorar, las listas de otras personas y la tira de la
discografía en la página del álbum— hay que entrar a cada álbum para registrar una escucha o
guardarlo en Pendiente. Explorar ya tiene un menú "···" propio más antiguo, con favorito y
Pendiente sin estado visible, distinto del nuevo. Además, la tabla de la discografía ordena solo
por año; no hay forma de ver "lo mejor valorado de la banda" o "lo que más me gustó".

## What Changes

- **El mismo menú "…" en cuatro superficies más**: resultados de búsqueda de álbumes, tarjetas de
  Explorar, discos de una lista ajena (sus tres vistas) y la tira de la discografía en el álbum.
  El menú es el mismo componente, con las mismas acciones y la misma accesibilidad.
- **Marcas bajo demanda**: fuera de la discografía, el menú pide las marcas del disco al abrirse
  con un endpoint nuevo `GET /api/me/release-groups/{id}/marks`, en vez de sumar consultas a cada
  página. Mientras carga, el menú lo indica sin mover su contenido.
- **Explorar unifica su menú**: la tarjeta de álbum reemplaza su menú "···" por el nuevo, y conserva
  lo que solo tenía el anterior: "Ver en listas" y las acciones de colección "Lo busco" y "Ya la
  tengo" (el spec `collection-wishlist` las exige en el menú de la ficha de álbum).
- **Orden por columnas en la tabla de la discografía**: Año, Media y Tú como encabezados que
  ordenan ascendente o descendente, con el orden anunciado a los lectores de pantalla.

## Capabilities

### New Capabilities

- `album-quick-actions`: el menú de acciones por disco fuera de la discografía, con marcas bajo
  demanda y su endpoint.

### Modified Capabilities

- `artist-discography-view`: la tabla se puede ordenar por año, media y tu nota.

## Impact

- **API**: `GET /api/me/release-groups/{id}/marks` (requiere sesión) en
  `docs/04-api/contracts.md` y `errors.md`.
- **Servicios**: lectura de las marcas de un disco (reutiliza las consultas por lote de
  `getDiscographyMarks` con un solo id).
- **Componentes**: `DiscographyItemMenu` pasa a ser compartido (marcas precargadas o bajo
  demanda, secciones extra opcionales); `AlbumResults`, `AlbumCard`, las vistas de lista
  (`ItemsIndex`, `ItemsGraphic`, `ItemsDetailed`) y `DiscographyStrip` lo integran;
  `ArtistDiscography` suma el orden de la tabla.
- **Mensajes**: es y en.
- **Docs**: `docs/05-features/catalog-browsing.md` y la sección de listas y Explorar que corresponda.
