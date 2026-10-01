## Context

`rating` guarda una fila por (usuario, objetivo) con `stars` (numérico ½–5), `detailed_score` (1–100, opcional) y objetivo único (`artist_id` / `release_group_id` / `recording_id`). No hay audiencia propia: la valoración la ven el dueño y los seguidores aprobados, y el puntaje solo el dueño y las destacadas (`rating_highlight`). Ya existen:
- `RatingDetailDialog` (deslizador, con o sin valoración, destacar, borrar), `StarRatingInput` / `StarRatingDisplay`, `formatStars`, `scoreRange` / `isScoreCoherent` / `starsFromScore`.
- El patrón de las bibliotecas propias (`/me/want-to-listen`, `/me/favorites`): página servidor con `requirePageUser`, servicio `listMy…(userId, page, pageSize, filtros)`, `GET /api/me/…` con `parsePagination` y filtros validados con Zod, lista cliente con "cargar más".
- `PRIMARY_ARTIST_SQL` y `RECORDING_COVER_SQL` (feed) para el artista y la carátula de una canción; `release_group.first_release_year` para el año.
- `USER_MENU_ITEMS`, fuente única del menú de usuario (Header y panel móvil).

## Goals / Non-Goals

**Goals:** una biblioteca propia ordenable y filtrable de las valoraciones de álbumes y canciones, con edición al toque, sin ampliar la visibilidad del puntaje.

**Non-Goals:** valoraciones de artistas, vistas públicas, gráficas, agrupaciones, exportación, cambios de esquema.

## Decisions

**D1. Solo del dueño, por construcción.** El endpoint `GET /api/me/ratings` toma el `userId` de la sesión (`requireUser`) y no acepta ningún parámetro de usuario; no existe ruta pública equivalente. La página usa `requirePageUser`. Así el puntaje no puede salir de aquí por un parámetro. Un test del servicio verifica que solo devuelve filas del usuario. Alternativa descartada: reutilizar `/users/{username}/…` con control de acceso (abre la puerta a exponer puntajes a seguidores).

**D2. Servicio `listMyRatings` con una consulta.** `rating` filtrado por `user_id` y por tipo (álbum o canción; las filas de artista se excluyen siempre con `artist_id IS NULL`), unido a `release_group` y `recording`. Devuelve filas `{ id, targetType, stars, detailedScore, updatedAt, target: { id, title, coverThumbUrl, artistName, artistId, year } }`, más `total` y las **facetas** de años disponibles (`years: number[]` ordenados descendente) para que el selector solo ofrezca años con datos. Paginación con `parsePagination` (por defecto 20) y `hasNext`.

**D3. Año de una canción.** Una grabación no tiene año propio: se toma el **menor `first_release_year`** de los álbumes donde aparece (`track` → `release` → `release_group`), igual criterio de elección que `RECORDING_COVER_SQL` para la carátula (el álbum más antiguo con dato). Si ningún álbum tiene año, la canción queda sin año: aparece sin filtro de año y no cae en ninguna década. Alternativa descartada: elegir el año del álbum "representativo" (no está definido para canciones y mezcla recopilatorios).

**D4. Orden.** Cuatro valores validados con Zod (`best`, `worst`, `recent`, `title`):
- `best`: `stars desc`, luego `detailed_score desc nulls last`, `updated_at desc`, `id`.
- `worst`: `stars asc`, luego `detailed_score asc nulls last`, `updated_at desc`, `id`.
- `recent`: `updated_at desc`, `id`.
- `title`: título normalizado ascendente, `id`.
Por defecto `best`. Los sin puntaje van siempre **después** dentro de las mismas estrellas (en ambos sentidos): no se imputa ningún valor (regla del proyecto) y la marca "Sin afinar" explica la posición. Es la misma regla que el desempate de la discografía (`define-detailed-score`, D10).

**D5. Filtros.** Estrellas (un valor ½–5, o vacío), tipo (`release-group` | `recording` | vacío), año (entero) y década (entero múltiplo de 10). Año y década son excluyentes: si llegan ambos, el año manda (el cliente deshabilita la década cuando hay año). Todos se combinan con AND. Valores inválidos → `400 VALIDATION_ERROR`. El filtro de año es el "top del año": con orden `best` y año elegido ya se obtiene el ranking.

**D6. Estado en la URL del cliente, no en el servidor.** Los filtros y el orden viven en el estado de la lista cliente y se reflejan en la query string (`?sort=best&year=2026`) con `history.replaceState`, para poder recargar o enlazar el ranking propio. La página servidor lee los parámetros solo para la carga inicial y los valida con el mismo esquema (valores no válidos se ignoran, no rompen la página).

**D7. Edición en la fila sin reordenar.** Cada fila muestra `StarRatingInput` compacto (el mismo control del panel y de la tracklist) y un botón con el puntaje (`86/100`, o "Sin afinar") que abre `RatingDetailDialog` con la valoración de la fila. Tras guardar o cambiar estrellas, la fila se actualiza en el lugar y **no se reordena** hasta que el usuario cambia el orden/filtro o recarga: una fila que salta bajo el cursor es peor que una posición momentáneamente desactualizada, y evita saltos para quien usa lector de pantalla. Cambiar las estrellas conserva el puntaje solo si sigue coherente (`isScoreCoherent`) y, si no, lo quita y lo avisa (misma regla que el panel y la tracklist). Borrar la nota quita la fila. Destacar/quitar de destacadas queda en el diálogo. Se actualiza `total` localmente.

**D8. Marca "Sin afinar" como acceso.** En filas sin puntaje, el botón del puntaje muestra el texto atenuado "Sin afinar" (en lugar de `86/100`) con el mismo tamaño táctil: es la marca y a la vez la acción para afinar. Solo existe en esta página.

**D9. Presentación.** Fila al estilo de las bibliotecas existentes: carátula con `CoverThumb`, título enlazado a `/album/…` o `/song/…` (helpers de `catalog-links`), artista enlazado, tipo ("Álbum" / "Canción"), año. La nota usa `StarRatingValue` con `showScore` (formato de `rating-display`). Sin vistas de grilla ni agrupación en esta versión. Vacío: mensaje con enlace a Explorar; con filtros sin resultados: mensaje y botón "Limpiar filtros".

**D10. Accesos.** Se añade `ratings` a `USER_MENU_ITEMS` (grupo `library`, superficies `header` y `panel`, después de favoritos) y su etiqueta en `common`; el test de `user-menu-items` se actualiza. En el perfil propio se añade un enlace "Mis valoraciones" junto a los accesos de gestión del dueño (se identifica en la implementación el componente exacto; sin contador).

**D11. Tooltip de la discografía.** `DiscMarksView` ya compone `title` y texto accesible con `yourStars`. Con puntaje usa un mensaje nuevo `yourStarsScore` ("Tu nota: 4,5 · 86/100") para ambos; lo visible sigue siendo `★ 4,5`. Es la única excepción a "las marcas de la discografía no muestran el puntaje", y queda escrita en `rating-display`.

**D12. Reglas de privacidad sin cambios.** No se modifica quién ve qué: el puntaje sigue siendo del dueño y de las destacadas; los seguidores aprobados ven estrellas solo donde ya se ven. Esta página no crea ninguna vista de valoraciones ajenas.

## Risks / Trade-offs

- [Una fila editada queda en una posición desactualizada hasta reordenar] → decisión explícita (D7); recargar o cambiar el orden la corrige. Si resulta confuso, un aviso "Reordenar" es un añadido pequeño.
- [Consulta con subconsultas correlacionadas por fila (artista, carátula, año de canción)] → una sola página de 20 filas; las subconsultas ya se usan en favoritos y feed y los índices `idx_rating_user`, `idx_track_recording` cubren el acceso. Se mide con `EXPLAIN` en la verificación; si pesa, se resuelve con una consulta por lote para las canciones.
- [Canciones sin año] → no se pierden: aparecen sin filtro de año y se filtran por tipo; documentado en la ayuda del filtro.
- [Sin imputar valores, un 5★ sin puntaje queda por debajo de uno con 91] → es lo decidido; la marca "Sin afinar" lo hace explícito y es un clic arreglarlo.
- [Tooltip del puntaje en la discografía no existe en táctil] → el texto accesible (`sr-only`) lo cubre para lectores de pantalla; el dato visible completo está en "Mis valoraciones".

## Migration Plan

Sin migraciones. Orden: servicio y API → página y lista → accesos → tooltip → docs. Rollback: revertir el commit. Verificación contra una BD de scratch o la de desarrollo con datos de prueba que se limpian al final.

## Open Questions

- ¿Conviene más adelante agrupar el ranking por año o por década con encabezados? Fuera de alcance; el filtro por año cubre el caso.
- ¿"Crear lista desde este ranking"? Excluido ahora; se evalúa cuando el ranking exista.
