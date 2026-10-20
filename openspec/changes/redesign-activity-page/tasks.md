## 1. Fase 1 · Pestañas en la URL y renderizado del servidor

- [x] 1.1 `page.tsx`: leer `searchParams` (`await`), normalizar `tab` (`following` | `you` | Recientes) (D2); ignorar `tab` sin sesión. `kind` se normaliza con los chips (3.4)
- [x] 1.2 `page.tsx`: pedir en el servidor solo la página 1 de la pestaña activa; de las otras, una sola entrada (los mismos servicios con `pageSize` 1) para decidir el estado vacío global
- [x] 1.3 Seguidos del lector en el servidor (`listFeedAuthors`) para los estados vacíos y el riel
- [x] 1.4 `ActivityTabs`: derivar la pestaña de `useSearchParams`, escribir con `history.replaceState`; las pestañas no activas cargan en el cliente con esqueleto y `prefetchInfiniteQuery` al pasar el mouse o enfocar
- [x] 1.5 Etiquetas cortas `Recientes · Siguiendo · Tú` / `Recent · Following · You` en `messages/{es,en}/feed.json`
- [x] 1.6 Hover de pestaña inactiva solo con color; desvanecido de borde cuando la barra desborda
- [x] 1.7 Tests: `ActivityTabs.test.tsx` (pestaña desde la URL, `replaceState`, flechas) y `page.test.tsx` (pestaña inicial, `tab` desconocido, anónimo ignora `tab`)

## 2. Fase 1 · Filas y estados vacíos

- [x] 2.1 `MetaLine`, `GroupRow`, `RotationPeakRow`, `FollowRow`, `FollowArtistRow`: separador dentro de su unidad, ícono + verbo en `whitespace-nowrap` (D5)
- [x] 2.2 Fecha reubicada al final de la línea de metadato por debajo de `sm`, sin forzar el salto de la línea del autor (sin abreviar: `short`/`narrow` son ambiguos en español)
- [x] 2.3 `FeedActivityList`: variante `own` (anatomía `feed` con `hideAuthor`) para "Tú" en `/activity`; Inicio sigue con `self` (D6)
- [x] 2.4 Variante `self`: la nota siempre en su propia línea bajo el título (corrección global)
- [x] 2.5 `CommunityActivitySection`: prop `empty` con título, descripción y acción; casos de la tabla D9 (`EmptyState` compacto)
- [x] 2.6 Copia en tuteo en `feed.community.*` (retirar "acá" y "seguís") y textos nuevos de estados vacíos, es y en
- [x] 2.7 Cabecera: menos padding superior en móvil y subtítulo de una línea bajo el h1 (se mantiene la miga de pan, por coherencia con Explorar y Listas)
- [x] 2.8 `DiscPlaceholder`: contraste no textual ≥ 3:1 sobre `ink` (D11)
- [x] 2.9 Tests: `FeedActivityList.test.tsx` (variante `own`, posición de la nota en `self`, sin "·" final), `CommunityActivitySection.test.tsx` (cada estado vacío y su acción)

## 3. Fase 2 · Filtros por tipo

- [x] 3.1 `listCommunityActivity(..., { kind })`: armar solo la rama pedida (`rating` | `comment` | `review`)
- [x] 3.2 `GET /api/activity/recent`: `parseKind` con `400 VALIDATION_ERROR`; actualizar `route.test.ts`
- [x] 3.3 `getCommunityActivity(page, pageSize, { kind })` en `lib/api/diary.ts`; `queryKeys.activityRecent({ kind })` sin romper la clave que usa Inicio
- [x] 3.4 Componente de chips de filtro (Recientes: Todo, Reseñas, Comentarios, Valoraciones; Siguiendo: además Escuchas y Listas) con `aria-pressed` y una fila desplazable en móvil; escribe `kind` en la URL
- [x] 3.5 Siguiendo usa `getFeed(page, size, { kind })` con `queryKeys.myFeed({ kind })`
- [x] 3.6 Tests: servicio con `kind`, chips (selección, "Todo" quita `kind`), "cargar más" respeta el filtro

## 4. Fase 2 · Bloques de fecha y tarjeta de reseña

- [x] 4.1 `FeedActivityList`: prop `dateSections`; bloques Hoy / Esta semana / Este mes / Antes con `useNow()`, encabezado solo al cambiar de bloque, `<li role="presentation">` con `<h3>` (D7)
- [x] 4.2 Prop `reviewCard`: superficie elevada, estrellas, titular, extracto a 4 líneas y "Leer reseña" con `reviewHref` (D8); también en la fila de opinión fusionada
- [x] 4.3 Activar `dateSections` y `reviewCard` solo desde `CommunityActivitySection`
- [x] 4.4 Tests: bloques (sin repetir encabezado entre páginas) y tarjeta (enlace correcto, plegado)

## 5. Fase 3 · Riel de contexto

- [x] 5.1 `listTrendingConversations(viewerId)` en `community-activity.ts`: 7 días, ≥ 2 personas distintas, tope 5, visibilidad de Recientes, sin respuestas; caché de 10 minutos de la parte sin bloqueos y filtro de bloqueo por lector (D10)
- [x] 5.2 Medir la consulta contra la BD de scratch (presupuesto < 50 ms) y revisar el plan con `EXPLAIN ANALYZE` (medido ~5 ms; sin índices por fecha, ver Riesgos del diseño)
- [x] 5.3 Componente `ActivityContextRail` con los dos módulos: conversación (cifra desde 5) y "Sigue a más gente" (con sesión y < 3 seguidos → `/users`; anónimo → `/auth/register`)
- [x] 5.4 Layout: `main` `max-w-6xl`; desde `lg`, grilla `[minmax(0,1fr)_280px]` con el feed en `max-w-3xl`; por debajo de `lg`, el riel después de la lista
- [x] 5.5 Tests unitarios del servicio (umbral, orden, bloqueo, cuenta desactivada, respuestas excluidas) y de los componentes (oculto si está vacío)
- [x] 5.6 Smoke test `scripts/smoke-test-community-activity.ts` contra Postgres real: crea usuarios `smoke_act_*` y un álbum sintético `5e0ce000-…`, verifica umbral, ventana, bloqueo y `kind`, y los borra al terminar (también si falla); documentar la limpieza en `AGENTS.md`

## 6. Documentación

- [x] 6.1 `docs/04-api/contracts.md`: documentar `GET /api/activity/recent` (hoy ausente) con `page`, `pageSize` y `kind`, y su `400`
- [x] 6.2 `docs/05-features/activity-feed.md`: actualizar la sección de la superficie pública (pestañas en la URL, filtros, bloques, riel)
- [x] 6.3 `docs/01-domain/business-rules.md`: regla del riel (2 personas, 7 días, tope 5, sin relleno)
- [ ] 6.4 Al archivar: actualizar el `## Purpose` de `openspec/specs/community-activity/spec.md` con las etiquetas nuevas

## 7. Verificación

- [x] 7.1 `pnpm run typecheck && pnpm run lint && pnpm test && pnpm run build`
- [x] 7.2 Navegador a 375px y 1366px, con y sin sesión: las tres pestañas son alcanzables, sin "·" colgando, la URL conserva la pestaña y el filtro, los estados vacíos llevan su acción, el riel aparece y se oculta según corresponda
- [x] 7.3 Regresión visual de `/me/feed` e Inicio tras las correcciones globales (metadatos, nota en `self`, disco de reemplazo)
