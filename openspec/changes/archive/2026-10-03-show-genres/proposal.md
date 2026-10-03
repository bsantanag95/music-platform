## Why

El cambio `add-genre-taxonomy` dejó los géneros como dato (taxonomía, familias, semillas de Wikidata, géneros
efectivos con herencia) y solo los muestra en Explorar, Caminos, la huella de gusto y una lista cerrada de 22
claves en la identidad del perfil. Las páginas de Artista, Álbum y Canción siguen sin decir de qué género son, y
no existe un lugar al que navegar para "todo el shoegaze" — que es lo que convierte un género en biblioteca. La
identidad musical, además, limita a las personas a 22 géneros aunque la taxonomía tiene ~2.200.

## What Changes

- **Chips de género** en las tres páginas: en el artista, sus géneros semilla; en el álbum, sus géneros
  efectivos más los descriptores (Instrumental, Navideña, Orquestal, Banda sonora) aparte; en la canción,
  los del álbum principal, de forma discreta. Los géneros heredados del artista se distinguen de los propios.
  Cada chip enlaza a su página de género.
- **Página de género** `/{locale}/genre/<slug>`: nombre localizado, familias, "subgénero de", subgéneros,
  géneros cercanos (fusión de / influido por), artistas, álbumes del género y de sus subgéneros (paginados,
  con el orden de Explorar) y los mejor valorados. Un slug desconocido o que no es un estilo da 404.
- **Selector abierto de "Géneros que me mueven"**: buscador sobre todos los estilos de la taxonomía (por nombre
  en español o en inglés, sin tildes), con tope de 5. Reemplaza la lista cerrada de 22. **BREAKING (contrato):**
  `PUT /api/me/profile/music-identity` acepta cualquier slug de un género de estilo (hoy solo 22 claves);
  se valida contra la taxonomía, no contra una lista fija.
- **Declarado frente a real** en la huella de gusto: las familias de la cresta que contienen algún género
  declarado por la persona llevan una marca, y las declaradas que no aparecen en la cresta se nombran aparte.
- Nuevo endpoint público `GET /api/genres/search?q=` (typeahead del selector).
- Documentación: `contracts.md`, `business-rules.md`, `explore.md`, `user-profile.md` y un ADR corto si cambia la
  regla de validación de la identidad.

### Goals

- Que cada artista, álbum y canción diga su género y que ese dato sea navegable.
- Una página de género que sirva al especialista (subgéneros, cercanos) y al usuario común (familia).
- Quitar el techo de 22 géneros en la identidad sin perder validación.

### Non-Goals

- Votos de la comunidad sobre géneros (cambio 2, `add-genre-votes`): los chips leen los géneros efectivos y no
  cambian cuando ese cambio los extienda.
- Página propia de familia: la familia sigue siendo un corte de Explorar (`/explore?familia=`); la página de
  género enlaza a ella.
- Géneros propios de canción o edición de géneros por parte de la persona (solo lectura).
- Cambiar la herencia (3 primeros géneros del artista) ni la taxonomía.
- Búsqueda global de géneros en el buscador del encabezado.

## Capabilities

### New Capabilities
- `genre-pages`: página de género (`/genre/<slug>`), su contenido, navegación entre géneros y estados vacíos.
- `genre-display`: cómo se muestran los géneros y descriptores en las páginas de artista, álbum y canción, incluida
  la marca de herencia.
- `genre-search`: buscador de géneros por nombre (API y selector) usado por la identidad musical.

### Modified Capabilities
- `profile-music-identity`: la lista de "Géneros que me mueven" deja de ser cerrada de 22 y pasa a cualquier género
  de estilo de la taxonomía.
- `taste-fingerprint`: la cresta de géneros marca las familias con géneros declarados.

## Impact

- **Rutas:** nueva `src/app/[locale]/(catalog)/genre/[slug]/page.tsx`; helper `genreHref` en `src/lib/catalog-links.ts`;
  API `src/app/api/genres/search/route.ts`.
- **Servicios:** `src/services/genres/` (página de género, búsqueda, géneros de artista/álbum/canción en lote),
  `profiles/music-identity.ts` y `lib/api/schemas.ts` (validación contra la taxonomía), `profiles/stats.ts`.
- **Componentes:** `GenreChips`, cabeceras de artista/álbum/canción, selector `GenreMultiSelect` en
  `OwnerMusicIdentityEditor`, `TasteFingerprint`.
- **Datos:** sin migración (`app_user.genres` ya guarda slugs); los slugs retirados u ocultos se ignoran al mostrar.
- **Mensajes:** `catalog.genres` (página, etiquetas de herencia y descriptores), `users` (selector).
- **Dependencias:** ninguna nueva.
