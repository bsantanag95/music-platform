## 1. Decisiones de implementación (cerrar antes de empezar)

- [x] 1.1 Mecanismo de pestañas: segmentos de ruta con layout común (`/album/[id]`, `/album/[id]/credits`, `/album/[id]/editions`, `/album/[id]/reviews`) — recomendado en design.md D3; registrar la decisión en design.md
- [x] 1.2 Franja de discografía: orden cronológico por `first_release_date`/`first_release_year` y, por defecto, solo álbumes de la misma `category` que el actual; registrar en design.md
- [x] 1.3 Bloque "En listas de la comunidad" en la página: decidir si entra en este cambio o queda solo la cifra del bloque de comunidad; registrar en design.md
- [x] 1.4 Rótulo de una variante sin nombre propio: confirmar "Edición {año} · {formato}" (depende de `enrich-album-editions-and-credits`)

## 2. Read-models y consultas

- [x] 2.1 `getAlbumDetail`: devolver todos los artistas principales del release-group (`primary`, orden y `joinPhrase`) en lugar de uno solo; mantener el fallback desde los tracks. El endpoint `GET /api/catalog/release-group/{id}` conserva su contrato (no expone artistas ni datos de variante), así que `contracts.md` no cambia
- [x] 2.2 Read-model de comunidad del álbum (separado de `getAlbumDetail`): media de estrellas y detallada, cantidad de valoraciones y de reseñas visibles, histograma por valor de estrellas (una consulta agrupada), personas distintas en colección y en wishlist, listas visibles que lo contienen
- [x] 2.3 Aplicar los umbrales de `album-community-stats` en el read-model (media e histograma desde 5 valoraciones; "menos de 5" para colección y búsqueda entre 1 y 4), no en el componente
- [x] 2.4 Favoritas de la comunidad por pista: una consulta agrupada por `recording_id` sobre reacciones `loved`/`obsessed` públicas de las grabaciones del álbum; máximo 3, umbral 5
- [x] 2.5 Estado personal del usuario: escuchas del álbum (cantidad y última fecha), escuchas por grabación del álbum (una consulta), rating y reseña propios, favorito, Pendiente, colección con formato, wishlist, cantidad de listas propias que lo contienen
- [x] 2.6 Discografía vecina del artista principal: álbumes ordenados, anterior y siguiente del actual según 1.2
- [x] 2.7 Tests unitarios de 2.1–2.6, incluidos los bordes de umbral (4 y 5 valoraciones; 0, 1 y 5 coleccionistas) y que una persona con dos copias cuenta una vez

## 3. Estructura de la página y pestañas

- [x] 3.1 Layout común del álbum con la cabecera (breadcrumb, carátula ≤ 250 px, identidad, ficha, comunidad, panel "Tu relación") renderizada una sola vez para todas las pestañas, con `await params`
- [x] 3.2 Barra de pestañas con URLs propias locale-aware, Canciones activa por defecto, contador solo en Reseñas y pestañas sin contenido ocultas (salvo Canciones y Reseñas)
- [x] 3.3 Franja de discografía y comentarios al pie, fuera de las pestañas y visibles con cualquier pestaña activa
- [x] 3.4 Quitar `SocialSection` del pie: el rating propio va al panel, el agregado a la comunidad, las reseñas a su pestaña y los comentarios al pie
- [x] 3.5 Layout móvil: orden apilado de `album-page-layout` sin scroll horizontal; ficha técnica colapsable
- [x] 3.6 Estados de carga (`loading.tsx`) y error del layout y de cada pestaña, localizados

## 4. Cabecera

- [x] 4.1 Antetítulo de tipo de obra siempre visible, incluido "Álbum de estudio" (adaptar `WorkTypeBadge` o reemplazarlo) y sus claves i18n
- [x] 4.2 Línea de artistas con todos los principales y su `joinPhrase`, cada uno enlazado
- [x] 4.3 Ficha técnica en grilla etiqueta/valor: Lanzamiento con la precisión conocida, Duración (pistas · total con "≥" si falta alguna), Edición con acceso a la pestaña Ediciones, Sello cuando exista; omitir filas sin dato
- [x] 4.4 Bloque de comunidad: cuatro cifras e histograma de ½ a 5 accesible (texto alternativo con la distribución); estados por debajo del umbral
- [x] 4.5 Tests de la cabecera: ficha sin fecha, precisión anual, álbum colaborativo, comunidad bajo y sobre el umbral

## 5. Panel "Tu relación"

- [x] 5.1 Componente del panel con los estados anónimo, sin interacción y con interacción (`album-personal-panel`)
- [x] 5.2 Valoración propia (estrellas y detallada) editable en el panel, reutilizando la lógica de `DualRating`
- [x] 5.3 Líneas de estado accionables: reseña (Escribir/Editar), escuchas (cantidad, última, Registrar), favorito, Pendiente, colección ("Lo tienes · formato"), búsqueda ("En tu búsqueda"), listas ("En N de tus listas", Añadir, Ver en listas), reutilizando `MarkAsListened`, `FavoriteButton`, `WantToListenButton`, `AddToListButton`, `ShowInListsButton` y `CollectionAlbumAction` o su lógica
- [x] 5.4 Mantener el deep-link `?collection=have|want` desde el menú de `AlbumCard`
- [x] 5.5 Versión móvil compacta (valoración, escuchas, registrar, favorito, menú `···`)
- [x] 5.6 Tests del panel: tres estados, usuario con reseña, escuchas con última fecha, anónimo sin controles de escritura

## 6. Renombres globales

- [x] 6.1 "Quiero escuchar" → "Pendiente" en `messages/{es,en}/wantToListen.json` y en cualquier otra clave que lo use (`common`, `diary`, `users`), en artista, álbum, menús rápidos y listado propio
- [x] 6.2 "Lo quiero" → "En tu búsqueda" (estado propio) y "lo buscan" (comunidad) en `messages/{es,en}/collection.json` y demás claves; "lo coleccionan" para la colección
- [x] 6.3 Actualizar los tests que afirman los textos anteriores; los identificadores de código y la API no cambian

## 7. Pestaña Canciones

- [x] 7.1 `TrackList`: títulos completos con salto de línea (quitar `truncate`); duración, marcas y menú en columnas fijas a la derecha; debajo del título en móvil
- [x] 7.2 Encabezado de la edición mostrada con acceso a Ediciones; subtotal por disco y total al pie con "≥" cuando falta alguna duración
- [x] 7.3 Artista de la pista cuando sus `primary` difieren de los del álbum (sin "feat."); `featured` como hoy
- [x] 7.4 Etiqueta de variante (en vivo, remix, regrabación) desde `variant_type` y enlace "versión de X" desde `variant_of_id`
- [x] 7.5 Marca de favorita de la comunidad y marca personal "la escuchaste", siempre visible y solo con sesión
- [x] 7.6 Menú `···` por pista en el orden de la spec: Registrar escucha, Reaccionar | Valorar, Favorito, Añadir a lista, Ver en listas | Ir a la canción; sin sesión pide iniciar sesión
- [ ] 7.7 Bloque "Pistas adicionales en otras ediciones": secciones por variante contraídas por defecto, frase aclaratoria, encabezado (nombre, año, sello, formato, ediciones y países, "+N pistas"), carga de las pistas al desplegar vía `src/lib/api/catalog.ts` (TanStack Query), cajas con enlace a MusicBrainz; oculto sin variantes (depende de `enrich-album-editions-and-credits`)
- [x] 7.8 Tests de la tracklist: título largo, multidisco con subtotales, duración faltante, pista de otro artista, variante en vivo, marcas, menú sin sesión, secciones contraídas y despliegue

## 8. Pestañas Créditos y Ediciones

- [ ] 8.1 Pestaña Créditos con los cuatro niveles (integrantes destacados, invitados, producción y sonido, arte y otros contraído con "+N créditos"), roles y pistas por persona; oculta sin créditos (depende de `enrich-album-editions-and-credits`)
- [ ] 8.2 Traducción de roles e instrumentos: lista cerrada en i18n con fallback al texto de MusicBrainz
- [ ] 8.3 Pestaña Ediciones: tabla (año, país, formato, sello · catálogo, pistas, enlace a MusicBrainz), filtro por formato, solo oficiales por defecto con control para incluir no oficiales, fila de la representativa marcada, "+N pistas" que lleva a su sección en Canciones; oculta sin ediciones además de la representativa
- [ ] 8.4 Tests de Créditos y Ediciones, incluidos los estados ocultos

## 9. Reseñas

- [x] 9.1 Pestaña Reseñas como índice: título o extracto del cuerpo, estrellas vigentes, autor, fecha; orden por recientes, mejor nota y peor nota; paginación con el listado existente de `reviews.ts`
- [x] 9.2 Página `/[locale]/review/[id]` con la reseña completa y el álbum enlazado; 404 localizado para reseñas inexistentes u ocultas (moderación, bloqueos, cuentas desactivadas)
- [x] 9.3 Modal interceptado desde el álbum (slot `@modal` + ruta interceptada + `default.tsx`): URL `/review/{id}`, cierre que vuelve a la pestaña y al scroll, anterior/siguiente según el orden activo, acceso a la página completa
- [x] 9.4 Editor de reseña propia accesible desde el panel "Tu relación" (sin cambios en sus reglas)
- [x] 9.5 Tests: índice con y sin título, orden, página completa, 404, modal al hacer clic, página completa al recargar

## 10. Documentación

- [x] 10.1 `docs/05-features/catalog-browsing.md`: nueva estructura de la página de álbum
- [x] 10.2 `docs/05-features/ratings-and-reviews.md`: índice de reseñas, página y modal de reseña, rating propio en el panel
- [x] 10.3 `docs/05-features/physical-collection.md` y `lists-and-favorites.md`: nombres "Pendiente", "En tu búsqueda", "lo buscan", "lo coleccionan"
- [x] 10.4 `docs/01-domain/business-rules.md`: umbrales de agregados y anonimato de colección y wishlist
- [x] 10.5 `docs/00-product/content-hierarchy.md`: las ediciones no son un selector de tracklist; se listan y sus pistas adicionales se muestran en la página del álbum
- [x] 10.6 `docs/04-api/contracts.md`: el detalle de álbum no cambia (2.1 conserva el contrato); se documentó el parámetro `sort` de `GET /api/catalog/{target}/{id}/reviews`

## 11. Verificación final

- [x] 11.1 `pnpm run typecheck && pnpm run lint && pnpm run test && pnpm run build`
- [x] 11.2 Verificación en el navegador (escritorio y móvil, claro y oscuro): cabecera, panel en sus tres estados, pestañas con URL y botón atrás, modal de reseña, comentarios al pie
