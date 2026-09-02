## Why

Hoy la búsqueda de catálogo solo es accesible de dos formas: un link de texto "Buscar" en el
Header que lleva a `/search` (sin input real, exige una navegación antes de poder escribir),
y el `SearchForm` completo embebido en el hero de Inicio — visible tanto para visitantes sin
sesión como para usuarios logueados. Esto deja dos problemas: (1) buscar desde cualquier otra
página (perfil, feed, diario) requiere un salto extra a `/search` en vez de un input siempre
disponible; (2) para un usuario logueado, el buscador del hero de Inicio duplica el acceso que
ya existe en el quick link "buscar" (`docs/05-features/home.md`) y vuelve a instalar la
búsqueda como protagonista de Inicio — justo lo que el diseño de Inicio buscó evitar
(`00-product/vision.md` señala como problema que el producto se sienta "ante todo un buscador
de catálogo", el caso RateYourMusic/Discogs). Centralizar el buscador en cada header
repetiría ese mismo protagonismo en toda la app, no solo en Inicio, por eso la solución es un
input compacto en el costado del Header, no uno centralizado.

## What Changes

- Nuevo componente de búsqueda compacto y persistente en el Header (costado izquierdo, junto
  al lugar del link actual "Buscar"), visible para cualquier sesión. En éxito navega directo
  a `/artist/<id>`; en fallo (no encontrado o error) navega a `/search?q=<valor>` en vez de
  duplicar los estados de `EmptyState`/`ErrorState` en una franja de header donde no caben.
- `/search` pasa a leer un `searchParam` `q` opcional y lo usa como valor inicial de
  `SearchForm`, que al montar con ese valor no vacío autoejecuta la búsqueda una sola vez
  (misma lógica que el submit manual, sin duplicar código).
- El `SearchForm` del hero de Inicio (`src/app/[locale]/page.tsx`) pasa a mostrarse solo para
  visitantes sin sesión, agrupado con el CTA de registro/login que ya está condicionado a
  `!user`.

## Capabilities

### New Capabilities
- `header-search`: entrada de búsqueda compacta y persistente en el Header, disponible en
  toda la app para cualquier sesión, con resolución directa a artista o fallback a `/search`.

### Modified Capabilities
- `catalog-search`: `SearchForm` gana un modo de autoejecución a partir de un `initialQuery`
  (usado por `/search?q=`), sin cambiar su comportamiento de envío manual existente.
- `home`: el buscador del hero deja de mostrarse a usuarios con sesión activa (antes era
  visible para cualquier visitante).

## Impact

- `src/components/layout/Header.tsx` — reemplaza el link "Buscar" por el nuevo componente.
- `src/components/catalog/SearchForm.tsx` — acepta `initialQuery` y autoejecuta al montar.
- `src/app/[locale]/(catalog)/search/page.tsx` — lee `searchParams.q` y lo pasa a `SearchForm`.
- `src/app/[locale]/page.tsx` — gatea el `SearchForm` del hero a `!user`.
- Nuevo componente `src/components/layout/HeaderSearch.tsx` (o similar).
- `messages/{es,en}/common.json` y/o `catalog.json` — labels del input compacto.
- `docs/05-features/home.md` — nota técnica sobre el buscador del hero acotado a anónimos.
- Sin cambios de esquema de base de datos ni de contratos REST existentes (reutiliza
  `searchCatalog` / `GET /api/catalog/search`).
