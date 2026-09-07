## Why

El perfil de usuario es la superficie más importante de Fase 5 en términos de identidad
—es "tu página" dentro de un Letterboxd para música— y hoy es la más pobre: una lista
plana de secciones (diario, favoritos, listas, colección) sin identidad, sin retrato de
gusto y sin nada que invite a seguir a alguien. El dueño, además, no tiene un lugar
central: se mira en `/users/[username]` pero gestiona todo en páginas `/me/*` sueltas.
Este cambio convierte el perfil en el centro de la experiencia social, con una identidad
rica, un retrato de gusto expresivo y una vista privada que da razones reales para pulsar
"Seguir".

## What Changes

- **Rediseño completo del perfil** (`/users/[username]`) con una columna vertebral de
  componentes revelada progresivamente según el acceso: **vista privada** (no seguidor /
  anónimo / solicitud pendiente), **vista pública** (cuenta pública o seguidor aprobado)
  y **vista del dueño**. Se construye primero la privada.
- **Identidad enriquecida**: bio corta, pronombres, ubicación, zona horaria y enlaces
  externos tipados. Monograma determinista como única imagen de identidad en esta entrega
  (columna `avatar_url` reservada, sin superficie de subida).
- **Cuatro destacados**: hasta cuatro entidades fijadas (artista / álbum / canción, tipos
  mezclados) con nota opcional de una línea.
- **Himno**: una canción elegida manualmente que representa al usuario. Sin caída
  automática a "última escucha".
- **Huella de gusto**: histograma de valoraciones (la forma de la curva), cresta de
  décadas, cresta de géneros y reparto por tipo de entidad. Todo calculado **respetando la
  audiencia del visitante**. La cresta de géneros se alimenta de datos sembrados en esta
  entrega; la ingesta real de tags de MusicBrainz es un cambio posterior.
- **Afinidad**: al ver el perfil público de otra persona, bloque de coincidencias
  —favoritos en común, artistas que ambos puntúan alto, seguidores en común—; el hint de
  seguidores en común aparece también en la vista privada.
- **Vista privada más generosa**: expone bio, enlaces externos y contadores de
  seguidores/siguiendo. Solo se ocultan las actividades y los listados sociales. **BREAKING**
  respecto del contrato actual de "identidad mínima" de `social-profiles`.
- **`/users/[username]` como ruta canónica del perfil para todos, incluido el dueño**. Las
  páginas `/me/*` se conservan como destinos de gestión profunda; la vista del dueño añade
  edición inline, un panel hub que enlaza y resume esas áreas, indicadores de audiencia por
  sección, un badge con el conteo de solicitudes pendientes y un previsualizador "cómo te
  ven".
- **Migraciones nuevas**: columnas en `app_user` y tablas `user_profile_link`,
  `user_pinned_item`, `user_showcase`; datos sembrados de género para la huella.
- **Nuevos endpoints REST** bajo `/api/me/profile` (identidad, destacados, himno, enlaces) y
  `/api/users/[username]/*` (huella, afinidad), todos con validación Zod y envelope de error
  existente.

## Capabilities

### New Capabilities

- `profile-identity`: campos de identidad del perfil (bio, pronombres, ubicación, zona
  horaria, enlaces externos tipados, monograma determinista), su almacenamiento, validación
  y superficie de edición del dueño.
- `profile-showcase`: cuatro destacados fijables y himno del usuario, con edición del dueño
  y presentación según audiencia.
- `taste-fingerprint`: retrato de gusto del perfil —distribución de valoraciones, décadas,
  géneros (sembrados) y reparto por tipo— calculado y filtrado por la audiencia del
  visitante, con equivalente textual accesible.
- `profile-affinity`: coincidencias entre el visitante autenticado y el dueño del perfil
  (favoritos en común, afinidad de valoración, seguidores en común).

### Modified Capabilities

- `social-profiles`: la vista privada pasa a exponer bio, enlaces y contadores de
  seguidores/siguiendo (antes "identidad mínima"); se define la composición contractual de
  las tres vistas del perfil y el panel del dueño; `/users/[username]` queda como ruta
  canónica del perfil también para el dueño.
- `user-following`: se expone el conteo de solicitudes de seguimiento pendientes para el
  badge del panel del dueño.

## Impact

- **Rutas**: reescritura de `src/app/[locale]/users/[username]/page.tsx`; sin nueva ruta
  para el dueño (converge en la canónica). `src/app/[locale]/me/*` intactas salvo enlaces
  entrantes.
- **Componentes nuevos**: `Placa`, `PrivateThreshold`, `TasteFingerprint`, `PinnedShowcase`,
  `AnthemStrip`, `ProfileAffinity`, `ProfileRail` (envuelve `ScrollablePreviewList`),
  `OwnerHubPanel`, editores inline de identidad/destacados/himno. Monograma promovido de
  `UserCard` a util compartida.
- **Servicios**: nuevo `src/services/profiles/` (identidad, showcase, stats, afinidad);
  extensión de `src/services/social/profiles.ts`.
- **Base de datos**: nuevas migraciones Drizzle (archivos nuevos, nunca editados;
  `updated_at` solo por trigger). Columnas en `app_user`: `bio`, `pronouns`, `location`,
  `timezone`, `avatar_url`. Tablas: `user_profile_link`, `user_pinned_item`, `user_showcase`.
  Datos sembrados de género/tag para la huella.
- **API**: endpoints nuevos; sin cambios a contratos REST existentes. Documentación en
  `docs/03-api` y `docs/05-features` a actualizar.
- **i18n**: nuevas claves en `messages/es/users.json` y `messages/en/users.json`.
- **Diseño**: dentro del mundo visual vigente ("The Vinyl Listening Room", DESIGN.md); la
  huella de gusto es la excepción sancionada a la Regla de Rareza del ámbar.
- **Dependencias**: ninguna nueva (barras de la huella en CSS/SVG, sin librería de charts).

## Goals

- Dar a cada visitante la información justa para decidir seguir o entrar a explorar, en las
  tres vistas.
- Convertir el perfil del dueño en su centro de operaciones sin duplicar las páginas
  `/me/*`.
- Expresar identidad y gusto sin introducir mecánicas de completitud, rachas ni medallas.
- Mantener typecheck, lint, test y build en verde; código y documentación en español.

## Non-Goals

- Subida y alojamiento de avatares reales (queda el monograma; `avatar_url` reservado).
- Ingesta real de géneros/tags desde MusicBrainz (la huella usa datos sembrados; ingesta
  en un cambio posterior).
- Scrobbling automático o "ahora suena" en vivo.
- Temas de color por usuario o personalización del acento.
- Cambios en el modelo de audiencia de actividades, en el feed o en las páginas de
  catálogo.
- Listas colaborativas o cualquier cambio a `lists`, `favorites`, `listen-diary`,
  `physical-collection` más allá de consumirlos en modo lectura.
