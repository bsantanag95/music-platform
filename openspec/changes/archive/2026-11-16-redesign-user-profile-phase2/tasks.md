## 1. Marco

- [x] 1.1 `ProfileSectionHeading` (título, recuento, «Ver todo →») y `ProfileRow` (una o dos columnas, apiladas en angosto)
- [x] 1.2 `page.tsx`: orden En rotación → Empieza | Valoraciones → Reseñas | Diario → Favoritos → Listas | Colección → Conciertos; sin `Level3LinksSection`
- [x] 1.3 Filas de servidor (`StartRow`, `ReviewsDiaryRow`, `ListsCollectionRow`) que deciden una o dos columnas según el contenido; conservar los `id` de ancla
- [x] 1.4 Tests de `page.tsx` y `sections.tsx`: orden, filas con una sola sección, sin bloque de enlaces

## 2. Vistas previas

- [x] 2.1 «En rotación» en una fila de hasta 3 obras, sin cifras
- [x] 2.2 «Empieza por aquí» y «Valoraciones destacadas» compactas, con el encabezado común
- [x] 2.3 «Reseñas» como filas compactas, con el aviso «y N más»
- [x] 2.4 `DiaryPreviewTable`: 5 entradas recientes en tabla (fecha | obra | contexto), sin scroll interno, «Ver todo →»
- [x] 2.5 Favoritos: carátulas de álbum a la izquierda, artistas y canciones al lado
- [x] 2.6 `ListsAndCaminosPreview`: hasta 4 tarjetas (listas primero, hasta 2 listas para completar), «+N» a sus páginas
- [x] 2.7 `CollectionPreview` compacta: copias recientes sin selector de vista, «Ver todo →»
- [x] 2.8 Sin `SaveListButton`/`TrackListButton` para anónimos, el dueño ni la previsualización
- [x] 2.9 Tests de cada vista previa (contenido, vacíos, acciones según sesión)

## 3. Textos, documentación y verificación

- [x] 3.1 Mensajes `messages/{es,en}/users.json` («Listas», «Ver todo»…) y `pnpm run i18n:client-messages`
- [x] 3.2 `docs/05-features/user-profile.md`: cuerpo en filas, vistas previas, fin del bloque de enlaces
- [x] 3.3 `pnpm run typecheck && pnpm run lint && pnpm test && pnpm run build`
- [x] 3.4 Verificación en el navegador a 1440, 1024, 820 y 390 px: perfil público sin sesión (sin acciones de guardar/seguir) y perfil privado sin cambios
