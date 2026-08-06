# Etapa 2 — Plan de implementación paso a paso

**Objetivo:** construir el catálogo navegable de la Fase 3 (`buscar → artista → álbum →
canción`) en etapas pequeñas, cada una con un criterio de aceptación verificable, sin
avanzar a la siguiente hasta cerrar la anterior.

**Estado general: 🟡 En progreso.** Etapas 3.0, 3.0b, 3.1 y 3.2 completas. Lista para Etapa 3.3.
Los bloqueantes de `00-backend-analysis.md` quedaron resueltos desde antes.

Leyenda de estado: 🔴 no iniciada · 🟡 en progreso · 🟢 completa · ⚪ pendiente de decisión.

---

## Etapa 3.0 — Fundaciones del frontend

*(sin cambios respecto a la versión anterior de este documento — ver detalle completo más abajo)*

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

**Estado: 🟢 Completa.**

Construido: `src/components/catalog/SearchForm.tsx` (componente cliente con validación local,
mapeo de `ApiError.code` a mensajes propios, estados de carga/vacío/error y navegación a
`/artista/<id>`), `src/app/(catalog)/buscar/page.tsx` (vista pública), y actualización de
`src/app/page.tsx` (landing con buscador). Tests: 12/12 pasando (búsqueda válida, input vacío,
espacios, `ARTIST_NOT_FOUND`, `INTERNAL_ERROR`, accesibilidad, sin requests duplicados).

**Validado:** `typecheck` (0 errores), `lint` (0 errores, 2 warnings pre-existentes en `scripts/`),
`test` (12/12), `build` (6 rutas, `/buscar` presente). Revisión de Revisor: aprobado tras corregir
uso de `as` para cast de tipo (línea 59 original) y `aria-busy` redundante en `<Input>`.

> ⚠️ **Nota post-cierre (ver Etapa 3.0b):** esta etapa se construyó antes de confirmar soporte
> multi-idioma (ADR 0007). Los archivos listados arriba (`SearchForm.tsx`, `buscar/page.tsx`,
> `page.tsx`, `SearchForm.test.tsx`) quedan **modificados por la Etapa 3.0b** como retrofit: los
> strings hardcodeados en español pasan a `messages/{locale}/catalog.json` /
> `messages/{locale}/errors.json`, la ruta `/buscar` se renombra a `/search`, y el import de
> `useRouter` pasa de `next/navigation` a `src/i18n/navigation.ts`. La Etapa 3.1 en sí no se
> reabre como trabajo nuevo — el retrofit es el alcance completo de 3.0b, documentado abajo.

---

## Etapa 3.0b — Retrofit de internacionalización (i18n)

**Objetivo:** introducir el sistema de idiomas (español + inglés, extensible a futuros locales)
sobre el código ya construido en Etapa 3.1, antes de escribir las Etapas 3.2 en adelante —
para no tener que repetir este mismo retrofit sobre más componentes cada vez que se agregue una
vista nueva.

**Bloqueante:** requiere ADR 0007 (i18n: next-intl + segmento `[locale]`) aceptado — ✅ ya
aceptado. No se avanza a 3.2 sin cerrar esta etapa. Ver `docs/02-architecture/i18n.md` para la
arquitectura completa; este bloque documenta solo el plan de ejecución sobre archivos
existentes.

**Tareas técnicas**

- Instalar `next-intl`.
- Reestructurar rutas bajo `src/app/[locale]/...`: mover `layout.tsx`, `page.tsx`,
  `providers.tsx`, `error.tsx` (aún no existe, nace ya bajo `[locale]` en 3.6), `not-found.tsx`
  (ídem) y el route group `(catalog)` un nivel adentro del nuevo segmento dinámico.
- Renombrar `src/app/(catalog)/buscar/` → `src/app/[locale]/(catalog)/search/` (ver decisión de
  slugs en ADR 0007 / `conventions.md`).
- Crear `src/i18n/routing.ts`, `src/i18n/request.ts`, `src/i18n/navigation.ts` (ver `i18n.md`
  §2–5 para el contenido de cada uno).
- Crear `src/middleware.ts`: detección de idioma y redirección al segmento `[locale]`.
- Crear catálogos de mensajes iniciales:
  - `messages/es/{common,catalog,errors}.json`
  - `messages/en/{common,catalog,errors}.json`
  - `catalog.json` nace con el namespace `search` (extraído de los strings hoy hardcodeados en
    `SearchForm.tsx` y `buscar/page.tsx`).
  - `errors.json` nace con las 5 entradas de `ErrorCodeSchema` (`docs/04-api/errors.md`),
    reemplazando el objeto `ERROR_MESSAGES` local que hoy vive dentro de `SearchForm.tsx`.
- Modificar `SearchForm.tsx`:
  - Todos los strings visibles (`fieldLabel`, `placeholder`, `submit`, `submitting`,
    `validationEmpty`, `loadingHint`, `searchAgain`) pasan a `useTranslations("search")`.
  - El mapeo `ERROR_MESSAGES` local se reemplaza por `useTranslations()` contra `errors.json`.
  - El import de `useRouter` pasa de `next/navigation` a `src/i18n/navigation.ts` (crítico:
    sin este cambio, la navegación a `/artista/[id]` pierde el prefijo de locale).
- Modificar `buscar/page.tsx` → `search/page.tsx`: título de página vía `useTranslations`.
- Modificar `src/app/page.tsx`: tagline/nombre de app vía `useTranslations("common")`.
- Modificar `src/components/ui/ErrorState.tsx` y `EmptyState.tsx`: `title`/`description` pasan
  de opcionales-con-default-en-español a **requeridos**, sin valor por defecto — el caller
  (`SearchForm`) debe resolver el texto por locale antes de pasarlo.
- Modificar `src/app/layout.tsx`: recibe `locale` desde `params`, pasa `lang={locale}` al
  `<html>` (hoy fijo en `"es"`), envuelve en `NextIntlClientProvider`.
- Crear `src/test/i18n-test-utils.tsx`: `renderWithIntl(ui, locale?)`.
- Modificar `SearchForm.test.tsx`: reemplazar `render()` por `renderWithIntl()`; las
  aserciones de texto pasan a leer de `messages/es/*.json` en vez de repetir el string
  literal; el mock de `next/navigation` pasa a mockear `src/i18n/navigation.ts`.
- Crear test de consistencia de claves entre `messages/es/` y `messages/en/` (namespace por
  namespace, recursivo).
- Actualizar `next.config.mjs` con el plugin de `next-intl`.

**Documentación a actualizar en el mismo cambio**

| Documento | Cambio |
|---|---|
| `docs/02-architecture/conventions.md` | ✅ Sección "Internacionalización" agregada |
| `docs/02-architecture/i18n.md` | ✅ Creado |
| `docs/02-architecture/adr/0007-i18n-next-intl.md` | ✅ Creado |
| `docs/02-architecture/frontend-plan/03-best-practices.md` | ✅ Sección i18n + patrón `renderWithIntl` agregados |
| `docs/04-api/errors.md` | ✅ Nota sobre `errors.json` agregada |
| `docs/02-architecture/code-walkthrough.md` | ✅ Entrada del retrofit de i18n documentada |
| `docs/01-domain/business-rules.md` | ✅ Regla agregada: datos del catálogo musical no se traducen |
| `docs/05-features/catalog-browsing.md` | ✅ Nota de i18n agregada |

**Archivos**

`src/i18n/{routing,request,navigation}.ts` (nuevos), `src/middleware.ts` (nuevo),
`messages/es/*.json`, `messages/en/*.json` (nuevos), `src/test/i18n-test-utils.tsx` (nuevo),
`src/app/[locale]/layout.tsx`, `.../page.tsx`, `.../providers.tsx` (movidos + modificados),
`src/app/[locale]/(catalog)/search/page.tsx` (movido desde `buscar/`, modificado),
`src/components/catalog/SearchForm.tsx` (modificado), `SearchForm.test.tsx` (modificado),
`src/components/ui/{ErrorState,EmptyState}.tsx` (modificados), `next.config.mjs`,
`package.json`.

**Dependencias:** Etapa 3.0 y 3.1 completas. ADR 0007 aceptado.

**Criterios de aceptación**

- `npm run typecheck && npm run lint && npm run test && npm run build` pasan.
- Visitar `/` redirige a `/es` (locale por defecto) sin configuración explícita del navegador.
- Visitar `/en` sirve el mismo landing en inglés.
- `/es/search` responde (ruta renombrada); `/buscar` ya no existe.
- Buscar "Pink Floyd" en `/en/search` navega a `/en/artist/...` preservando el locale (valida el
  cambio de `useRouter`).
- `ErrorState`/`EmptyState` no compilan si un caller omite `title`/`description`.
- Los 12 tests de `SearchForm.test.tsx` siguen en 12/12, ahora vía `renderWithIntl` y leyendo
  texto desde `messages/es/`.
- `messages/en/*.json` tiene exactamente las mismas claves que `messages/es/*.json` en cada
  namespace — verificado por el test de consistencia, no solo por inspección manual.

**Estado: 🟢 Completa.**

---

## Etapa 3.2 — Vista de perfil de artista (`/artist/[id]`)

**Objetivo:** mostrar la info del artista y su discografía, navegable hacia cada álbum.

> **Nota de i18n (agregada tras ADR 0007):** el slug de esta ruta es `/artist/[id]` (inglés),
> no `/artista/[id]` como decía la versión original de este plan — ver `conventions.md`. Todo
> texto nuevo de `ArtistHeader.tsx`, `AlbumGrid.tsx`, `AlbumCard.tsx` va al namespace `artist` de
> `messages/{locale}/catalog.json` (nuevo namespace, sub-clave de `catalog`, mismo patrón que
> `search`). Ningún string se hardcodea — ver `docs/02-architecture/i18n.md`.

**✅ Backend resuelto** — `GET /api/catalog/artist/[id]` y `getArtistById(id)` ya existen
(`src/services/catalog/ingest-artist.ts`, `src/app/api/catalog/artist/[id]/route.ts`),
validados con Postgres real: lee el artista por `id` propio, y si es un stub
(`type === 'unknown'`) lo enriquece contra MusicBrainz por id antes de responder
(`enrichIfUnknown`, compartida con `findOrIngestArtist`). Ya no bloquea esta etapa.

**Tareas técnicas**

- `src/app/[locale]/(catalog)/artist/[id]/page.tsx` (Server Component): llama directo a
  `getArtistById` + `findOrIngestDiscography` (patrón de servicios directos, ver
  `01-frontend-architecture.md`).
- `src/components/catalog/ArtistHeader.tsx`: nombre, tipo, bio, foto si existe. El nombre y bio
  del artista **no se traducen** (dato de MusicBrainz); las etiquetas de tipo ("Persona",
  "Grupo") sí, vía `useTranslations("artist")`.
- `src/components/catalog/AlbumGrid.tsx` + `AlbumCard.tsx`: lista de `releaseGroups`. Los
  nombres de categoría ("De estudio", "Singles/EP", etc.) van al namespace `artist`.
- `src/components/catalog/LazyCoverImage.tsx`: carga progresiva de carátula por álbum
  (Opción C de la decisión pendiente en `00-backend-analysis.md` — cada card dispara su
  propia consulta a `release-group/[id]` para completar la carátula).

**Archivos**

`src/app/[locale]/(catalog)/artist/[id]/page.tsx`,
`src/components/catalog/{ArtistHeader,AlbumGrid,AlbumCard,LazyCoverImage}.tsx`,
`messages/{es,en}/catalog.json` (namespace `artist` agregado)
(`src/services/catalog/ingest-artist.ts` y `src/app/api/catalog/artist/[id]/route.ts` ya
existen, sin cambios pendientes para esta etapa).

**Dependencias:** Etapa 3.0, 3.0b (i18n) y 3.1 completas. Sin más brechas de backend ni
decisiones pendientes.

**Criterios de aceptación**

- Visitar `/es/artist/<id-válido>` y `/en/artist/<id-válido>` muestra nombre y discografía
  completa, con etiquetas de UI en el idioma correspondiente.
- Visitar un id inexistente muestra un 404 amigable, no una pantalla en blanco, con mensaje
  traducido según el locale.
- Un artista stub (`type=unknown`) se enriquece automáticamente al visitarlo, igual que
  ocurre hoy al buscarlo por nombre.
- Las carátulas cargan progresivamente sin bloquear el render inicial de la página.
- Ningún string nuevo queda hardcodeado fuera de `messages/`.

**Estado: 🟢 Completa.** Frontend construido y validado en `fase-3-2-vista-perfil-artista`,
archivado en `openspec/changes/archive/2026-08-05-fase-3-2-vista-perfil-artista/`; specs
sincronizadas en `openspec/specs/catalog-artist/spec.md`.

> **Nota post-Revisor (3.2):** `01-frontend-architecture.md` y el `design.md` de este change
> mencionan un `error.tsx` (boundary de error) que todavía no existe en el repo. Un fallo
> inesperado en SSR (ej. MusicBrainz caído durante `findOrIngestDiscography`) terminaría en el
> error por defecto de Next, no en una página localizada. No es un criterio de 3.2; se agrega
> como debt anotado para la Etapa 3.3 (o un `error.tsx` global hacia `01-frontend-architecture.md:40`).

---

## Etapa 3.3 — Vista de detalle de álbum (`/album/[id]`)

**Objetivo:** mostrar el tracklist completo de un álbum, con duración y carátula.

> **Nota de i18n:** namespace `album` en `catalog.json`, mismo patrón que `search`/`artist`.
> Títulos de canción no se traducen; etiquetas de UI ("Créditos", "Duración") sí.

**Estado: 🟢 Completa.**

Construido: `src/services/catalog/album-detail.ts` (read-model compartido que resuelve
`release_group`, edición seleccionada, carátula, tracklist ordenado por disco/posición y
créditos), `src/app/[locale]/(catalog)/album/[id]/page.tsx` (Server Component que consume
el read-model directamente), `src/components/catalog/AlbumCover.tsx` (carátula con
`next/image` y fallback accesible), `src/components/catalog/TrackList.tsx` (tracklist
agrupado visualmente por disco, con duración formateada `mm:ss` y créditos como texto
sin enlaces — los enlaces quedan para 3.4). Namespace `album` agregado a
`messages/{es,en}/catalog.json`. El endpoint REST `GET /api/catalog/release-group/[id]`
fue refactorizado para consumir el mismo read-model, conservando el shape público actual.

**Validado:** `typecheck` (0 errores), `lint` (0 errores nuevos), `test` (48/48), `build`
(8 rutas, `/[locale]/album/[id]` presente). Tests agregados: route handler (4 casos:
`ALBUM_NOT_FOUND`, `NO_EDITIONS_FOUND`, detalle completo, shape público), `TrackList`
(5 casos: un disco, multidisco, sin encabezado de disco único, duración nula, locale),
`TrackList.credits` (3 casos: créditos visibles sin enlaces, sin créditos adicionales,
múltiples créditos), `AlbumCover` (3 casos: carátula disponible, ausente, accesible),
página (3 casos: título sin traducir, etiquetas localizadas, créditos como texto).

**Archivos**

`src/services/catalog/album-detail.ts` (nuevo),
`src/app/[locale]/(catalog)/album/[id]/page.tsx` (nuevo),
`src/components/catalog/{AlbumCover,TrackList}.tsx` (nuevos),
`src/app/api/catalog/release-group/[id]/route.ts` (refactorizado para usar read-model),
`src/lib/api/schemas.ts` (`TrackSchema` actualizado con `recordingId`),
`messages/{es,en}/catalog.json` (namespace `album` agregado),
tests: `route.test.ts`, `TrackList.test.tsx`, `TrackList.credits.test.tsx`,
`AlbumCover.test.tsx`, `page.test.tsx`.

**Nota sobre 3.3b (créditos):** los créditos se muestran como texto (ej. "feat. Roger
Waters"), sin enlaces hacia perfiles de artistas. Los enlaces quedan explícitamente
reservados para la Etapa 3.4 (navegación cruzada entre vistas).

**Dependencias:** Etapa 3.0, 3.0b (i18n) y 3.1 completas. Sin brechas de backend pendientes.

**Criterios de aceptación**

- (3.3a) ✅ Visitar `/{locale}/album/<id-válido>` muestra el tracklist ordenado por
  disco/posición, con duración legible y carátula, en el idioma correspondiente.
- (3.3a) ✅ Un álbum sin ediciones ingeribles muestra un estado vacío claro, traducido.
- (3.3b) ✅ Cada track con `feat.` muestra el crédito correspondiente como texto (enlaces
  diferidos a 3.4).
- ✅ Ningún string nuevo queda hardcodeado fuera de `messages/`.

---

## Etapa 3.4 — Navegación cruzada entre vistas

**Objetivo:** conectar buscar → artista → álbum entre sí, y las canciones a sus créditos.

**Tareas técnicas**

- `AlbumCard` → link a `/album/[id]` vía `Link` de `src/i18n/navigation.ts` (nunca
  `next/link` directo — preserva el locale).
- `TrackList` → si hay un crédito distinto al artista principal del álbum, link a
  `/artist/[creditArtistId]` (requiere el id de artista en el crédito, disponible una vez
  resuelta la sub-etapa 3.3b).
- `src/components/layout/Header.tsx`: acceso al buscador desde cualquier página, agregado
  a `layout.tsx`. Incluye el selector de idioma (`es`/`en`) preparado desde la Etapa 3.0b.
- Breadcrumbs simples: Inicio > Artista > Álbum, traducidos vía `useTranslations("common")`.

**Archivos**

`src/components/layout/Header.tsx`,
`src/components/catalog/{AlbumCard,TrackList}.tsx` (modificados),
`src/app/[locale]/layout.tsx` (modificado).

**Dependencias:** Etapas 3.0b, 3.1, 3.2 y 3.3 completas.

**Criterios de aceptación**

- Flujo completo navegable sin escribir URLs a mano, en cualquiera de los dos locales.
- Cambiar de idioma desde el selector preserva la ruta actual (ej. `/es/album/123` →
  `/en/album/123`).
- Breadcrumbs reflejan la ruta actual en todo momento, traducidos.
- Sin enlaces rotos, probado con el caso de referencia del roadmap (Pink Floyd / Roger
  Waters, el mismo usado en `scripts/smoke-test-ingestion.ts`).

**Estado: 🔴 No iniciada.**

---

## Etapa 3.5 — Vista de detalle de canción: diferida a Fase 4 (Camino A confirmado)

**Decisión de producto confirmada: Camino A.** La Fase 3 cierra el catálogo navegable en
el tracklist del álbum, sin página propia de canción. `GET /api/catalog/recording/[id]` y
`/song/[id]` (slug neutro, ver ADR 0007) se construyen en Fase 4, junto al formulario de
valoración/comentario sobre la misma pantalla — evita reescribir la vista dos veces.

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
- `src/app/[locale]/error.tsx` y `src/app/[locale]/not-found.tsx` (boundaries globales de
  Next.js, ya nacen bajo el segmento `[locale]` desde la Etapa 3.0b — traducidos vía
  `useTranslations`).
- `loading.tsx` por ruta donde aplique.
- Auditoría básica de accesibilidad: `alt` en carátulas (traducido cuando describe contenido
  de UI, no cuando describe el álbum en sí), labels en el formulario de búsqueda, contraste
  de color.
- Confirmar que `next/image` está bien configurado (`images.remotePatterns` con
  `coverartarchive.org` en `next.config.mjs`) — sin esto `next build` advierte o falla.

**Archivos**

`src/app/[locale]/error.tsx`, `src/app/[locale]/not-found.tsx`,
`src/app/[locale]/(catalog)/*/loading.tsx`, `next.config.mjs` (modificado), ajustes varios de
componentes ya creados.

**Dependencias:** Etapas 3.0b, 3.1 a 3.4 completas (y 3.5 según lo que se decida).

**Criterios de aceptación**

- Sin errores de consola en ningún flujo del roadmap de referencia, en ninguno de los dos
  locales.
- `npm run build` sin warnings de `next/image`.
- Revisión manual en viewport móvil sin overflow horizontal ni texto cortado, en `es` y `en`.

**Estado: 🔴 No iniciada.**
