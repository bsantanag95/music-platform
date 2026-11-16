## Why

La Fase 1 (`redesign-user-profile-phase1`) dio al perfil su cabecera, anclas y franja de identidad, pero el cuerpo sigue siendo
la pila de secciones de antes, ahora estiradas a 1280 px: filas de «Empieza por aquí» de lado a lado, reseñas como cajas
anchas, el diario en una caja con desplazamiento interno que corta la quinta fila, rieles horizontales de listas y recorridos,
una colección con selector de tres vistas para una sola copia, «Guardar»/«Seguir mi progreso» ofrecidos a quien no tiene sesión
y, al final, un bloque de enlaces que repite lo que ya enlazan las secciones. La dirección elegida (D2, mockups de
`mockups/profile-2026-11/`) compone ese cuerpo en filas compartidas, que el usuario destacó de la propuesta C.

## What Changes

- Orden del Nivel 2: «En rotación» → «Empieza por aquí» | «Valoraciones destacadas» → «Reseñas» | Diario → Favoritos →
  «Listas» | Colección física → Conciertos. En pantallas angostas cada fila se apila; con una sola sección, ocupa la
  fila entera.
- Encabezado común de sección: título, recuento y «Ver todo →» a la vista completa; sin subtítulos ni numeración.
- Vistas previas compactas: reseñas como filas; diario como tabla de sus 5 entradas más recientes (fecha | obra | tipo de
  escucha), sin caja con scroll; Favoritos con las carátulas de álbum a la izquierda y artistas y canciones al lado; listas y listas para completar como tarjetas con mosaico; colección como sus copias más recientes, sin selector de vista.
- Se retira el bloque de enlaces de Nivel 3 al final del perfil.
- «Guardar»/«Seguir» de las listas y «Seguir mi progreso» de las listas para completar solo para un visitante con sesión que no es el
  dueño.
- «Empieza por aquí» sigue mostrando todo lo fijado aunque repita la Tarjeta de Identidad (decisión de septiembre,
  confirmada el 2026-11-16).

### Goals

- Usar el ancho que liberó la Fase 1 con filas que se lean como una página, no como una pila.
- Que ninguna vista previa necesite controles propios (scroll interno, selector de vista) para entenderse.

### Non-Goals

- Tono por perfil y vinilo que asoma (Fase 3).
- Cambiar las vistas completas de Nivel 3, sus datos o sus APIs.
- Ocultar en «Empieza por aquí» lo que ya está en la Tarjeta de Identidad.

## Capabilities

### New Capabilities

_(ninguna)_

### Modified Capabilities

- `social-profiles`: requisito nuevo «Cuerpo del perfil en filas»; «Composición del perfil por niveles de acceso» con el nuevo
  orden del Nivel 2 y los enlaces de Nivel 3 desde cada sección.
- `profile-reviews`: la sección se ubica tras «Valoraciones destacadas», junto al diario, con tarjetas compactas.
- `camino`: las listas para completar (Caminos) van en «Listas» junto a las listas; sin acción de tracking para quien no tiene sesión.

## Impact

`src/app/[locale]/users/[username]/{page,sections}.tsx` y sus tests; nuevos `ProfileSectionHeading`, `ProfileRow` (fila de dos
secciones), `DiaryPreviewTable`, `ListsAndCaminosPreview` en `src/components/profiles/`; `ProfileReviews`, `PinnedShowcase`,
`RatingHighlights`, `InRotation`, `FavoritesPreview`, `CollectionPreview` (variante sin selector), `ProfileRail` (encabezado
común), `ProfileListCard`/`CaminoProfileCard` o sus botones (sin acción para anónimos); se retira `ProfileLevel3Links`. Mensajes
`messages/{es,en}/users.json`, `client-messages.json`, `docs/05-features/user-profile.md`. Sin esquema ni API.
