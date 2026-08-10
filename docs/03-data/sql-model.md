# Modelo SQL — music-platform

Versión narrada de `schema.sql`. Para cada tabla: propósito, relaciones, restricciones y por qué existen. La definición completa de columnas y tipos vive en el propio `schema.sql`, versionado junto al código.

## `app_user`

**Propósito:** identidad de quien usa la aplicación — base para valorar, comentar y, más adelante, seguir actividad de otros usuarios.

**Relaciones:** referenciada por `rating`, `comment`, `session` y `auth_identity`.

`password_hash` es nullable para permitir usuarios autenticados mediante proveedores externos.
Cuando tiene valor, contiene únicamente el hash Argon2id de la contraseña local; nunca se guarda la
contraseña en texto plano.

## `auth_identity`

**Propósito:** vincula un `app_user` con una identidad de autenticación externa, comenzando por
Google y preparada para futuros proveedores OAuth/OIDC.

**Relaciones:** pertenece a exactamente un `app_user`.

**Identidad externa:** para proveedores OIDC, `provider_account_id` corresponde al claim `sub` y
`provider` identifica inequívocamente el issuer del proveedor.

**Restricciones:**

- `FOREIGN KEY (user_id)` referencia `app_user(id)`.
- `ON DELETE CASCADE` elimina la identidad cuando se elimina su usuario.
- `UNIQUE (provider, provider_account_id)` garantiza a nivel de PostgreSQL que una identidad
  externa no pueda vincularse a más de un `app_user`.
- `INDEX (user_id)` permite resolver eficientemente todas las identidades vinculadas a un usuario.
- El email del proveedor no sustituye al identificador estable ni produce vinculación automática
  por sí solo.

## `session`

**Propósito:** sesión server-side asociada a un usuario autenticado.

**Seguridad:** almacena únicamente el hash del token opaco enviado en la cookie; el token real
nunca se persiste ni se devuelve en JSON. Las sesiones expiradas no son válidas.

**Política:** la expiración es fija y no se prolonga con cada request. El token se rota después
de autenticarse y ante eventos sensibles, pero no en cada request normal. Un usuario puede tener
varias sesiones activas. La revocación elimina la fila de sesión, individualmente o para todas las
sesiones del usuario. No se añade `revoked_at`: la ausencia de la fila invalida el token
inmediatamente.

**Limpieza:** las sesiones expiradas se eliminan mediante un job periódico y mediante limpieza
oportunista durante operaciones de autenticación o resolución de sesión. La limpieza oportunista
no debe bloquear la respuesta principal.

**Columnas e índices:** `token_hash` es obligatorio y único para resolver un token opaco sin
persistir el token real. `idx_session_user` permite revocar las sesiones de un usuario y
`idx_session_expires_at` permite localizar sesiones vencidas para el job de limpieza. La FK a
`app_user` usa `ON DELETE CASCADE`. La restricción `expires_at > created_at` impide sesiones ya
vencidas al momento de crearse; la expiración sigue siendo fija porque la aplicación no modifica
`expires_at` durante requests normales.

## `artist`

**Propósito:** representa tanto a una persona como a una banda, o al artista especial "Various Artists" usado en compilados. Un único `type` (`person` | `group` | `various`) evita duplicar la estructura entre ambos casos.

**Relaciones:** se conecta consigo misma a través de `membership` (persona ↔ grupo), y con `release_group`/`recording` a través de `credit`.

**Restricciones:** ninguna a nivel de columna más allá del `CHECK` de `type` — la validación de que una persona no pueda ser su propio grupo vive en `membership`.

**Índices:** por `name`, para búsqueda.

**Evolución (migración `0001_artist_type_unknown.sql`):** `type` admite además `'unknown'`. Se agregó al ingerir créditos (feat., colaboraciones) desde MusicBrainz: se crean filas "stub" con solo `mbid` y `name`, sin gastar una llamada extra a la API solo para conocer si es persona o grupo. Esas filas quedan en `unknown` hasta que alguien visita el perfil de ese artista directamente y se enriquece bajo demanda — el mismo patrón de cacheo aplicado de forma recursiva a los propios créditos.

## `membership`

**Propósito:** resuelve el caso de referencia del proyecto (Roger Waters / Pink Floyd) — una persona puede pertenecer a uno o más grupos, con rol y período.

**Restricciones:**

- `person_id <> group_id`: un artista no puede ser miembro de sí mismo.
- `left_on >= joined_on` (cuando ambos existen): coherencia temporal.
- **Trigger `trg_membership_types`**: valida que `person_id` apunte a un `artist` con `type='person'` y `group_id` a uno con `type='group'`. No es posible expresar esto con un `CHECK` porque requiere consultar otra tabla.

## `release_group`

**Propósito:** el álbum como concepto general — el nivel al que pertenecen la valoración y los comentarios de "el álbum", independiente de cuántas ediciones tenga.

**Restricciones:** `category` limitado a `studio`, `single_ep`, `compilation`, `live_other`.

**Carátula (`cover_thumb_url`):** URL de la miniatura de 250px de la portada del álbum, resuelta contra
Cover Art Archive a nivel de **release-group** (ver `data-licensing.md`). Es la **única fuente escribible**
de la carátula: se resuelve bajo demanda con un `HEAD` a CAA sin ingestar el tracklist de una edición (patrón
cover-only, ver `04-api/contracts.md`). Es `null` cuando el álbum no tiene carátula (demos/outtakes). Si el
valor cacheado es `null`, la resolución se re-intenta en cada acceso posterior por si la portada aparece
después (self-heal, mismo criterio que aplicaba `release`).

## `release`

**Propósito:** una edición concreta de un `release_group` (original, edición japonesa, remaster de aniversario). Aquí vive el tracklist real, vía `track`.

**Relaciones:** `release_group_id` obligatorio — toda edición pertenece a exactamente un álbum conceptual.

**Carátula (`cover_thumb_url`) — DEPRECADA:** columna legada de la resolución de carátula, que pasó a
`release_group.cover_thumb_url` (migración `0003`). Ya **no se escribe** desde la app; el read-model
(`album-detail.ts`) la usa solo como fallback de compatibilidad para filas pre-migración
(`release_group.coverThumbUrl ?? release.coverThumbUrl`). No introducir escrituras nuevas sobre esta columna.

**Sincronización de créditos (`credits_synced_at`):** marca de tiempo nullable que indica cuándo se
sincronizaron los créditos de esta edición. Si es `NULL`, los créditos no fueron sincronizados
(releases cacheados antes de la implementación de créditos). La re-sincronización se hace con el
script `scripts/backfill-release-credits.ts`, nunca dentro del path de lectura del álbum
(migración `0004`).

**Fechas y precisión:** `release_date` es `DATE` nullable. MusicBrainz entrega fechas con distinta
precisión (`YYYY`, `YYYY-MM` o `YYYY-MM-DD`); la ingesta normaliza cada valor con
`normalizeReleaseDate` (`src/services/musicbrainz/mappers.ts`):

- `YYYY-MM-DD` válido (verificando calendario) → se guarda tal cual.
- `YYYY`, `YYYY-MM`, ausente o inválido → se guarda `null`.

No se convierte una fecha parcial al primer día del año/mes: inventaría una precisión que
MusicBrainz no proporciona y la UI no debe presentar como exacta.

**Evolución futura (`release_year`):** la página debe poder mostrar al menos el año de
lanzamiento aunque no exista fecha exacta. Para eso, la siguiente evolución del esquema añadirá
una columna nullable `release_year` (entero), separada de `release_date`:

- Fecha completa → se guardan ambos valores.
- Fecha parcial → se guarda el año conocido en `release_year` y `release_date` queda `null`.
- La UI mostrará `release_year` como fallback cuando `release_date` sea nulo.

Esa columna **no está implementada todavía**; requiere una migración SQL y un change separado.

## `recording`

**Propósito:** la grabación única que acumula valoración y comentarios, sin importar en cuántas ediciones aparezca.

**Restricciones:**

- `variant_type` limitado a `original`, `re_recording`, `remix`, `live`.
- `variant_type = 'original' OR variant_of_id IS NOT NULL`: toda versión distinta de la original debe declarar explícitamente a cuál hace referencia.
- Un remaster de audio **nunca** crea una fila nueva aquí — reutiliza el mismo `id`, tal como se definió en `01-domain/business-rules.md`.

## `track`

**Propósito:** la posición concreta de una `recording` dentro de una `release` — número de disco y de posición.

**Restricciones:** `UNIQUE (release_id, disc_number, position)` — dos canciones no pueden ocupar la misma posición física en la misma edición.

## `credit`

**Propósito:** conecta artistas con álbumes o canciones, resolviendo feat., dúos y compilados sin una FK directa (ver ADR 0004).

**Restricciones:**

- `CHECK (num_nonnulls(release_group_id, recording_id) = 1)`: un crédito pertenece a exactamente un objetivo.
- Índices únicos parciales (`uq_credit_pos_*`, `uq_credit_artist_*`): garantizan que no haya dos artistas en la misma posición, ni el mismo artista repetido, dentro del mismo objetivo. Son parciales porque un `UNIQUE` normal no detecta duplicados cuando una de las columnas de destino es `NULL` (`NULL <> NULL` en SQL).

**Ejemplo:** "Mark Ronson feat. Bruno Mars" son dos filas: `position=0, role=primary, join_phrase='feat.'` y `position=1, role=featured`.

## `rating`

**Propósito:** la valoración dual (estrellas + valoración detallada) sobre un artista, álbum o canción.

**Restricciones:**

- `CHECK (num_nonnulls(artist_id, release_group_id, recording_id) = 1)`: un objetivo exacto por valoración.
- `CHECK (stars BETWEEN 0.5 AND 5 AND stars = ROUND(stars*2)/2.0)`: pasos de 0.5.
- `CHECK` de banda: la valoración detallada, si existe, debe caer dentro del rango de 10 puntos que corresponde a las estrellas elegidas — la regla de coherencia definida en `01-domain/business-rules.md`, aplicada matemáticamente, no solo documentada.
- Índices únicos parciales (`uq_rating_user_*`): un usuario solo puede tener una valoración vigente por objetivo.
- **Trigger `trg_rating_touch`**: mantiene `updated_at` automáticamente en cada edición.

## `comment`

**Propósito:** comentarios de texto libre, independientes de la valoración — a diferencia de `rating`, no hay restricción de unicidad por usuario y objetivo.

**Restricciones:** `CHECK (num_nonnulls(artist_id, release_group_id, recording_id) = 1)`, igual que `credit` y `rating`.
