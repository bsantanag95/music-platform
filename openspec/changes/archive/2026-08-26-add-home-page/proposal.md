## Why

Hoy `/[locale]` (`src/app/[locale]/page.tsx`) es un landing genérico — tagline + buscador —
idéntico para cualquier visitante, logueado o no. Se ve como un buscador de catálogo frío
(el problema que `00-product/vision.md` señala en RateYourMusic/Discogs), sin comunicar la
propuesta social del producto ni distinguir a un usuario con sesión activa. El diseño de la
página de Inicio ya quedó cerrado y documentado en `docs/05-features/home.md`; este cambio
lo implementa.

## What Changes

- `src/app/[locale]/page.tsx` deja de ser un landing estático y pasa a componer contenido
  según haya sesión o no.
- **Común a ambos estados:**
  - Bloque de **actividad reciente de la comunidad**: ratings y comentarios públicos
    recientes de cualquier usuario con perfil público (no solo seguidos).
  - Bloque de **listas públicas recientes**: listas (`audience: "public"`) de cualquier
    usuario con perfil público.
- **Exclusivo de usuario logueado:**
  - Preview compacto del feed de seguidos (reusa `listFeed`), con link a `/me/feed`.
  - Si el usuario no sigue a nadie todavía, ese espacio se reemplaza por un nudge de
    onboarding (buscar gente, explorar listas) en vez de un feed vacío.
  - Accesos rápidos a diario, favoritos, listas y buscador.
- **Exclusivo de visitante anónimo:** tagline + buscador (ya existentes) + CTA a
  registro/login.
- Dos fuentes de datos nuevas en `src/services/home/home.ts`: `listCommunityActivity`
  (ratings + comentarios, sin filtro de seguidos) y `listPublicLists` (listas públicas, sin
  filtro de seguidos). Ambas filtran por `appUser.profileVisibility = 'public'` en el autor
  y, si hay usuario logueado, excluyen bloqueos en cualquier dirección. Sin paginación:
  devuelven un top-N fijo pensado para un preview, no para una vista completa.
- Se extrae el render por tipo de entrada de `FeedList` a un componente reutilizable
  (`FeedEntryBody`) para no duplicar la lógica de las cinco variantes de `FeedEntry` entre
  `/me/feed` y los bloques nuevos de Inicio.
- Nuevo namespace de mensajes `home` (`messages/{es,en}/home.json`), registrado en
  `src/i18n/request.ts`.

## Capabilities

### New Capabilities
- `home`: composición de la página de Inicio según sesión — bloques comunes (actividad de
  la comunidad, listas públicas) y bloques exclusivos de usuario logueado (preview de feed,
  onboarding si no sigue a nadie, accesos rápidos) o anónimo (CTA de registro).

### Modified Capabilities

(ninguna — `listFeed` y el contrato de `/api/me/feed` no cambian; los bloques nuevos son
lecturas propias sin exponer un endpoint HTTP nuevo, ver Impact)

## Impact

- **Código:** `src/app/[locale]/page.tsx` (reescritura completa), `src/services/home/home.ts`
  (nuevo), `src/components/home/*` (nuevo: bloques de Inicio), `src/components/feed/FeedList.tsx`
  (extracción de `FeedEntryBody`), `src/components/feed/FeedEntryBody.tsx` (nuevo),
  `src/i18n/request.ts`, `messages/{es,en}/home.json` (nuevo), `messages/{es,en}/common.json`
  (textos de accesos rápidos y CTA si hacen falta).
- **API:** ninguna ruta HTTP nueva — los bloques de Inicio se resuelven en el Server
  Component vía funciones de servicio, sin interacción cliente (no hay "cargar más" en
  Inicio; esa experiencia completa ya vive en `/me/feed`, `/me/lists`, etc.).
- **Esquema:** ninguno — reusa `rating`, `comment`, `user_list`, `app_user` tal como están.
- **Documentación:** `docs/05-features/home.md` (actualizar estado a implementado) y
  `docs/05-features/README.md` (índice).
