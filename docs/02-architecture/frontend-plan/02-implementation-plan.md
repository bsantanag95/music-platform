# Etapa 2 — Plan de implementación paso a paso

**Objetivo:** construir el catálogo navegable de la Fase 3 (`buscar → artista → álbum →
canción`) en etapas pequeñas, cada una con un criterio de aceptación verificable, sin
avanzar a la siguiente hasta cerrar la anterior.

**Estado general: 🟡 Lista para empezar.** Los bloqueantes de `00-backend-analysis.md`
quedaron resueltos (backend extendido: `artist/[id]`, créditos en tracklist, `code` de
error; decisiones de producto confirmadas: carga progresiva de carátulas, canción diferida
a Fase 4). No hay más brechas de backend pendientes para arrancar la Etapa 3.0.

Leyenda de estado: 🔴 no iniciada · 🟡 en progreso · 🟢 completa · ⚪ pendiente de decisión.

---

## Etapa 3.0 — Fundaciones del frontend

**Objetivo:** preparar la base técnica común (estilos, cliente HTTP, validación,
providers) antes de construir cualquier pantalla.

**Tareas técnicas**
- Instalar y configurar Tailwind CSS v4 (`@theme` dentro de `globals.css`, `postcss.config.mjs`
  con `@tailwindcss/postcss` — v4 no usa `tailwind.config.ts` ni `autoprefixer` por
  separado, ver corrección en `code-walkthrough.md`).
- Instalar `zod` y `@tanstack/react-query`.
- Crear `src/lib/api/schemas.ts`: esquemas zod espejo de las respuestas documentadas en
  `docs/04-api/contracts.md` (`ArtistSchema`, `ReleaseGroupSchema`,
  `ReleaseWithTracksSchema`, `ApiErrorSchema` con el campo `code` de `04-api/errors.md`).
- Crear `src/lib/api/client.ts`: wrapper de `fetch` tipado que parsea la respuesta con el
  schema correspondiente y lanza un error tipado (`ApiError`, con `.code`) ante 4xx/5xx.
- Crear `src/lib/api/catalog.ts`: `searchCatalog(q)`, `getReleaseGroupDetail(id)` —
  funciones de alto nivel que usan `client.ts`.
- Crear `src/app/providers.tsx` con `QueryClientProvider` y usarlo en `layout.tsx`.
- Crear componentes base en `src/components/ui/`: `Button`, `Input`, `Skeleton`,
  `EmptyState`, `ErrorState`.
- (Backend) el campo `code` en las respuestas de error ya se agregó a los tres route
  handlers al resolver el bloqueante 2 de `00-backend-analysis.md` — nada pendiente acá.

**Archivos**
`package.json`, `postcss.config.mjs`, `src/app/globals.css`,
`src/app/providers.tsx`, `src/app/layout.tsx` (modificado), `src/lib/api/*` (nuevos),
`src/components/ui/*` (nuevos), `src/app/api/catalog/search/route.ts` y
`.../release-group/[id]/route.ts` (modificados — solo agregar `code`).

**Dependencias:** ninguna — los bloqueantes de `00-backend-analysis.md` ya quedaron
resueltos.

**Criterios de aceptación**
- `npm run typecheck && npm run lint && npm run test && npm run build` pasan (igual que CI).
- La página raíz sigue renderizando sin errores con `QueryClientProvider` envolviendo la app.
- `searchCatalog("Pink Floyd")` devuelve datos parseados y tipados sin `any`.

**Estado: 🟢 Completa**, con una salvedad de entorno anotada abajo.

Construido: Tailwind v4 con sistema de tokens propio (paleta cálida oscura + acento ámbar,
tipografías `Space Grotesk`/`Source Serif 4`/`IBM Plex Mono` vía `next/font/google`,
definidos con `@theme` en `globals.css` — no `tailwind.config.ts`, ver corrección en
`code-walkthrough.md`), `src/lib/api/{schemas,client,catalog}.ts`, `src/lib/query/keys.ts`,
`Providers` con `QueryClientProvider`, los 5 componentes de `src/components/ui/`
(`Skeleton` incluye una variante `disc` — anillos concéntricos tipo surco de vinilo, para
carátulas/fotos en Etapa 3.2+, en vez de un bloque genérico). También se agregó, fuera del
alcance original de esta etapa pero necesario para que `npm run lint` funcionara en
absoluto: configuración real de ESLint (`eslint.config.mjs` — no existía desde la Fase 1),
y Vitest + Testing Library con un test real de `apiFetch` (4 casos: éxito, error tipado,
schema inválido, error sin shape esperado).

**Validado:** `typecheck`, `lint`, `test` (4/4), y `next build` — este último compila y
genera las 5 rutas correctamente. La única pieza no validable en este entorno de
ejecución: `next/font/google` necesita salida de red a `fonts.googleapis.com`, que no está
disponible en el sandbox (mismo tipo de restricción que ya afecta a `musicbrainz.org`, ver
`code-walkthrough.md`). Se confirmó por separado, con un layout temporal sin fuentes
externas, que el resto del build (Tailwind, componentes, rutas) compila limpio — el build
completo con las fuentes reales queda para validar en un entorno con red completa.

---

## Etapa 3.1 — Vista de búsqueda (`/buscar`)

**Objetivo:** que el usuario busque un artista por nombre y llegue a su perfil,
ejercitando `findOrIngestArtist` de punta a punta desde la UI.

**Tareas técnicas**
- `src/app/(catalog)/buscar/page.tsx`: formulario de búsqueda (client component).
- `src/components/catalog/SearchForm.tsx`: input controlado + submit, con validación
  básica (no dispara request con input vacío).
- Al encontrar el artista, redirigir a `/artista/[id]`. Ante `ARTIST_NOT_FOUND`, mostrar
  `EmptyState`. Ante otros errores, `ErrorState`.
- Actualizar `src/app/page.tsx`: reemplaza el placeholder de la Fase 1 por el landing con
  el buscador.

**Archivos**
`src/app/(catalog)/buscar/page.tsx`, `src/components/catalog/SearchForm.tsx`,
`src/app/page.tsx` (modificado).

**Dependencias:** Etapa 3.0 completa. Sin brechas de backend (`search` ya existe).

**Criterios de aceptación**
- Buscar "Pink Floyd" navega al perfil de artista correspondiente.
- Buscar un nombre inexistente muestra estado vacío sin romper la app ni la consola.
- Buscar con el input vacío no dispara ningún request.

**Estado: 🔴 No iniciada.**

---

## Etapa 3.2 — Vista de perfil de artista (`/artista/[id]`)

**Objetivo:** mostrar la info del artista y su discografía, navegable hacia cada álbum.

**✅ Backend resuelto** — `GET /api/catalog/artist/[id]` y `getArtistById(id)` ya existen
(`src/services/catalog/ingest-artist.ts`, `src/app/api/catalog/artist/[id]/route.ts`),
validados con Postgres real: lee el artista por `id` propio, y si es un stub
(`type === 'unknown'`) lo enriquece contra MusicBrainz por id antes de responder
(`enrichIfUnknown`, compartida con `findOrIngestArtist`). Ya no bloquea esta etapa.

**Tareas técnicas**
- `src/app/(catalog)/artista/[id]/page.tsx` (Server Component): llama directo a
  `getArtistById` + `findOrIngestDiscography` (patrón de servicios directos, ver
  `01-frontend-architecture.md`).
- `src/components/catalog/ArtistHeader.tsx`: nombre, tipo, bio, foto si existe.
- `src/components/catalog/AlbumGrid.tsx` + `AlbumCard.tsx`: lista de `releaseGroups`.
- `src/components/catalog/LazyCoverImage.tsx`: carga progresiva de carátula por álbum
  (Opción C de la decisión pendiente en `00-backend-analysis.md` — cada card dispara su
  propia consulta a `release-group/[id]` para completar la carátula).

**Archivos**
`src/app/(catalog)/artista/[id]/page.tsx`,
`src/components/catalog/{ArtistHeader,AlbumGrid,AlbumCard,LazyCoverImage}.tsx`
(`src/services/catalog/ingest-artist.ts` y `src/app/api/catalog/artist/[id]/route.ts` ya
existen, sin cambios pendientes para esta etapa).

**Dependencias:** Etapa 3.0. Sin más brechas de backend ni decisiones pendientes.

**Criterios de aceptación**
- Visitar `/artista/<id-válido>` muestra nombre y discografía completa.
- Visitar un id inexistente muestra un 404 amigable, no una pantalla en blanco.
- Un artista stub (`type=unknown`) se enriquece automáticamente al visitarlo, igual que
  ocurre hoy al buscarlo por nombre.
- Las carátulas cargan progresivamente sin bloquear el render inicial de la página.

**Estado: 🔴 No iniciada** (código de frontend), **backend ya resuelto.**

---

## Etapa 3.3 — Vista de detalle de álbum (`/album/[id]`)

**Objetivo:** mostrar el tracklist completo de un álbum, con duración y carátula.

**Tareas técnicas**
- `src/app/(catalog)/album/[id]/page.tsx` (Server Component): llama directo a
  `findOrIngestTracklist` (mismo patrón de servicios directos). El `id` que recibe esta
  ruta es el id propio del `release_group` (el mismo que ya devuelve `releaseGroups[].id`
  en la respuesta de `search`) — confirmado consistente con la implementación actual de
  `release-group/[id]/route.ts`, sin ambigüedad ni bloqueante acá.
- `src/components/catalog/TrackList.tsx`: posición, título, duración formateada `mm:ss`.
- `src/components/catalog/AlbumCover.tsx`.
- Manejar el caso "no se encontraron ediciones" (`NO_EDITIONS_FOUND`).

**Sub-etapa 3.3b (créditos) — ✅ backend resuelto:** `release-group/[id]/route.ts` ya
incluye, por track, sus créditos (`feat.`) vía `JOIN` con `credit` + `artist` en una sola
query. Validado con Postgres real: "Breathe (In the Air)" muestra correctamente el crédito
`Pink Floyd feat. Roger Waters`. Solo queda el trabajo de frontend (consumir
`tracks[].credits` en `TrackList`).

**Archivos**
`src/app/(catalog)/album/[id]/page.tsx`,
`src/components/catalog/{TrackList,AlbumCover}.tsx`
(`src/app/api/catalog/release-group/[id]/route.ts` ya tiene los créditos, sin cambios
pendientes).

**Dependencias:** Etapa 3.0. Sin brechas de backend pendientes.

**Criterios de aceptación**
- (3.3a) Visitar `/album/<id-válido>` muestra el tracklist ordenado por disco/posición,
  con duración legible y carátula.
- (3.3a) Un álbum sin ediciones ingeribles muestra un estado vacío claro.
- (3.3b) Cada track con `feat.` muestra el crédito correspondiente, enlazado al artista.

**Estado: 🔴 No iniciada.**

---

## Etapa 3.4 — Navegación cruzada entre vistas

**Objetivo:** conectar buscar → artista → álbum entre sí, y las canciones a sus créditos.

**Tareas técnicas**
- `AlbumCard` → link a `/album/[id]`.
- `TrackList` → si hay un crédito distinto al artista principal del álbum, link a
  `/artista/[creditArtistId]` (requiere el id de artista en el crédito, disponible una vez
  resuelta la sub-etapa 3.3b).
- `src/components/layout/Header.tsx`: acceso al buscador desde cualquier página, agregado
  a `layout.tsx`.
- Breadcrumbs simples: Inicio > Artista > Álbum.

**Archivos**
`src/components/layout/Header.tsx`,
`src/components/catalog/{AlbumCard,TrackList}.tsx` (modificados),
`src/app/layout.tsx` (modificado).

**Dependencias:** Etapas 3.1, 3.2 y 3.3 completas.

**Criterios de aceptación**
- Flujo completo navegable sin escribir URLs a mano.
- Breadcrumbs reflejan la ruta actual en todo momento.
- Sin enlaces rotos, probado con el caso de referencia del roadmap (Pink Floyd / Roger
  Waters, el mismo usado en `scripts/smoke-test-ingestion.ts`).

**Estado: 🔴 No iniciada.**

---

## Etapa 3.5 — Vista de detalle de canción: diferida a Fase 4 (Camino A confirmado)

**Decisión de producto confirmada: Camino A.** La Fase 3 cierra el catálogo navegable en
el tracklist del álbum, sin página propia de canción. `GET /api/catalog/recording/[id]` y
`/cancion/[id]` se construyen en Fase 4, junto con el formulario de valoración/comentario
sobre la misma pantalla — evita reescribir la vista dos veces (una de solo lectura ahora,
otra con interacción después).

Queda anotado como decisión intencional, no como deuda pendiente. Ver
`docs/00-product/roadmap.md` (Fase 4) para cuando corresponda retomarlo.

**Estado: ✅ Resuelto — fuera de alcance de Fase 3, sin tareas acá.**

---

## Etapa 3.6 — Cierre de Fase 3: pulido, accesibilidad y responsive

**Objetivo:** dejar el catálogo navegable listo para revisión/testing con usuarios antes
de arrancar Fase 4.

**Tareas técnicas**
- Diseño responsive mobile-first (coherente con ADR 0001 — PWA).
- Estados de carga consistentes (skeletons) en las tres vistas.
- `src/app/error.tsx` y `src/app/not-found.tsx` (boundaries globales de Next.js).
- `loading.tsx` por ruta donde aplique.
- Auditoría básica de accesibilidad: `alt` en carátulas, labels en el formulario de
  búsqueda, contraste de color.
- Confirmar que `next/image` está bien configurado (`images.remotePatterns` con
  `coverartarchive.org` en `next.config.mjs`) — sin esto `next build` advierte o falla.

**Archivos**
`src/app/error.tsx`, `src/app/not-found.tsx`, `src/app/(catalog)/*/loading.tsx`,
`next.config.mjs` (modificado), ajustes varios de componentes ya creados.

**Dependencias:** Etapas 3.1 a 3.4 completas (y 3.5 según lo que se decida).

**Criterios de aceptación**
- Sin errores de consola en ningún flujo del roadmap de referencia.
- `npm run build` sin warnings de `next/image`.
- Revisión manual en viewport móvil sin overflow horizontal ni texto cortado.

**Estado: 🔴 No iniciada.**
