## Context

`/[locale]/lists` es la superficie pública de descubrimiento de listas (`community-lists`),
accesible con y sin sesión. Hoy compone cuatro secciones fijas —Destacadas, Populares, De usuarios
seguidos (solo con sesión) y Recientes—, omitiendo las vacías, y cada una se hidrata en el servidor
con su primera página y pagina en el cliente vía `useInfiniteQuery` sobre
`GET /api/lists/{discover,popular,from-following}`. El servicio `listDiscoverLists`
(`src/services/lists/discovery.ts`) define la visibilidad del listado público: audiencia `public`,
perfil `public`, `moderation_status = visible`, sin bloqueos, sin listas propias cuando hay sesión,
y excluye retiradas (`official_withdrawn_at IS NULL`).

Las listas editoriales oficiales (`is_official = true`, dueño `@exploracion`, audiencia forzada
`public`) ya viajan en el mismo listado público y la tarjeta `CommunityListCard` ya las distingue
con la insignia "Oficial". Sin embargo: (a) no hay forma de filtrar ni ordenar la superficie, y
(b) "Destacadas" lee solo `user_list_featured`, por lo que una lista oficial publicada no aparece
en la sección curada salvo que además tenga fila de destacado.

La dirección visual vigente es "The Vinyl Listening Room" (`DESIGN.md`): fondo `ink`, superficies
`ink-surface`, hairlines `ink-border`, tipografía Space Grotesk / Source Serif 4 / IBM Plex Mono,
acento ámbar escaso, sin sombras ni gradientes, respeto de `prefers-reduced-motion` y foco visible.

## Goals / Non-Goals

**Goals:**

- Permitir filtrar (texto y tipo de entidad) y ordenar (Populares / Recientes) la superficie
  pública, con estado en la URL, sin introducir recomendación algorítmica.
- Conservar la composición editorial por secciones como estado por defecto ("vitrina").
- Que las listas editoriales oficiales publicadas aparezcan en "Destacadas".
- Reutilizar la maquinaria existente de listado público, paginación e hidratación; sin migraciones
  ni dependencias nuevas.
- Mantener `pnpm run typecheck && lint && test && build` en verde.

**Non-Goals:**

- Crear, editar o guardar listas desde `/lists` (sigue siendo de `/[locale]/me/lists`).
- Un buscador de catálogo para agregar ítems a listas.
- Cambiar la estructura de `/[locale]/me/lists` o sus pestañas.
- Ranking numerado, contadores de posición o cualquier mecánica competitiva.
- Un rediseño completo de `ListCard`/`CommunityListCard` (solo ajustes necesarios).

## Decisions

### 1. Dos estados de presentación de la misma ruta, derivados de la URL

`/lists` tendrá **vitrina** (sin parámetros de filtro) y **explorar** (con al menos uno de
`q`, `type`, `sort`). En vitrina se renderiza la composición por secciones actual; en explorar se
renderiza una única grilla paginada de resultados.

- **Por qué:** el brief pide "filtrar y explorar" como acción primaria y un orden global
  (Populares / Recientes). Un orden global es incoherente con cuatro secciones que ya definen su
  propio orden (Populares por guardados, Recientes cronológico). Separar ambos estados evita esa
  contradicción sin eliminar la curaduría.
- **Alternativa descartada:** aplicar `q`/`type` a cada sección en su lugar y sumar `sort`. Deja
  dos órdenes en conflicto por sección y una UX ambigua.
- **Alternativa descartada:** convertir `/lists` siempre en una grilla única. Elimina la
  composición editorial que el producto ya tiene y que el brief pide conservar.

### 2. Contrato de URL

`?q=<texto>&type=<artist|release-group|recording>&sort=<popular|recent>`.

- `sort` ausente se interpreta como `recent` (cronológico, alineado con `list-discovery`).
- Explorar se activa si `q`, `type` o `sort` están presentes. `sort` sin `q`/`type` también entra
  en explorar (el visitante pidió un orden global).
- "Limpiar filtros" navega a `/lists` sin parámetros y vuelve a vitrina.
- Los valores inválidos se tratan como ausentes (no rompen la página) y la API responde `400`
  `VALIDATION_ERROR` si se le envían por HTTP directo.

### 3. Extender `GET /api/lists/discover` en lugar de crear un endpoint nuevo

El endpoint gana los parámetros opcionales `q`, `entityType` y `sort`. Sin ellos, su contrato y
orden cronológico actuales no cambian (lo siguen consumiendo la pestaña "Descubrir" de `/me/lists`
y la sección "Recientes").

- **Por qué:** reutiliza la definición de visibilidad pública, la hidratación (`enrichPublicLists`)
  y la paginación ya probadas; evita un endpoint casi idéntico. El cambio es aditivo y no rompe
  consumidores.
- **Alternativa descartada:** `GET /api/lists/explore` nuevo. Duplicaría la lógica de visibilidad o
  forzaría a extraerla sin beneficio real.

### 4. Semántica de `sort=popular`

Se ordena por conteo agregado de guardados descendente y, a igualdad, por fecha de creación
descendente. A diferencia de la sección "Populares" (que hace `INNER JOIN listSave` y excluye
listas con 0 guardados), explorar **incluye** las listas sin guardados al final, porque un filtro
de exploración debe mostrar todo lo que coincide. El conteo se agrega con un `LEFT JOIN`/subconsulta
sobre `list_save` y se apoya en `idx_list_save_list`. Se documenta la diferencia en
`docs/04-api/contracts.md`.

### 5. Hidratación servidor + paginación cliente

`page.tsx` (Server Component) parsea `searchParams`, resuelve la sesión y, en explorar, obtiene la
primera página con `listDiscoverLists(viewerId, 1, 20, filters)` para pasarla como `initialData` a
un componente cliente (`CommunityExploreGrid`) que pagina con `useInfiniteQuery`, igual que
`CommunityListSection`. El toolbar (`CommunityListsToolbar`) es cliente y escribe la URL con
`router.replace(..., { scroll: false })`, debounce de 300 ms para el texto y `startTransition`; el
estado de filtros se lee con `useSearchParams` (envuelto en `Suspense`).

- **Por qué:** mantiene SSR de la primera página, la consistencia con las secciones existentes y
  TanStack Query solo para datos posteriores al primer render.

### 6. "Destacadas" incluye las listas editoriales oficiales

`listFeaturedLists` devuelve, primero, las listas oficiales publicadas (visibles, audiencia
`public`, perfil público, no retiradas) y, luego, las destacadas de `user_list_featured` por `rank`
ascendente, deduplicando por `id`. La distinción sigue siendo la insignia "Oficial" de la tarjeta.

- **Por qué:** materializa la decisión de producto "editorial dentro de Destacadas" sin crear un
  bloque nuevo ni tocar el modelo de datos (no se exige insertar en `user_list_featured`).
- **Alternativa descartada:** insertar filas en `user_list_featured` al publicar. Acopla la
  publicación editorial a la curaduría manual y agrega una migración/escritura no pedida.

### 7. Accesibilidad e i18n

Controles con `label`/`aria-label`, el conteo de resultados en `role="status"` con `aria-live`,
estados de foco visibles (ámbar) y sin animaciones no esenciales. Nuevas claves en
`messages/{es,en}/lists.json` bajo `lists.community.*`; los datos (títulos, usuarios) no se traducen.

## Risks / Trade-offs

- [Duplicados entre Destacadas y Populares/Recientes] → Ya ocurre hoy con las listas destacadas; se
  acepta como parte de la composición editorial. La deduplicación es solo dentro de Destacadas.
- [Costo del orden por guardados] → `list_save` ya tiene `idx_list_save_list`; el volumen actual es
  bajo. Si crece, se puede materializar el conteo, pero no ahora (evitar sobre-ingeniería).
- [`useSearchParams` y prerenderizado] → Requiere `Suspense`; se sigue el patrón ya usado en el
  proyecto y se verifica con `next build`.
- [Dos definiciones de "popular"] → La sección "Populares" (con ≥1 guardado) y el orden explorar
  (todos, 0 guardados al final) difieren; se documenta explícitamente para que la diferencia sea
  intencional y no un bug percibido.
- [Listas oficiales en Destacadas cuando no hay destacadas] → La sección se muestra si hay al menos
  una oficial o una destacada; el estado vacío global se mantiene cuando no hay nada.

## Migration Plan

No aplica migración de datos. El endpoint es retrocompatible (parámetros opcionales) y la vista
mantiene su comportamiento sin filtros. Rollback = revertir el cambio de código; no hay estado
persistido que deshacer.

## Open Questions

- Ninguna bloqueante. Queda diferido, sin compromiso, si en el futuro un filtro "De la gente que
  seguís" debe incorporarse como fuente dentro del estado explorar.
