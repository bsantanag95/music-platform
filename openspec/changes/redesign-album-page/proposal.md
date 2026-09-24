## Why

La página de álbum se siente como una pantalla de acciones, no como una ficha de catálogo:
siete botones apilados en columna, la valoración y las reseñas al pie mezcladas con los
comentarios, una tracklist que trunca títulos y ningún dato de la comunidad más allá del
rating. Queremos que Artista → Álbum → Canción se lea como una **biblioteca** (inspiración
Metal-Archives: ficha técnica densa, todo enlazado, contenido separado por tipo) con la
capa personal de Letterboxd. Empezamos por el álbum porque es la unidad cultural central
(`docs/00-product/content-hierarchy.md`) y define los componentes que luego reutilizan
Canción y Artista.

Este cambio es la **fase 1: layout con los datos que ya existen**. El enriquecimiento del
catálogo (sello, género, créditos de personal, resumen de todas las ediciones) es un cambio
separado; el layout deja huecos pensados para esos datos, pero nunca renderiza filas vacías.

## What Changes

- **Estructura nueva de la página** (híbrido de las variantes A y B exploradas):
  cabecera con carátula (tope 250 px por licencia), ficha técnica y bloque de comunidad; a
  su lado el panel **"Tu relación"**, que termina donde empiezan las pestañas; debajo,
  pestañas a ancho completo **Canciones · Créditos · Ediciones · Reseñas (N)**; la franja
  de discografía (anterior / siguiente) y los **comentarios fuera de las pestañas, al
  final**. Sin pestaña "Notas adicionales".
- **Pestañas con URL propia** (enlazables, con historial y visibles para buscadores);
  Canciones es siempre la pestaña por defecto; solo Reseñas muestra contador.
- **Ficha técnica**: el tipo de obra se muestra siempre como antetítulo (incluido "Álbum de
  estudio"); todos los artistas principales con su `joinPhrase`; lanzamiento con la
  precisión conocida; duración total; fila **Edición** con la edición representativa y
  acceso a la pestaña Ediciones. Solo se pintan filas con datos.
- **Bloque de comunidad**: media en estrellas + puntaje detallado, cantidad de valoraciones
  y de reseñas, histograma de distribución, "lo coleccionan", "lo buscan" y "en N listas",
  con **umbral mínimo de 5** para medias, histograma y conteos de colección.
- **Panel "Tu relación"** que muestra **estado en vez de botones** (tu nota, tu reseña, N
  escuchas y la última, favorito, "Lo tienes · formato", "En N de tus listas"), con estados
  anónimo / sin interacción / con interacción. **La valoración propia sube a la cabecera**
  (hoy vive al pie, en `SocialSection`).
- **Nombres sin ambigüedad**: "Quiero escuchar" pasa a **"Pendiente"** y la wishlist física
  ("Lo quiero") pasa a **"En tu búsqueda"**; la comunidad lee "lo coleccionan / lo buscan".
- **Pestaña Canciones**: títulos que hacen salto de línea (sin truncar); subtotal por disco
  y total con "≥" cuando falta alguna duración; artista de la pista cuando difiere del
  álbum; etiqueta de variante (en vivo, remix, regrabación) con enlace a la original; marca
  de **favorita de la comunidad** (en lugar de una media por pista); **tu estado por pista
  siempre visible**; menú `···` ordenado por el Modelo C (escucha y reacción primero).
- **Pistas adicionales de otras ediciones** al pie de la pestaña Canciones: una sección
  desplegable por variante (edición o grupo de ediciones con la misma lista), **todas
  contraídas por defecto**, con encabezado que identifica la edición (nombre, año, sello,
  formato, cantidad de ediciones) y una frase fija que aclara que no forman parte del
  álbum original. Solo muestran las pistas que la variante agrega. Las cajas se rotulan
  aparte y enlazan a MusicBrainz sin desplegar la lista. No hay páginas por edición.
- **Pestaña Créditos** (no "Formación"): solo personas acreditadas en el disco, en cuatro
  niveles — **Integrantes de la banda** (destacados; acreditados y miembros del artista
  principal), **Músicos invitados**, **Producción y sonido**, **Arte y otros**
  (contraído). No hay formación calculada por fechas: nadie aparece sin crédito.
- **Pestaña Ediciones**: tabla de ediciones (año, país, formato, sello · catálogo, pistas,
  enlace a MusicBrainz) con filtro por formato, solo oficiales por defecto, la edición
  mostrada marcada y una marca "+N pistas" que lleva a su sección en Canciones.
- **Reseñas como índice + modal con URL propia**: la pestaña lista título (o extracto del
  cuerpo), nota, autor y fecha, ordenable; al abrir una reseña se intercepta
  `/review/{id}` como modal; la misma URL abierta directamente es una página completa.
- **Comentarios y reseñas quedan separados estructuralmente** (Opinión ≠ conversación).

## Capabilities

### New Capabilities

- `album-page-layout`: estructura de la página de álbum — zonas de la cabecera, pestañas
  con URL, pestaña por defecto, contadores, posición de la discografía y de los
  comentarios, comportamiento en móvil.
- `album-community-stats`: agregados de comunidad del álbum (media, puntaje detallado,
  histograma, conteos de valoraciones, reseñas, colección, búsqueda y listas) con umbrales
  mínimos y reglas de anonimato.
- `album-personal-panel`: panel "Tu relación" — estado personal del usuario sobre el álbum,
  sus tres estados y las acciones que cuelga de cada línea.
- `review-detail`: página dedicada de una reseña en `/review/{id}` y su presentación como
  modal interceptado desde el índice de reseñas del álbum.

### Modified Capabilities

- `catalog-album`: tipo de obra siempre visible; varios artistas principales en el
  read-model; ficha técnica con fila de edición; subtotales por disco y total con "≥";
  títulos sin truncar; artista de la pista cuando difiere; variantes; favorita de la
  comunidad y estado personal por pista; menú de pista; pistas adicionales de otras
  ediciones; pestañas Créditos y Ediciones; reseñas como índice en pestaña y comentarios
  al final.
- `want-to-listen`: la acción se presenta como "Pendiente" dentro del panel "Tu relación".
- `collection-wishlist`: la wishlist se presenta como "En tu búsqueda" y participa de forma
  anónima en el conteo agregado "lo buscan", con umbral.
- `physical-collection`: la colección participa de forma anónima en el conteo agregado
  "lo coleccionan", con umbral.

## Impact

- **Páginas y componentes**: `src/app/[locale]/(catalog)/album/[id]/page.tsx` (reescritura
  del layout), `TrackList`, `SocialSection`/`DualRating`/`Reviews`/`Comments` (se separan
  por zona), botones de acción (`MarkAsListened`, `FavoriteButton`, `WantToListenButton`,
  `AddToListButton`, `ShowInListsButton`, `CollectionAlbumAction`) absorbidos por el panel.
- **Rutas nuevas**: `/{locale}/review/[id]` y su variante interceptada desde el álbum
  (rutas paralelas + interceptadas de Next); ruta o parámetro por pestaña.
- **Servicios / consultas nuevas** (sin cambios de esquema previstos): agregados de
  comunidad por álbum (histograma, colección, wishlist, listas), favoritas de la comunidad
  por pista (reacciones fuertes), estado personal por pista (escuchas del usuario), todos
  los créditos `primary` del release-group.
- **API**: si el endpoint `GET /api/catalog/release-group/{id}` expone los artistas
  principales, `docs/04-api/contracts.md` se actualiza en el mismo cambio.
- **i18n**: namespaces `album`, `wantToListen`, `collection` (nuevas etiquetas y renombres).
- **Docs**: `docs/05-features/catalog-browsing.md`, `ratings-and-reviews.md`,
  `physical-collection.md`, `lists-and-favorites.md` (nombres) y
  `docs/01-domain/business-rules.md` (umbrales y anonimato de agregados).
- **Depende de un cambio de datos aparte** (dos partes: *ediciones* — browse de
  releases por release-group con sellos, formatos y catálogo, y agrupación de variantes
  con pistas adicionales; *créditos* — relaciones de personal en una tabla nueva). Este
  cambio se puede implementar antes: Créditos, Ediciones, la fila Sello y las pistas
  adicionales simplemente no se muestran mientras no haya datos.
- **Fuera de alcance**: la ingesta de esos datos (cambio aparte), género, numeración de
  vinilo, créditos de composición (nivel obra), páginas por edición, páginas de Canción y
  Artista.
