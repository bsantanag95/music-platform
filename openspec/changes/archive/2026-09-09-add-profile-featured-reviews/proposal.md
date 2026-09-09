## Why

`redefine-content-hierarchy` (D10 / Q7) define el orden vertical del perfil con una sección
**"Reseñas destacadas"** en el clúster de **identidad cultural**, justo después de los
álbumes favoritos y los destacados mixtos. `add-album-review` construyó la entidad reseña y
la superficie por álbum, pero **ninguna superficie muestra las reseñas de un usuario en su
propio perfil**. Es la última pieza de D10 sin construir: hoy la postura crítica de una
persona sobre las obras —el acto más expresivo del producto según `product_philosophy.md`
Principio 4— es invisible en el lugar donde se lee "quién es".

## What Changes

- Nueva sección **"Reseñas"** en el perfil: las reseñas de álbum más recientes del dueño,
  visibles para el lector, presentadas como tarjetas (carátula + álbum + artista + rating +
  título de la reseña + cuerpo recortado), cada una enlazada a la página del álbum donde
  vive la reseña completa y el resto de reseñas.
- **Automática, no curada**: se muestran las últimas **hasta 4** reseñas, ordenadas por
  fecha de última edición. No hay un editor de "fijar reseñas" — evita sumar un cuarto
  mecanismo de fijado al perfil (D10 ya marca el riesgo de los tres que hay: álbumes
  favoritos / destacados / himno). Si el producto quiere destacado explícito más adelante,
  es un cambio aditivo.
- **Visibilidad**: la reseña no tiene audiencia propia (pública implícita); la sección se
  gobierna por la **accesibilidad del perfil** — un perfil privado sin relación aceptada no
  la muestra, igual que la huella y "En rotación". Bloqueo en cualquier dirección la
  oculta.
- **Ubicación** (Q7 #4): después de los destacados y **antes de "En rotación"**, tanto en
  la vista del dueño como en la pública.
- **Colapsa** si el dueño no tiene reseñas visibles para el lector (mismo criterio que los
  demás estantes).
- **Sin migración, sin endpoint, sin fetcher**: cálculo bajo demanda en el Server Component
  del perfil (`getProfileReviews`, `cache()` por request), mismo patrón que
  `profile-in-rotation` / `taste-fingerprint`.

## Capabilities

### New Capabilities

- `profile-reviews`: la sección "Reseñas" del perfil — qué muestra (últimas N reseñas de
  álbum del dueño), su filtrado por accesibilidad del perfil y bloqueo, su orden (última
  edición desc), su presentación (tarjeta con carátula, rating y cuerpo recortado, enlace
  al álbum), su tope y su colapso cuando está vacía.

### Modified Capabilities

- `social-profiles`: la composición del perfil por nivel de acceso incluye ahora la sección
  "Reseñas" en los niveles autorizado y dueño, ubicada después de los destacados y antes de
  "En rotación".

## Impact

- **Nuevo servicio** `src/services/profiles/reviews.ts` — `getProfileReviews(username,
  viewerId)` memoizado por request: `getProfileByUsername` → `null` sin acceso; si no,
  `review` del dueño (`releaseGroupId` no nulo) join `release_group` + artista acreditado +
  el `rating` asociado, orden `updated_at` desc, tope `PROFILE_REVIEWS_MAX` (4).
- **Nuevo componente** `src/components/profiles/ProfileReviews.tsx` — Server Component,
  colapsa si vacío; cuerpo recortado con `line-clamp`.
- **Modificado** `src/app/[locale]/users/[username]/sections.tsx` — nueva
  `FeaturedReviewsSection`.
- **Modificado** `src/app/[locale]/users/[username]/page.tsx` — `<FeaturedReviewsSection>`
  entre `ShowcaseSection`/`PinnedSection` e `InRotationSection`, en las dos layouts.
- **i18n** `messages/{es,en}/users.json` — bloque `reviews` (encabezado, "leer completa",
  "y N más").
- **Docs** `docs/05-features/user-profile.md` — la sección "Reseñas", su lugar en el orden
  vertical, su visibilidad.
- Sin cambios en el esquema, en `album-review` (la entidad y la escritura no cambian), ni
  en el feed.
