## Context

Tras la Fase 1 el perfil accesible es: cabecera → anclas → franja de identidad → cuerpo. El cuerpo apila, a todo el ancho,
`PinnedSection`, `RatingHighlightsSection`, `FeaturedReviewsSection`, `InRotationSection`, `DiaryRail` (`DiaryReadList` en caja
de 21 rem con scroll y «cargar más»), `FavoritesRail` (`FavoritesPreview` por tipo), `ListsRail` y `CaminosRail` (rieles
horizontales de tarjetas de 20 rem, con `SaveListButton`/`TrackListButton` también para anónimos, que al pulsar fallan), 
`CollectionRail` (`CollectionPreview` con `CollectionModeSwitcher`), `ConcertsRail` y `Level3LinksSection`.

Referencia visual: el cuerpo de `mockups/profile-2026-11/d2-personalidad.html`. Decisiones del usuario: filas compartidas de
la propuesta C (Reseñas + Diario, Listas + Colección), sin numeración ni subtítulos, títulos neutros, colores y tipografías
actuales; «Empieza por aquí» no oculta lo que repite la Tarjeta de Identidad (2026-11-16).

## Goals / Non-Goals

**Goals:** cuerpo en filas a 1280 px; vistas previas sin controles propios; acciones con sesión solo para quien puede usarlas;
una sola forma de llegar al Nivel 3 (el enlace de cada sección).

**Non-Goals:** Fase 3 (tono, vinilo); vistas completas de Nivel 3; datos, esquema o API; contar escuchas en «En rotación» (el
mockup lo mostraba, el spec `profile-in-rotation` lo prohíbe).

## Decisions

### Filas
`ProfileRow` (server, sin estado): grilla `lg:grid-cols-2` con `gap` amplio y filete vertical entre columnas; recibe dos
nodos, cada uno en su `<Suspense>`. Si una sección no renderiza nada, `:has()` no alcanza para saberlo antes del streaming, así
que la decisión es de datos: cada fila la compone una sección de servidor (`StartRow`, `ReviewsDiaryRow`, `ListsCollectionRow`)
que carga lo que necesitan sus dos lados (las consultas ya están en `cache()`) y decide una o dos columnas. *Alternativa
descartada:* grilla CSS con `empty:hidden` — deja la columna reservada mientras llega el streaming y salta al resolverse.

Orden: `InRotationSection` → `StartRow` (Empieza por aquí | Valoraciones destacadas) → `ReviewsDiaryRow` → `FavoritesRail` →
`ListsCollectionRow` (Listas | Colección física) → `ConcertsRail`. Los `id` de ancla (`resenas`, `diario`,
`favoritos`, `listas`, `coleccion`) se conservan; `caminos` pasa a ser parte de `listas`.

### Encabezado común
`ProfileSectionHeading`: `h2` en display, recuento en mono apagado y enlace «Ver todo →» a la derecha cuando hay vista
completa (diario, favoritos, listas, colección, conciertos). `ProfileRail` lo usa; las secciones que hoy tienen su propio `h2`
(`PinnedShowcase`, `RatingHighlights`, `ProfileReviews`, `InRotation`) pasan a usarlo. Reseñas no tiene vista completa: sigue
con el aviso informativo «y N reseñas más» (spec `profile-reviews`).

### Vistas previas
- **Empieza por aquí**: filas más bajas (miniatura 56 px), nota como cita en una línea completa (el spec exige la nota
  completa: no se recorta). **Valoraciones destacadas**: lista de filas con la valoración en estrellas + `86/100` neutro
  (spec `rating-display`).
- **Reseñas**: fila compacta — carátula 48 px, título y artista, valoración a la derecha, título de la reseña y cuerpo
  recortado a 2 líneas.
- **Diario**: `DiaryPreviewTable` (server) con las 5 entradas más recientes de `listUserDiary(…, 1, 5)`: fecha corta | miniatura
  + obra + artista (y la impresión como cita en una línea) | contexto de escucha como píldora. Sin caja ni «cargar más»:
  «Ver todo →» al diario completo. `DiaryReadList` deja de usarse en el perfil (sigue en sus otras superficies).
- **Favoritos**: a la izquierda las carátulas de álbum (hasta 5) en una fila; a la derecha, una lista con los artistas (con
  foto) y las canciones. Mismos datos de `getFavoritesPreview`.
- **Listas**: `ListsAndCaminosPreview` con hasta 4 tarjetas: las listas (fijadas primero) y, si también hay listas, hasta 2 listas para completar (Caminos), con
  mosaico, tipo y recuento; «+N» a `/lists` y a `/caminos` cuando sobran. El recuento del título suma ambos.
- **Colección física**: `CollectionPreview` con `compact`: las copias más recientes (hasta 4) como filas con carátula,
  título, artista · año y formato; sin `CollectionModeSwitcher` (sigue en `/users/[username]/collection`).
- **En rotación**: una fila horizontal de hasta 3 obras (carátula, título, artista), sin cifras.

### Acciones con sesión
`ListsCollectionRow` recibe `canAct = authenticated && !isOwn && !preview`; con `false`, las filas no montan `SaveListButton`
ni `TrackListButton`. El dueño ya no los veía (spec `camino`); el anónimo deja de verlos.

### Nivel 3
Se borra `Level3LinksSection`/`ProfileLevel3Links`: cada sección enlaza su vista completa; la huella completa ya se enlaza desde
la franja.

### Nombre de la sección
El mockup decía «Listas y recorridos», pero el sitio llama a los Caminos «Listas para completar»: la sección se titula
«Listas» y su recuento suma ambos; cada «+N» enlaza su página (`/lists`, `/caminos`). Las tarjetas son las de siempre
(`ProfileListCard`, `CaminoProfileCard`) en una grilla de 2 × 2, en vez de filas nuevas: conservan el mosaico, la marca
«Fijada» y el estado del Camino.

### Componentes retirados
`ListsCarousel`, `CaminosCarousel` y `ProfileLevel3Links` ya no tienen uso y se borran; `CollectionPreview` pasa a ser un
Server Component con la lista compacta (era solo del perfil); `DiaryReadList` sigue en `/users/[username]/diary`.

## Risks / Trade-offs

- [Más consultas por fila] → todas las lecturas usadas ya están en `cache()` por request (o se agregan), así que las filas y
  las anclas comparten resultados.
- [Tablas angostas en móvil] → el diario a 390 px oculta la columna de contexto en una línea propia bajo la obra.
- [Tests de composición] → `page.test` verifica el nuevo orden con `orderOf`, incluida la ausencia de `Level3LinksSection`.

## Migration Plan

Sin datos ni API; revertir el commit restaura el cuerpo de la Fase 1.
