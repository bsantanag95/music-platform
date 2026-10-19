## 1. Mensajes (es y en)

- [x] 1.1 `common.json`: `ratings` → "Valoraciones"/"Ratings", `profile` → "Perfil"/"Profile", `collection` → "Colección física"/"Physical collection", `feed` → "Actividad"/"Activity"; agregar `community` ("Comunidad"/"Community"), `progress` ("Progreso"/"Progress") y `menuGroups.music`/`menuGroups.social` ("Tu música"/"Your music", "Social"/"Social"); el enlace de `/activity` usa `community`
- [x] 1.2 `artistJourney.json` y `catalog.json` (panel del artista): "Recorrido" → "Tu progreso", "Armar recorrido" → "Completar discografía", "Gestionar recorrido" → "Ver progreso", estados vacíos y errores sin la palabra "recorrido" (tabla de `progress-hub`)
- [x] 1.3 `camino.json`: "Caminos populares" → "Listas para completar", "Nuevo Camino"/"Crear Camino" → "Nueva lista para completar"/"Crear lista", pestañas "Mis listas" y "Listas que sigo", estante del perfil y conteos sin "Camino"
- [x] 1.4 `quickActions.json` ("Completar discografía", "Ya estás completando esta discografía", "Ver progreso", "Nueva lista para completar", "Ver lista", "Agregar álbumes"), `wantToListen.json`, `catalog.json` (selector "Tus listas"), `feed.json` (título "Actividad de quienes sigues", eventos "Armó una lista para completar"/"Completó una lista", filtro), `users.json` (estante, Nivel 3, estados de recorrido), `home.json` (vista previa), `ratings.json` (título), `collection.json` (título), `errors.json`
- [x] 1.5 Agregar las claves nuevas del hub (en `camino.hub.*` y `camino.tabs.*`; estado vacío de Discografías reutiliza `artistJourney.myJourneysEmpty`) y de la sección "Para completar" de `/lists` (`camino.hub.toComplete*`)
- [x] 1.6 Barrido final: `grep -i -E "recorrido|camino|trackead|journey|path"` sobre `messages/` no devuelve ningún valor visible que nombre estas funciones (las claves pueden conservar el nombre interno)

## 2. Menú de usuario y Header

- [x] 2.1 `user-menu-items.ts`: grupos `identity | music | social | tools | account`, ítem único `progress` → `/me/progress` en lugar de `artistJourneys` y `caminos`, `feed` y `artists` pasan a `social`, orden de D4, `USER_MENU_GROUP_LABELS` para `music` y `social`
- [x] 2.2 `UserMenu.tsx` (`UserMenuList`): renderizar el título de grupo como rótulo no interactivo en escritorio y en el panel móvil
- [x] 2.3 `Header.tsx`: barra general Explorar · Listas · Comunidad, sin el enlace a `/caminos`, y actualizar el comentario de la barra
- [x] 2.4 Verificar que la pantalla Red de ajustes (`/me/settings/network`) sigue mostrando los mismos accesos y sin títulos de grupo
- [x] 2.5 Actualizar `Header.test.tsx` y tests del menú: grupos con rótulo, un acceso "Progreso", sin posesivos, sin `/caminos` en la barra, "Comunidad" hacia `/activity`, rótulos fuera del orden de tabulación

## 3. Panel Progreso

- [x] 3.1 Generalizar `components/camino/caminos-tabs.ts` y `CaminosSection.tsx` a `components/progress/progress-tabs.ts` y `ProgressSection.tsx` con `discographies | lists | following` (por defecto `discographies`)
- [x] 3.2 Crear `src/app/[locale]/me/progress/page.tsx` (Server Component): sesión, `?tab=`, título y descripción, carga solo la pestaña activa y renderiza `ArtistJourneyList`, `MyCaminosList` o `TrackedCaminosList`; acción "Nueva lista para completar" en Mis listas
- [x] 3.3 Convertir `me/artist-journeys/page.tsx` y `me/caminos/page.tsx` en redirecciones a la pestaña equivalente (`mine` → `lists`, `tracked` → `following`)
- [x] 3.4 Breadcrumbs de `me/artist-journeys/[artistId]` y `me/caminos/[caminoId]` y `router.push` de `ArtistJourneyManager` y `CaminoManager` hacia `/me/progress?tab=…`; revisar otros enlaces a los listados (`WantToListenArtistJourneyAction`, `JourneyPanel`, `NewCaminoPanel`, estados vacíos)
- [x] 3.5 Tests: página del hub (pestaña por defecto, valor desconocido, cada pestaña renderiza su listado, sin sesión) y redirecciones; adaptar `me/caminos/page.test.tsx`

## 4. Descubrimiento e Inicio

- [x] 4.1 `app/[locale]/lists/page.tsx`: sección "Para completar" tras "Populares" con `discoverCaminos({}, 1, 8)`, enlace "Ver todas" a `/caminos`, oculta sin resultados y sumada a `anySection`
- [x] 4.2 `app/[locale]/caminos/page.tsx`: título y breadcrumb "Listas para completar"
- [x] 4.3 `components/home/QuickLinks.tsx`: un acceso "Progreso" en lugar de recorridos y Caminos; colección con "Colección física"
- [x] 4.4 Tests: `lists/page.test.tsx` (sección presente y ausente), Inicio y los que afirman etiquetas literales (`OwnerProfileBar.test.tsx`, `QuickActionsDialog.test.tsx`, perfil)

## 5. Documentación

- [x] 5.1 `docs/05-features/caminos.md`: nombres visibles nuevos, `/me/progress`, correspondencia clave interna ↔ etiqueta
- [x] 5.2 `docs/00-product/product_philosophy.md` §6.4, `docs/05-features/activity-feed.md` y `docs/05-features/home.md`: vocabulario y rutas nuevas
- [x] 5.3 Revisar el glosario o `docs/01-domain` (si nombra estas secciones) y `docs/05-features/README.md`

## 6. Verificación

- [x] 6.1 `pnpm run typecheck && pnpm run lint && pnpm run test && pnpm run build` pasan
- [ ] 6.2 En el navegador (dev server del worktree), en es y en: menú agrupado en escritorio y móvil, `/me/progress` con las tres pestañas, redirecciones, barra general, sección "Para completar" de `/lists`, panel del artista y acciones rápidas
