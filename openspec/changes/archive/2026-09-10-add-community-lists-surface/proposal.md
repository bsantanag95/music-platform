## Why

El descubrimiento de listas de la comunidad hoy vive escondido en una pestaña de `/me/lists`
(solo con sesión, solo orden cronológico). La barra general del Header —lo que el sitio
ofrece a cualquiera— quedó con Buscador y Explorar tras `regroup-authenticated-header`, y el
sprint de continuación acordado era sumar "Listas" como superficie de descubrimiento propia,
al estilo de la pestaña Lists de Letterboxd. Las listas son curaduría humana: el mejor
antídoto contra el "buscador frío" que la visión del producto quiere evitar, y no tienen
hoy ninguna vitrina pública.

## What Changes

- **Nueva superficie pública `/[locale]/lists`**, accesible con y sin sesión, enlazada desde
  la barra general del Header junto a Explorar.
- La superficie compone, en este orden, las secciones que tengan contenido:
  1. **Destacadas** — listas con fila en `user_list_featured` (curaduría editorial), como el
     riel de colecciones de `/explore` pero sin filtrar por tipo de entidad.
  2. **Populares** — listas públicas ordenadas por conteo agregado de guardados, descendente.
  3. **De usuarios seguidos** — listas visibles de usuarios que el visitante sigue, recientes
     primero. **Solo con sesión**: oculta para visitantes anónimos.
  4. **Recientes** — listas públicas en orden cronológico descendente (reusa la lógica de
     `list-discovery`).
- **El conteo agregado de guardados de una lista pasa a ser dato público** — se muestra en
  las tarjetas de `/lists` y en el detalle de lista. Los registros individuales de guardado
  siguen siendo privados: se expone el número, nunca quién guardó. **BREAKING** respecto de
  la decisión de privacidad documentada en `docs/05-features/lists-and-favorites.md`.
- La pestaña "Descubrir" de `/me/lists` **se mantiene** y coexiste con la nueva superficie;
  ambas reusan el servicio de descubrimiento cronológico.
- Diseño abierto a secciones futuras (por tipo de entidad, por género, "lista de la semana"):
  se documenta la estructura pero no se implementan ahora.
- **Fuera de alcance**: recomendación algorítmica o personalización por afinidad en cualquier
  sección; clonar/derivar listas ajenas; convertir "Populares" en un ranking competitivo con
  posiciones numeradas.

## Capabilities

### New Capabilities

- `community-lists`: la superficie pública `/[locale]/lists` y sus secciones (Destacadas,
  Populares, De usuarios seguidos, Recientes), su composición, su comportamiento con y sin
  sesión, y el acceso desde la barra general del Header.

### Modified Capabilities

- `list-discovery`: el descubrimiento cronológico de listas públicas deja de estar acotado a
  la pestaña autenticada de `/me/lists`; ahora también alimenta la sección "Recientes" de la
  superficie pública `/lists`, accesible **sin sesión**. La pestaña de `/me/lists` se
  conserva.
- `list-saves`: se introduce el **conteo agregado de guardados por lista como dato público**,
  legible sin sesión; los guardados individuales y su identidad siguen siendo privados.
- `cross-view-navigation`: la barra general del Header para el usuario autenticado (y su
  equivalente anónimo) gana un enlace "Listas" junto a Explorar; el panel móvil lo incluye
  en el bloque de barra general.

## Impact

- **Rutas**: nueva `src/app/[locale]/lists/page.tsx` con `resolveSession` (no
  `requirePageUser`); Server Component que compone las secciones y omite las vacías.
- **Servicios**: nuevo `src/services/lists/community.ts` (o ampliación de `discovery.ts`) con
  `listFeaturedLists`, `listPopularLists`, `listsFromFollowing`; reuso de `enrichLists`,
  `savedStateFor`, `listFollowing`. Nuevo helper de conteo agregado de guardados
  (`saveCountsFor(listIds)`), apoyado en el índice existente `idx_list_save_list` — **sin
  migración**.
- **API**: nuevos `GET /api/lists/popular` (público) y `GET /api/lists/from-following`
  (401 `AUTH_REQUIRED` sin sesión); reuso de `GET /api/lists/discover` para "Recientes";
  Destacadas se resuelve en el servidor sin endpoint propio (rail acotado). Documentar en
  `docs/04-api/contracts.md`.
- **Componentes**: reuso de `ListCard`, `ListCoverMosaic`, `ListsList`; el conteo de
  guardados se añade a la tarjeta de lista y a `ListDetailHeader`.
- **Header**: `src/components/layout/Header.tsx` añade el enlace "Listas" en la barra general
  `md+` y en el bloque general del panel móvil; reusa `common.lists` como etiqueta.
- **i18n**: nuevas claves en `messages/{es,en}/lists.json` (títulos y textos vacíos de las
  cuatro secciones, título de la superficie).
- **Privacidad / docs**: `docs/05-features/lists-and-favorites.md` (sección de privacidad del
  conteo de guardados) y la nota **D7** de `openspec/changes/redefine-content-hierarchy/design.md`
  (que asumía `/explore` como contenedor único) se actualizan para registrar la ruta propia
  `/lists`. La spec `album-discovery` **no cambia**: `/explore` sigue sin pestaña de listas.
- **Sin cambios** en el modelo de datos ni en el contrato de `list_save` / `user_list`.
