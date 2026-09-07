## Context

El perfil vive en `src/app/[locale]/users/[username]/page.tsx` como una columna de
secciones (`DiaryList`, `FavoritesWall`, `ListsList`, `CollectionShelf` en modo `readOnly`)
precedida por una cabecera mínima. `getProfileByUsername` ya resuelve `relation`
(`self` | `following` | `none` | `blocked` | …), `accessible` (público, o `self`, o
`following`) y `blockedByMe`. `app_user` solo tiene `username`, `email`, `displayName`,
`passwordHash`, `profileVisibility`, `createdAt`.

Piezas reutilizables existentes: `ScrollablePreviewList` (rieles con scroll infinito del
Inicio), `CoverThumb`, `FollowButton`, `BlockButton`, el monograma determinista embebido en
`UserCard`, y los helpers de visibilidad de `src/services/diary/visibility.ts`
(`audiencesForProfile`), que ya implementan la regla cerrada "una actividad pública de un
perfil privado solo la ven seguidores aprobados y el dueño".

El mundo visual está fijado en `DESIGN.md` ("The Vinyl Listening Room") y no se toca. La
dirección de las tres vistas quedó cerrada en una sesión de `shape` previa (perfil rico con
migraciones; huella de gusto expresiva como identidad; perfil del dueño como hub central;
`/users/[username]` canónico para todos).

## Goals / Non-Goals

**Goals:**

- Una sola ruta (`/users/[username]`) que renderiza tres niveles de acceso desde el mismo
  árbol de componentes.
- Modelo de datos aditivo y reversible para identidad, destacados e himno.
- Huella de gusto calculada bajo demanda y filtrada por la audiencia del visitante, con
  equivalente textual.
- El dueño gestiona su identidad sin salir del perfil; el resto de la gestión sigue en
  `/me/*`, enlazada desde un panel hub.

**Non-Goals:**

- Alojamiento de avatares (solo monograma; `avatar_url` reservado sin lectura en UI).
- Ingesta real de tags/géneros de MusicBrainz (datos sembrados en este cambio).
- Materializar tablas de estadísticas o de eventos de feed.
- Personalización de color/tema por usuario.
- Tocar el modelo de audiencia, el feed o el catálogo.

## Decisions

### 1. Ruta única con tres niveles de render

`page.tsx` (Server Component) resuelve sesión y `getProfileByUsername`, y compone:

- **Placa** — siempre, en las tres vistas.
- **PrivateThreshold** (aviso de puerta cerrada + CTA) — cuando `!accessible && relation !== "self"`.
- **Huella + destacados + himno + rieles + recencia** — cuando `accessible || relation === "self"`.
- **Capas del dueño** (edición inline, `OwnerHubPanel`, ítems privados marcados,
  previsualizador "cómo te ven") — cuando `relation === "self"`.

*Alternativa descartada:* una ruta `/me` propia para el dueño. Duplica el árbol y obliga a
mantener dos superficies sincronizadas; la señal `relation === "self"` ya distingue el caso.
`Header` y `WelcomePanel` ya enlazan a `/users/[username]`.

### 2. Almacenamiento de identidad

- Singletons en `app_user`: `bio text` (CHECK `length <= 200`), `pronouns text`
  (CHECK `<= 40`), `location text` (CHECK `<= 80`), `timezone text`, `avatar_url text`
  (nullable, sin lectura en UI v1).
- Enlaces externos en tabla propia `user_profile_link` (`id`, `user_id` FK ON DELETE
  CASCADE, `kind`, `url text` CHECK `<= 400`, `position int`). `kind` es un conjunto cerrado
  vía CHECK (`website`, `bandcamp`, `lastfm`, `discogs`, `instagram`, `youtube`,
  `soundcloud`, `other`) espejado en Zod. El máximo de 5 enlaces se valida en el servicio
  (un CHECK no cuenta filas).

*Alternativa descartada:* columna JSON para enlaces. Pierde claridad referencial, complica
validación y ordenación, y rompe el patrón del proyecto (todo son tablas normalizadas).

### 3. Destacados e himno

- `user_pinned_item` (`id`, `user_id` FK CASCADE, `artist_id` / `release_group_id` /
  `recording_id` nullable con CHECK `num_nonnulls = 1`, `note text` CHECK `<= 120`,
  `position int`). Máximo 4 por usuario, validado en el servicio. Espeja el patrón de la
  tabla `rating` (triple FK nullable + CHECK), así que hereda cascada real y consistencia
  con el resto del dominio.
- `user_showcase` (`user_id` PK/FK CASCADE, `anthem_recording_id` uuid nullable FK
  → `recording`). Una fila por usuario, creada perezosamente.

*Alternativa descartada:* meter el himno como un `user_pinned_item` con rol especial. El
himno siempre es un `recording`, se presenta distinto (tira "suena en bucle") y no compite
por los 4 huecos; una FK nullable propia es más simple.

### 4. Huella de gusto — cálculo bajo demanda, filtrado por audiencia

Nuevo servicio `src/services/profiles/stats.ts`. Todas las consultas parten del conjunto de
actividades **visibles para el visitante**, reusando `audiencesForProfile(viewerRelation)`:

- **Curva de valoraciones:** `GROUP BY stars` sobre `rating` del dueño (las valoraciones son
  vigentes, no append-only) cuya audiencia sea visible.
- **Cresta de décadas:** valoraciones ∪ escuchas visibles → `release.release_date` →
  bucket por década. Degrada si hay pocas fechas.
- **Cresta de géneros:** join con datos de tag sembrados (ver Decisión 5).
- **Reparto:** conteos por tipo de entidad (artista / álbum / canción) + colección física +
  listas visibles.

Sin materialización: el volumen actual no la justifica y el feed ya sienta el precedente de
cálculo on-demand. Se envuelve en `cache()` por request. Índices: `rating(user_id, stars)`
ya existe parcialmente; se añaden los que falten.

*Alternativa descartada:* tabla `user_taste_stats` materializada con triggers. Prematuro;
se reevalúa con volumen real, igual que la deduplicación del feed.

### 5. Datos de género sembrados

Se añade `release_group_tag` (`release_group_id` FK CASCADE, `tag text`, `count int`,
PK compuesta) y un script de seed idempotente (keyed por `mbid`) que puebla un puñado de
tags reales para los `release_group` ya presentes en el catálogo — lo justo para que la
cresta de géneros se pueda diseñar y revisar visualmente. La ingesta real desde MusicBrainz
(poblar en el mismo flujo on-demand que metadata y carátulas) es un cambio posterior. El
componente `TasteFingerprint` **debe** renderizar un estado "sin datos de género todavía"
sin romper el resto.

### 6. Afinidad

`src/services/profiles/affinity.ts`, solo para visitante autenticado con `relation` distinto
de `self` y perfil `accessible`, respetando bloqueo:

- Favoritos en común: intersección de `favorite` por entidad.
- Afinidad de valoración: entidades que ambos puntúan con `stars >= 4`.
- Seguidores en común: `user_follow` aceptados hacia el dueño ∩ seguidos del visitante.

El hint de seguidores en común se muestra también en `PrivateThreshold` (es identidad
social agregada, no actividad).

### 7. Monograma compartido

Se extrae la lógica de `UserCard` a `src/components/social/monogram.ts` (letra + estilo
determinista por username) y la consumen `Placa`, `UserCard`, `PinnedShowcase` y
`ProfileAffinity`. Sin cambio de comportamiento visible en `UserCard`.

### 8. Superficie API

- Lecturas iniciales: los Server Components llaman a los servicios directamente.
- Edición del dueño (Client islands): vía `src/lib/api/client.ts`, todo con Zod y
  `with-error-handling`:
  - `PATCH /api/me/profile` — bio, pronombres, ubicación, zona horaria.
  - `PUT/DELETE /api/me/profile/links` — enlaces (reemplazo del conjunto ordenado).
  - `PUT/DELETE /api/me/profile/pinned` — destacados (reemplazo del conjunto ordenado).
  - `PUT/DELETE /api/me/profile/anthem` — himno.
  - `GET /api/users/[username]/fingerprint` y `GET /api/users/[username]/affinity` — para
    hidratación diferida y para el previsualizador "cómo te ven".
- Sin cambios a contratos REST existentes.

### 9. Composición y rendimiento

`Placa` y `PrivateThreshold` se renderizan en el servidor sin dependencias pesadas. La
huella y cada riel van bajo su propio `Suspense` para no bloquear la placa. Los rieles
reusan `ScrollablePreviewList` (cliente, paginado contra sus endpoints existentes). Los
editores son islas cliente que se montan solo en la vista del dueño.

### 10. "Cómo te ven"

Toggle cliente en la vista del dueño que re-renderiza la composición forzando
`relation = "none"` o `"following"` sobre los datos ya disponibles; si algún bloque exige
datos que no se cargaron para el dueño, no se muestra en la previsualización en vez de
refetchear.

## Risks / Trade-offs

- **Ampliar la vista privada (bio, enlaces, contadores) es una regresión de privacidad
  potencial** → se registra como decisión de producto explícita y como `MODIFIED` en el
  spec de `social-profiles`; se siguen ocultando todas las actividades y listados sociales;
  solo se expone identidad agregada.
- **Coste del cálculo on-demand de la huella en cuentas grandes** → índices dedicados,
  `cache()` por request, y opción de acotar el rango temporal; se revisa materialización con
  volumen real.
- **Los datos de género sembrados pueden verse inconsistentes** → seed conservador desde
  tags reales de MusicBrainz para las pocas filas del catálogo; la sección se etiqueta para
  que la escasez se lea como honesta, no como bug.
- **Ítems destacados polimórficos y borrado de entidades** → FK `ON DELETE CASCADE` como en
  `rating`; la UI omite ítems que ya no existen.
- **Alcance de tres vistas en un solo cambio** → `tasks.md` secuencia "privada primero";
  cada vista es desplegable tras la misma ruta.
- **La convergencia en `/users/[username]` podría romper enlaces o tests** → auditar
  enlaces (Header y WelcomePanel ya apuntan ahí); las subpáginas `/me/*` se conservan.

## Migration Plan

1. **Migraciones Drizzle** en archivos nuevos (nunca editar los aplicados; `updated_at` solo
   por trigger):
   - `app_user`: columnas nullable `bio`, `pronouns`, `location`, `timezone`, `avatar_url`
     con sus CHECK de longitud.
   - Tablas nuevas: `user_profile_link`, `user_pinned_item`, `user_showcase`,
     `release_group_tag`.
2. **Seed de género** idempotente (keyed por `mbid`), inerte si ya existe.
3. **Deploy**: migraciones → servicios + endpoints → UI. La reescritura de la ruta y la
   vista privada más generosa son visibles al usuario: mencionar en notas de versión.
4. **Rollback**: revertir UI + endpoints; las columnas y tablas son aditivas y pueden
   quedarse sin uso. El seed de género es inerte.

## Open Questions

- ¿`user_profile_link.kind` como enum en CHECK (propuesta) o texto libre con lista blanca
  solo en Zod?
- ¿La curva de la huella se calcula solo con valoraciones (propuesta) y las
  crestas/reparto con valoraciones ∪ escuchas visibles?
- Límites exactos: bio 200, nota de destacado 120 — confirmar contra el resto del proyecto
  (la nota de colección usa 140, la descripción de lista 500).
- ¿`avatar_url` se añade ahora aunque no se use (propuesta) o se difiere hasta la ingesta de
  avatares?
- ¿El previsualizador "cómo te ven" reusa datos ya cargados (propuesta) o refetchea contra
  los endpoints `GET /api/users/[username]/*`?
