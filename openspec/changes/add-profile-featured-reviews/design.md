## Context

`redefine-content-hierarchy` D10 / Q7 — orden vertical del perfil:

```
2 Álbumes favoritos   3 Destacados mixtos   4 Reseñas destacadas   5 En rotación   ...
```

Estado actual:

- `add-album-review` construyó `review` (target `release-group` en Fase 1, siempre con
  `rating` asociado, una vigente por usuario/álbum, sin columna de audiencia — pública
  implícita, visible en la página del álbum) y `listReviews(target)` (reseñas **por
  álbum**). **No hay** query de reseñas **por autor** ni superficie de reseñas en el perfil.
- `profile-in-rotation` / `taste-fingerprint` / `recency` son el precedente de "sección de
  perfil calculada bajo demanda": `getProfileByUsername(username, viewerId)` → `null` si
  `!accessible`; `cache()` por request; sin tabla materializada; la sección no se renderiza
  si el resultado es vacío.
- `social-profiles` "Composición del perfil por nivel de acceso" fija qué secciones
  aparecen en cada nivel y el orden relativo de "En rotación" y "Exploración". No menciona
  reseñas.
- El perfil ya tiene **tres mecanismos de fijado** (álbumes favoritos, destacados, himno);
  D10 marca como riesgo que se lean como distintos.

## Goals / Non-Goals

**Goals:**

- Una sección "Reseñas" en el perfil con las últimas reseñas de álbum del dueño visibles
  para el lector, en la posición Q7 #4.
- Visibilidad por accesibilidad del perfil + bloqueo, idéntica al resto de secciones.
- Cálculo bajo demanda (`cache()`), sin migración, sin endpoint, sin fetcher.
- No sumar un cuarto mecanismo de fijado.

**Non-Goals:**

- Editor de "reseñas destacadas" / curación manual (auto, más recientes).
- Reseñas de artista o canción — `review` sigue restringida a álbum (`album-review`).
- Página dedicada `/users/[username]/reviews` — las tarjetas enlazan al álbum, donde vive
  la reseña completa y el hilo.
- Endpoint `GET /api/users/[username]/reviews` — nada cliente lo consume.
- Reordenar el resto del perfil (la composición de `social-profiles` ya coincide con la
  implementación para lo que especifica; "Rastro reciente" como sección #6 de Q7 es otra
  discusión).
- Tocar la escritura, la edición o el listado por álbum de las reseñas.

## Decisions

### D1 — Visibilidad: accesibilidad del perfil, nada más

`getProfileReviews(username, viewerId)`:

1. `const profile = await getProfileByUsername(username, viewerId)` → si `!profile.accessible`
   devolver `null` (perfil privado sin relación aceptada, o bloqueo — `getProfileByUsername`
   ya resuelve ambos).
2. Si hay acceso, devolver las reseñas del dueño. La reseña es **contenido público
   implícito** (ya visible en la página del álbum para cualquiera); agregar sus reseñas en
   el perfil no expone nada nuevo — no se filtra además por seguidor como los ratings
   sueltos. El `rating` que se muestra es el que la reseña **lleva incorporado**
   (`album-review`: "la reseña siempre lleva rating"), parte de su presentación pública, no
   el rating suelto del usuario.

### D2 — Automática, más recientes, tope 4

- Orden por `review.updated_at` desc (la edición vigente), desempate por `id`.
- Tope `PROFILE_REVIEWS_MAX = 4` (constante con nombre). Es una muestra de la crítica de la
  persona, no un archivo — el archivo por álbum ya existe.
- **Sin editor de curación.** El perfil ya tiene tres mecanismos de fijado; un cuarto
  ("fijar estas reseñas") es justo el riesgo que D10 pide evitar. Si el producto lo quiere
  después, es aditivo (un `is_featured` o una tabla de orden), no bloquea esta versión.
- Se cuenta el total; si supera el tope, la sección lo indica ("y N reseñas más"), sin
  enlace dedicado en Fase 1.

### D3 — Presentación: tarjeta con carátula, rating y cuerpo recortado

`ProfileReviews.tsx` (Server Component). Encabezado `t("reviews.title")` ("Reseñas"). Por
reseña, una tarjeta:

- Carátula del álbum (`CoverThumb`) + título del álbum enlazado a `/album/{id}` + artista
  acreditado.
- El rating de la reseña con el medidor del feed (`FeedRatingMeter`) + valor numérico.
- El `title` de la reseña, cuando existe, como encabezado de la tarjeta.
- El `body` recortado a ~4 líneas (`line-clamp-4`), sin control de expandir — "leer
  completa" es el enlace al álbum.

Sin numeración, sin "más valorada", sin insignias. Es una lista de lo que la persona
escribió últimamente sobre álbumes.

### D4 — Ubicación: Q7 #4, en las dos layouts

`sections.tsx` gana `FeaturedReviewsSection({ username, viewerId })`. En `page.tsx`:

- **Vista pública de dos columnas**: columna principal, **después de `PinnedSection`
  (destacados), antes de `InRotationSection`**.
- **Vista del dueño (una columna)**: **después de `ShowcaseSection`, antes de
  `InRotationSection`**.

Coincide con Q7 (2 favoritos → 3 destacados → **4 reseñas** → 5 en rotación). No se toca
ningún otro `<Streamed>`.

### D5 — Servicio: `getProfileReviews` con `cache()`

`src/services/profiles/reviews.ts`:

```ts
export interface ProfileReview {
  id: string;
  title: string | null;
  body: string;
  stars: string | null;
  detailedScore: number | null;
  updatedAt: string;
  album: { id: string; title: string; artistName: string | null; coverThumbUrl: string | null };
}

export const getProfileReviews = cache(
  async (username, viewerId): Promise<{ reviews: ProfileReview[]; total: number } | null> => { … },
);
```

Una consulta: `review` del dueño con `releaseGroupId` no nulo, join `release_group`
(título/carátula) + artista acreditado (subquery escalar `credit`, nombre de tabla
explícito) + `left join rating` por `(userId, releaseGroupId)`, orden `updated_at` desc,
`limit PROFILE_REVIEWS_MAX + 1` para saber si hay más; `total` con un `count(*)` aparte (o
derivado si el `+1` alcanza). Sin materialización: un usuario tiene pocas reseñas.

## Risks / Trade-offs

- **[Cuarta "cosa" en el clúster de identidad cultural]** (favoritos, destacados, himno,
  reseñas) → Reseñas es **automática**, no otro mecanismo de fijado: no compite por "¿cuál
  uso para destacar X?". Copy y forma propios ("Reseñas", tarjetas con cuerpo de texto).
- **[Duplicación: el mismo álbum en "Álbumes favoritos" y en "Reseñas"]** → Son lecturas
  distintas: favoritos = "esto me define" (curado, sin texto); reseñas = "esto es lo que
  pienso de esto" (texto, con fecha). Que coincidan a veces es esperable y correcto.
- **[Reseñas de perfiles privados]** → La sección se gatea por `profile.accessible`; un
  perfil privado no seguido no la muestra (ni muestra el perfil). Coherente con
  `add-album-review`, que ya excluye del feed las reseñas de perfiles privados sin relación.
- **[Sin página "todas las reseñas del usuario"]** → Fase 1: las tarjetas enlazan al
  álbum. Si el volumen de reseñas por usuario crece y "y N más" se queda corto, una página
  dedicada es un cambio aditivo.

## Migration Plan

Sin migración. Servicio y componente aditivos; si `getProfileReviews` fallara, su
`<Streamed>` aísla el fallo a esa sección. Rollback = revertir el commit.

## Open Questions

- **OQ1 — ¿Automática (últimas N) o curada (el dueño elige)? → propuesta: automática**
  (D2). Curada suma un cuarto mecanismo de fijado, el riesgo que D10 pide evitar; y la
  señal "qué escribe esta persona sobre álbumes" no necesita curación para leerse.
- **OQ2 — ¿Tope 4? → propuesta: 4.** Muestra, no archivo. Ajustable como constante.
- **OQ3 — ¿Endpoint `GET /api/users/[username]/reviews` para paridad con fingerprint /
  in-rotation? → propuesta: no.** Nada cliente lo consume; los endpoints espejo de esas
  secciones tampoco se usan. Si algún día una vista cliente lo necesita, se agrega ahí.
- **OQ4 — ¿La sección necesita una página "todas las reseñas de X"? → propuesta: no en
  Fase 1.** Las tarjetas enlazan al álbum; "y N más" es solo informativo.