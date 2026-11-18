## 1. Datos

- [x] 1.1 `listMyRecentListens(userId, limit = 8)` en `src/services/home/home.ts`: escuchas propias sin filtro de audiencia, una por objetivo (la más reciente), con título, artista acreditado, carátula (canción → la de su álbum), contexto, fecha y valoración propia; tope previo acotado sobre `idx_listen_entry_user_created`
- [x] 1.2 Tests del servicio (o del armado de filas): deduplicación por objetivo, orden, valoración propia presente/ausente, escucha privada incluida

## 2. Selección de tarjetas del feed

- [x] 2.1 `selectHomeFeedCards(entries, limit = 7)` (`src/components/home/home-feed-cards.ts`): tarjetas para escucha, valoración, reseña, comentario y favorito de álbum; rachas de escuchas consecutivas por persona en una tarjeta; resumen por persona y tipo del resto dentro del tramo cubierto
- [x] 2.2 Tests: tarjetas vs resumen por tipo, racha cortada por otra tarjeta, límite de 7, resumen solo del tramo, favoritos de canción/artista al resumen, orden del resumen

## 3. Componentes

- [x] 3.1 `RecentListensShelf` (server): `HomeSectionHeading` «Lo último que escuchaste» + «Ver diario», rejilla desde `lg` y riel con `scroll-snap` por debajo; valoración compacta o contexto + fecha relativa; no se renderiza sin escuchas
- [x] 3.2 `ActivityCard`: tipos escucha (contexto como etiqueta, nota como extracto), favorito de álbum y racha (mosaico 2×2 de hasta 4 carátulas, cantidad y títulos), sin romper el uso de la portada sin sesión
- [x] 3.3 Resumen dentro de `FeedPreview` (sin componente aparte): una línea por persona con cada tipo y su cantidad, enlace a `/me/feed`
- [x] 3.4 `FeedPreview`: encabezado «De quienes sigues» con bajada, rejilla de tarjetas (3/2/1 columnas, la primera ancha), resumen y botón «Ver más actividad» a `/me/feed`; estado vacío con el acceso al feed; sin `ScrollablePreviewList`
- [x] 3.5 Sin seguidos: `CommunityActivity layout="cards"` en el lugar del feed bajo «Lo que se escucha en la comunidad» con el enlace «Buscar gente»; no montar la comunidad de más abajo en ese caso; eliminar `OnboardingPrompt`
- [x] 3.6 `AuthenticatedHome`: contenedor ancho para el estante y el feed, orden cabecera → invitación del año → estante → feed → resto; `listFeed` con `pageSize = 30`; quitar `RecentSelfActivity`
- [x] 3.7 Eliminar `RecentSelfActivity`, `ScrollablePreviewList` y sus claves de consulta si quedan sin uso (actualizar `quick-actions-changes.ts` y `src/lib/query/keys.ts`); eliminar claves de i18n sin uso
- [x] 3.8 Textos nuevos en `messages/{es,en}/home.json` (títulos, bajadas, «Ver más actividad», líneas de resumen con plurales, racha, contexto de escucha si no existe ya) en ambos idiomas
- [x] 3.9 Tests de `RecentListensShelf`, `ActivityCard` (nuevos tipos), `FeedPreview` y `AuthenticatedHome` (con y sin seguidos, sin escuchas, comunidad no duplicada)

## 4. Documentación

- [x] 4.1 `docs/05-features/home.md`: jerarquía con sesión (estante, feed en tarjetas, sin seguidos), retiro del scroll interno en "Notas técnicas" y estado de la Fase 2
- [x] 4.2 `pnpm run i18n:client-messages` y revisar el diff

## 5. Verificación

- [x] 5.1 `pnpm run typecheck && pnpm run lint && pnpm run test && pnpm run build`
- [x] 5.2 Navegador con sesión a 1440, 1024, 820 y 390 px: sin desbordamiento horizontal ni contenedores con scroll interno, estante en riel en móvil, tarjetas y resumen, «Ver más actividad» abre `/me/feed`
- [x] 5.3 Cuenta sin seguidos (cuenta de prueba local, borrada al terminar): comunidad en el lugar del feed y no repetida abajo
