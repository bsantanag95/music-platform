# Modelo SQL — music-platform

Versión narrada de `schema.sql`. Para cada tabla: propósito, relaciones, restricciones y por qué existen. La definición completa de columnas y tipos vive en el propio `schema.sql`, versionado junto al código.

## `app_user`

**Propósito:** identidad de quien usa la aplicación — base para valorar, comentar y, más adelante, seguir actividad de otros usuarios.

**Relaciones:** referenciada por `rating`, `comment`, `session` y `auth_identity`.

También puede tener roles de plataforma en `user_role`, restricciones temporales en
`user_restriction`, y ser actor de auditoría de acciones de roles o moderación.

**Audiencia por defecto:** `default_audience` (TEXT nullable, migración `0034`, `CHECK` en
`private` / `followers` / `public`) es una preferencia opcional para el contenido **nuevo** de
biblioteca (favoritos, diario, listas, colección). `NULL` significa "según el tipo": cada tipo
conserva su default (favoritos `public`, listas y colección `followers`, diario `private`), por eso
no hay `DEFAULT` de columna ni backfill. Se aplica solo al crear; nunca reescribe filas existentes.
Precedencia al crear: valor explícito de la petición > `default_audience` > default del tipo.

**Cuenta y seguridad (migración `0039`, cambio `rework-account-settings`):** `username_changed_at`
(TIMESTAMPTZ nullable; nulo = nunca cambió el usuario; base del enfriamiento de 30 días) y `locale`
(TEXT nullable, `CHECK IN ('es','en')`; nulo = sin preferencia, se conserva el idioma de la ruta).
`username` sigue siendo `UNIQUE` sensible a mayúsculas por historia; la disponibilidad de un cambio
nuevo compara con `lower()` (ver `username_alias`).

**Identidad musical (migración `0040`, `rework-account-settings` Fase 2):** `self_roles`, `genres` y
`listening_formats` son `TEXT[] NOT NULL DEFAULT '{}'` con `CHECK (cardinality(...) <= N)` (3, 5, 5).
Los valores permitidos **no** se validan en la base (lista cerrada en `src/lib/music-identity.ts`):
agregar un género es cambiar código, no una migración. `show_local_time` (`BOOLEAN NOT NULL DEFAULT
false`) exige `timezone` (`chk_app_user_local_time`). La migración también deja en `NULL` las
`timezone` previas que no existan en `pg_timezone_names` (eran texto libre que ninguna vista mostraba).

**Cuenta desactivada (migración `0041`, `rework-account-settings` Fase 3):** `deactivated_at`
(TIMESTAMPTZ nullable; nulo = cuenta activa). Desactivar solo escribe esta columna y borra las sesiones;
no toca ninguna otra tabla, así que valoraciones, reseñas, comentarios, listas, favoritos, diario y
seguimientos se conservan. Toda consulta que muestre personas filtra con `activeUserCondition()`
(`services/auth/account-status.ts`). Eliminar la cuenta es `DELETE FROM app_user`: las tablas del
usuario declaran `ON DELETE CASCADE`; solo las de auditoría (`moderation_action`, `user_role_action`,
`editorial_action` como actor y `user_list.editorial_*`) usan `RESTRICT`, y por eso una cuenta con
historial no se puede eliminar (Postgres responde `23001`).

## `user_profile_prompt`

**Propósito:** las preguntas del perfil de una persona (capability `profile-music-identity`): hasta 3,
una línea cada una, que la Placa muestra en su ficha.

**Columnas y restricciones:** `user_id` (FK a `app_user`, `ON DELETE CASCADE`), `prompt_key` (de una
lista cerrada validada en la aplicación), `answer` (`CHECK char_length BETWEEN 1 AND 100` y sin `\r`/`\n`),
`position` (`SMALLINT`, `CHECK BETWEEN 0 AND 2`). `UNIQUE (user_id, prompt_key)` impide responder dos
veces la misma pregunta y `UNIQUE (user_id, position)` con `position` 0..2 hace que la base impida una
cuarta. El conjunto se reemplaza completo al guardar (borrado + inserción en una transacción).

## `username_alias`

**Propósito:** reserva del usuario anterior durante 30 días tras un cambio de usuario (capability
`account-username`). Mientras dura, nadie más puede registrarse, darse de alta con Google ni cambiarse a
ese usuario, y `/users/<anterior>` redirige al usuario actual.

**Columnas e índices:** `user_id` (FK a `app_user`, `ON DELETE CASCADE`), `username`, `created_at`,
`expires_at` (`CHECK expires_at > created_at`). `uq_username_alias_lower` es único sobre
`lower(username)`; `idx_username_alias_user` y `idx_username_alias_expires_at` sirven a la limpieza. Los
alias vencidos **no se consultan** (todas las lecturas filtran `expires_at > now()`) y se borran al
renombrar; no hay job.

## `email_change_token`

**Propósito:** cambio de email pendiente de confirmar (capability `account-credentials`). El email de
`app_user` **no cambia** hasta consumir el token.

**Seguridad:** igual que `email_verification_token`: solo el hash SHA-256 del token opaco (el token en
claro viaja únicamente en el enlace del correo al email **nuevo**), TTL de 24 horas, un solo token
vigente por usuario (`uq_email_change_token_user`; un pedido nuevo lo reemplaza con `INSERT … ON
CONFLICT`) y borrado físico al confirmar (`DELETE … RETURNING` dentro de la transacción que actualiza el
email). Guarda `new_email` (ya en minúsculas). `ON DELETE CASCADE`.

## `user_role`

**Propósito:** asignaciones acumulables de roles de plataforma (`moderator`/`admin`/
`editorial_curator`). La ausencia de filas representa a un usuario común. `UNIQUE (user_id, role)`
impide duplicar una asignación.

La asignación inicial se realiza mediante operaciones internas y conserva `granted_by` y
`created_at`; `user_role_action` mantiene el historial de concesiones y revocaciones.

## `user_restriction`

**Propósito:** restricciones temporales con alcance. La primera versión admite `social_activity`:
bloquea nuevas acciones públicas/sociales, pero no el login ni la lectura del contenido propio o
público. La restricción es activa cuando comenzó, no fue revocada y no expiró.

Conserva motivo, actor, fechas de inicio/expiración y revocación. No elimina contenido existente.

## `content_report` y `moderation_action`

`content_report` recibe reportes de comentarios, reseñas o perfiles de usuario (`comment_id`,
`review_id` o `user_id`, exactamente uno — migración `0024`) y evita reportes pendientes duplicados
por autor y objetivo. `moderation_action` registra ocultaciones/restauraciones, resoluciones y
descartes de reportes y suspensiones/revocaciones sociales con su actor, objetivo (comentario,
reseña, lista, restricción o usuario), motivo y fecha; el `CHECK` de `action` admite `hide`,
`restore`, `report_resolve`, `report_dismiss`, `suspend_social` y `revoke_social` (migración `0023`).

Comentarios, reseñas y listas tienen `moderation_status` (`visible`/`hidden`) para separar la
moderación reversible del borrado físico del autor. `user_list` agrega además `is_official`,
`official_published_by`, `official_published_at` y `official_withdrawn_at` (migración `0023`) para
la publicación editorial; solo una cuenta con permiso administrativo puede establecerlo, y solo
sobre listas de la cuenta curadora `@exploracion` (las listas generales de `/explore`), nunca sobre
listas personales de otros usuarios. Una lista editorial "retirada" conserva `is_official = false`
con `official_withdrawn_at` poblado, lo que la distingue de una lista curadora que nunca fue oficial
y la excluye del descubrimiento público mientras siga retirada.

La migración `0025` (cambio `add-editorial-curator-role`) agrega a `user_list`
`editorial_author_id` (la persona que creó el borrador; el `owner_id` sigue siendo `@exploracion`,
que no puede iniciar sesión), `editorial_submitted_at` y `editorial_submitted_by` (propuesta para
publicación). El estado editorial se deriva por presencia de estas columnas más `is_official` y
`official_withdrawn_at`: **borrador** (`is_official = false`, `official_withdrawn_at IS NULL`,
`editorial_author_id` poblado, `editorial_submitted_at` nulo), **propuesta** (igual, con
`editorial_submitted_at` poblado), **publicada** (`is_official = true`) y **retirada**
(`is_official = false`, `editorial_author_id` poblado, `official_withdrawn_at` poblado). El rol
`editorial_curator` autoriza crear/editar/proponer (`editorial.author`) pero no publicar ni retirar
(`editorial.publish`).

`editorial_action` (migración `0025`) audita las acciones de autoría editorial —creación, edición,
propuesta, publicación y retirada— con `actor_id`, `list_id` y `created_at`, siguiendo el patrón de
`user_role_action` y `moderation_action`. El FK a `user_list` es `ON DELETE CASCADE`: al borrar un
borrador nunca publicado desaparece su historial, que no tiene nada público que auditar. Los
borradores nunca publicados (`is_official = false` y `official_withdrawn_at IS NULL`) pueden
borrarse; las listas publicadas o retiradas no.

`password_hash` es nullable para permitir usuarios autenticados mediante proveedores externos.
Cuando tiene valor, contiene únicamente el hash Argon2id de la contraseña local; nunca se guarda la
contraseña en texto plano.

`profile_visibility` (migración `0007`) es `'public'` o `'private'`, con default `'public'`. Define
la visibilidad predeterminada del perfil; las actividades futuras podrán sobrescribirla con una
audiencia propia.

`onboarded_at` (`TIMESTAMPTZ` nullable, migración `0020`, cambio `add-two-door-onboarding`):
nulo = el onboarding de dos puertas (`/welcome`) está pendiente. Se fija al completar o
saltar el flujo. Mientras sea nulo, la redirección post-alta lleva a `/welcome` e Inicio
muestra un enlace pasivo. La migración hace `UPDATE app_user SET onboarded_at = created_at`
— todos los usuarios preexistentes quedan onboardeados y nunca ven `/welcome`.

## `user_profile_link`

**Propósito:** enlaces externos del perfil (migración `0014`, hasta 5 por usuario validados en el
servicio), con orden explícito (`position`).

**Restricciones:** `kind` es un conjunto cerrado con `CHECK` `chk_user_profile_link_kind`:
`bandcamp`, `lastfm`, `discogs`, `instagram`, `youtube`, `soundcloud`, `x`, `tiktok`, `spotify` y
`other` (Enlace). `x`, `tiktok` y `spotify` se añadieron en la migración `0035` (cambio
`add-profile-link-validation`; el `CHECK` original de `0014` era anónimo y esa migración lo
reemplaza) y `website`, idéntico a `other` salvo la etiqueta, se unificó en `other` en la `0036`
(las filas se convirtieron conservando URL y posición). `url` ≤ 400 caracteres.

Solo se guarda la `url` canónica. Para los tipos por usuario (todos salvo `other`) la
URL se construye a partir del usuario que escribió la persona (`https://www.instagram.com/ana`) y el
usuario se vuelve a derivar de la URL cuando hace falta (`src/lib/profile-links.ts`); no hay columna
`handle`. Los enlaces anteriores a esa validación que no coinciden con su tipo se conservan y se
validan al editarlos.

## `user_follow`

**Propósito:** relación unilateral de seguimiento entre usuarios, con solicitudes para perfiles
privados (migración `0007`).

**Relaciones:** `follower_id` y `followed_id` referencian `app_user`.

**Restricciones:**

- `FOREIGN KEY` con `ON DELETE CASCADE` en ambas direcciones.
- `UNIQUE (follower_id, followed_id)` impide más de una relación por pareja.
- `CHECK (follower_id <> followed_id)` impide auto-seguimiento.
- `status` es `'pending'` o `'accepted'`: seguir un perfil público crea `accepted`; seguir un
  perfil privado crea `pending`. Aprobar cambia a `accepted`; rechazar, cancelar o dejar de seguir
  elimina la fila.
- `updated_at` lo mantiene el trigger `trg_user_follow_touch` (reutiliza `fn_touch_updated_at`).

## `artist_follow`

**Propósito:** relación unilateral **usuario → artista** (migración `0021`, cambio
`add-artist-following`, Fase 2 de `redefine-content-hierarchy`). Señal de afinidad,
descubrimiento y organización personal. Distinta de `favorite` con objetivo artista (gusto
declarado) y de `user_follow` (usuario → usuario).

**Relaciones:** `user_id` referencia `app_user`, `artist_id` referencia `artist`; ambas con
`ON DELETE CASCADE`.

**Restricciones:**

- **Sin `status`**: un artista no aprueba solicitudes. Seguir = insertar la fila; dejar de
  seguir = borrarla. Toggle idempotente.
- `UNIQUE (user_id, artist_id)` (`uq_artist_follow_pair`): un usuario sigue a un artista a
  lo sumo una vez.
- Índice `idx_artist_follow_artist` para recuperación por artista.

**Espacio para el futuro:** las notificaciones de lanzamiento (fuera de alcance en Fase 2)
se agregarían de forma aditiva — una tabla `artist_release_seen` o una columna `notify` —
sin migrar esta relación.

## `user_block`

**Propósito:** bloqueo básico entre cuentas (migración `0007`).

**Relaciones:** `blocker_id` y `blocked_id` referencian `app_user`.

**Restricciones:**

- `FOREIGN KEY` con `ON DELETE CASCADE` en ambas direcciones.
- `UNIQUE (blocker_id, blocked_id)` impide bloques duplicados.
- `CHECK (blocker_id <> blocked_id)` impide auto-bloqueo.

Mientras existe un bloqueo, no se pueden crear relaciones de seguimiento en ninguna dirección, se
eliminan las relaciones y solicitudes existentes entre ambas cuentas, y las acciones sociales
restringidas quedan bloqueadas en el backend.

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

**Dispositivo y actividad (migración `0039`):** `device_label` (TEXT nullable, `CHECK length <= 80`) es
una etiqueta legible derivada del User-Agent al crear la sesión (`Chrome · Windows`); **nunca** se
guarda el User-Agent completo ni la IP. `last_seen_at` se actualiza como mucho una vez cada 10 minutos.
Ambas son nulas en las sesiones anteriores, que siguen siendo válidas ("Dispositivo desconocido").

**Limpieza:** las sesiones expiradas se eliminan mediante un job periódico y mediante limpieza
oportunista durante operaciones de autenticación o resolución de sesión. La limpieza oportunista
no debe bloquear la respuesta principal.

**Columnas e índices:** `token_hash` es obligatorio y único para resolver un token opaco sin
persistir el token real. `idx_session_user` permite revocar las sesiones de un usuario y
`idx_session_expires_at` permite localizar sesiones vencidas para el job de limpieza. La FK a
`app_user` usa `ON DELETE CASCADE`. La restricción `expires_at > created_at` impide sesiones ya
vencidas al momento de crearse; la expiración sigue siendo fija porque la aplicación no modifica
`expires_at` durante requests normales.

## `password_reset_token`

**Propósito:** token de un solo uso para restablecer la contraseña de una cuenta con contraseña
local. Lo genera `POST /api/auth/password/forgot` y lo consume `POST /api/auth/password/reset`.

**Seguridad:** igual que `session`, guarda únicamente el hash SHA-256 del token opaco; el token en
claro solo viaja en el link del correo. La expiración es de 30 minutos y el token es de un solo uso:
el consumo se implementa con un borrado atómico (`DELETE ... WHERE token_hash = ... AND
expires_at > now() RETURNING user_id`), sin columna `used_at`. Pedir un token nuevo elimina los
tokens previos del usuario, de modo que solo el último link emitido es válido.

**Relaciones:** pertenece a exactamente un `app_user`; `ON DELETE CASCADE`.

**Índices:** `uq_password_reset_token_hash` único para resolver el token sin persistirlo;
`uq_password_reset_token_user` único sobre `user_id`, que garantiza a nivel de PostgreSQL un solo
token vigente por usuario (un pedido nuevo reemplaza el anterior con `INSERT ... ON CONFLICT`);
`idx_password_reset_token_expires_at` permite localizar los vencidos para la limpieza. La
restricción `expires_at > created_at` impide tokens ya vencidos al crearse.

**Diferencias con `session`:** una sesión autentica; un token de reset solo autoriza un cambio de
contraseña. Al completarse el reset se eliminan todos los tokens del usuario y todas sus sesiones
(sin autologin). Las cuentas sin `password_hash` (Google) no pueden generar ni consumir tokens
(ADR 0014).

## `email_verification_token`

**Propósito:** token de un solo uso para verificar el email de una cuenta local. Lo genera el
registro (`POST /api/auth/register`) o el reenvío autenticado, y lo consume
`POST /api/auth/email/verify` (change `add-email-verification`).

**Seguridad:** igual que `password_reset_token`, guarda solo el hash SHA-256; el token en claro
viaja únicamente en el link del correo. TTL de 24 h, un solo uso por borrado atómico y un solo token
vigente por usuario (`uq_email_verification_token_user` + `INSERT ... ON CONFLICT`). Pedir un reenvío
reemplaza el token anterior.

**Relaciones:** pertenece a un `app_user`; `ON DELETE CASCADE`.

**Estado asociado:** `app_user.email_verified_at` (TIMESTAMPTZ nullable) registra si el email está
verificado. La migración `0033` hizo backfill de las cuentas preexistentes
(`email_verified_at = created_at`) y las altas de Google se marcan al crearse. La verificación
funciona en modo soft: no bloquea login ni acciones (ADR 0015).

**Índices:** `uq_email_verification_token_hash` único para resolver el token;
`uq_email_verification_token_user` único para un token por usuario;
`idx_email_verification_token_expires_at` para la limpieza. `CHECK (expires_at > created_at)` impide
tokens ya vencidos al crearse.

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
- `UNIQUE (person_id, group_id)` impide duplicar la misma relación persona/grupo y permite hacer upsert idempotente.
- **Trigger `trg_membership_types`**: valida que `person_id` apunte a un `artist` con `type='person'` y `group_id` a uno con `type='group'`. No es posible expresar esto con un `CHECK` porque requiere consultar otra tabla.

Antes de crear la unicidad, la migración `0006_membership_sync.sql` consolida cualquier duplicado existente: conserva una fila canónica, combina los roles y conserva el intervalo más amplio representable. La inspección previa a aplicar esta migración en `music_platform_scratch` no encontró duplicados.

`artist.memberships_synced_at` es nullable. `NULL` indica que todavía debe intentarse la ingesta de memberships desde MusicBrainz; una fecha indica que la sincronización terminó correctamente y permite leer las relaciones exclusivamente desde PostgreSQL. La ingesta toma un `pg_advisory_xact_lock` por artista y relee este flag dentro de la transacción para que las solicitudes concurrentes no dupliquen la llamada externa. La misma transacción hace upsert de artistas y memberships, elimina solo las relaciones actuales del artista que ya no aparecen en la respuesta válida y marca el flag al final; cualquier error revierte el conjunto completo.

## `release_group`

**Propósito:** el álbum como concepto general — el nivel al que pertenecen la valoración y los comentarios de "el álbum", independiente de cuántas ediciones tenga.

**Restricciones:** `category` limitado a `studio`, `single_ep`, `compilation`, `live_other`.

**Fecha de lanzamiento canónica (`first_release_date` / `first_release_year`, migración `0016`):**
la fecha del **álbum**, derivada de `first-release-date` de MusicBrainz (calculada sobre todas las
ediciones), no de la edición ingerida en `release.release_date`. `first_release_date` (`DATE`
nullable) solo se puebla con precisión diaria; `first_release_year` (`SMALLINT` nullable) con
cualquier año conocido — misma tolerancia a precisión parcial que `release.release_date`, nunca se
inventa mes ni día. La escribe `findOrIngestTracklist` como fuente autoritativa; los stubs de
búsqueda y discografía la siembran en la creación pero no la sobrescriben. Corregir filas ya
existentes: `scripts/recanonicalize-release-group.ts`. Índice `idx_release_group_first_year` para
ordenar la discografía por año.

**Carátula (`cover_thumb_url`):** URL de la miniatura de 250px de la portada del álbum, resuelta contra
Cover Art Archive a nivel de **release-group** (ver `data-licensing.md`). Es la **única fuente escribible**
de la carátula: se resuelve bajo demanda con un `HEAD` a CAA sin ingestar el tracklist de una edición (patrón
cover-only, ver `04-api/contracts.md`). Es `null` cuando el álbum no tiene carátula (demos/outtakes). Si el
valor cacheado es `null`, la resolución se re-intenta en cada acceso posterior por si la portada aparece
después (self-heal, mismo criterio que aplicaba `release`).

## `release`

**Propósito:** una edición concreta de un `release_group` (original, edición japonesa, remaster de aniversario). Aquí vive el tracklist real, vía `track`.

**Relaciones:** `release_group_id` obligatorio — toda edición pertenece a exactamente un álbum conceptual.

**Edición representativa (openspec: `canonicalize-release-group`):** se ingiere **una sola** edición
por álbum, elegida de forma determinista por `pickRepresentativeRelease`
(`src/services/catalog/representative-release.ts`): `Official` → fecha más temprana → edición estándar
(sin `deluxe`/`remaster`/… en título o disambiguation) → país primario → packaging estándar →
recuento de pistas cercano a la mediana → desempate por `mbid`. `edition_label` se deriva de la
edición elegida (`disambiguation` → sufijo de título → `"standard"`), ya no es siempre `"original"`.
La invariante "un `release` por `release_group`" se mantiene; corregir una elección subóptima ya
ingerida reemplaza `release` + `track` sin tocar datos sociales
(`scripts/recanonicalize-release-group.ts`).

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

**Presentación (cambio `rebalance-catalog-detail-pages`):** el modelo sigue aceptando los
tres tipos de objetivo, pero las páginas de detalle ya no los exponen igual — el rating de
**canción** vive detrás de una divulgación secundaria y el de **artista** no se muestra en
absoluto (la expresión de artista pasa a ser una nota corta). Los ratings de artista/canción
creados antes del cambio se conservan intactos; solo cambia qué renderiza la UI.

**Restricciones:**

- `CHECK (num_nonnulls(artist_id, release_group_id, recording_id) = 1)`: un objetivo exacto por valoración.
- `CHECK (stars BETWEEN 0.5 AND 5 AND stars = ROUND(stars*2)/2.0)`: pasos de 0.5.
- `CHECK` de banda: la valoración detallada, si existe, debe caer dentro del rango de 10 puntos que corresponde a las estrellas elegidas — la regla de coherencia definida en `01-domain/business-rules.md`, aplicada matemáticamente, no solo documentada.
- Índices únicos parciales (`uq_rating_user_*`): un usuario solo puede tener una valoración vigente por objetivo.
- **Trigger `trg_rating_touch`**: mantiene `updated_at` automáticamente en cada edición.

## `comment`

**Propósito:** comentarios de texto libre, independientes de la valoración — a diferencia de `rating`, no hay restricción de unicidad por usuario y objetivo.

**Restricciones:** `CHECK (num_nonnulls(artist_id, release_group_id, recording_id) = 1)`, igual que `credit` y `rating`.

## `review`

**Propósito:** la reseña como entidad propia (migración `0017`, cambio `add-album-review`) — la
postura crítica del usuario sobre una obra: texto largo (`body`, 1–10000), `title` opcional, editable.
Distinta de `comment` (nota conversacional corta, N por objetivo). **El rating no se guarda acá**:
`rating` es la única fuente de verdad; el listado lo trae por `LEFT JOIN` sobre `(user_id, <target>)`
y refleja el valor vigente (o `null` si el autor borró su rating). Borrar la reseña **no** toca el
rating; borrar el rating deja la reseña con rating `null`.

**Restricciones:**

- `CHECK (num_nonnulls(artist_id, release_group_id, recording_id) = 1)`: un objetivo exacto, misma
  forma que `rating`/`comment` (no polimórfica).
- `CHECK (title IS NULL OR char_length(title) BETWEEN 1 AND 120)` y `CHECK (char_length(body) BETWEEN 1 AND 10000)`.
- Índices únicos parciales (`uq_review_user_*`): **una reseña vigente por usuario y objetivo** (como `rating`).
- **Trigger `trg_review_touch`**: mantiene `updated_at`.

**Restricción de producto (no de esquema):** en esta versión solo se escriben reseñas de álbum
(`REVIEWABLE_TARGET_TYPES` en `src/services/reviews.ts`). La tabla admite los tres objetivos desde
ya — habilitar artista/canción no requiere migración.

## `listen_entry`

**Propósito:** el diario de escucha (Fase 5, cambio `add-listen-diary-reactions`). Registra cada
momento en que un usuario quiere dejar constancia de que algo sonó. Es **append-only**: no hay
índice único por usuario/objetivo — un usuario puede tener tantas entradas sobre el mismo álbum
como escuchas quiera registrar, y una nueva entrada nunca reemplaza una anterior.

**Campos:**

- `user_id` y exactamente uno de `artist_id` / `release_group_id` / `recording_id`
  (`CHECK (num_nonnulls(...) = 1)`, mismo patrón polimórfico que `rating`/`comment`).
- `listen_context`: `first_listen`, `relisten` o `rediscovery` (el servidor propone
  `first_listen` en la primera entrada del usuario sobre el objetivo y `relisten` en las
  siguientes; el usuario puede corregirlo).
- `body`: impresión breve opcional, `CHECK (body IS NULL OR length(body) <= 500)`.
- `reaction`: reacción emocional opcional (`liked`, `loved`, `obsessed`, `neutral`, `disliked`).
  **`NULL` (ausencia de dato) es distinto de `neutral` (elección explícita).** Esta columna
  **reemplaza deliberadamente las estrellas**: `listen_entry` no tiene valoración numérica ni
  ninguna relación con `rating` — la gramática de sensación es independiente de la gramática de
  valoración (los textos de reacción viven en i18n, no en la base).
- `audience`: `private`, `followers` o `public`, con `DEFAULT 'followers'`. Se persiste desde el
  inicio para alimentar el futuro feed y el perfil; en este incremento solo se consulta el diario
  propio.

**Índices:** `idx_listen_entry_user_created` (diario por usuario, fecha descendente) y uno por
objetivo (`idx_listen_entry_artist`, `idx_listen_entry_release_group`, `idx_listen_entry_recording`).

## `favorite`

**Propósito:** señal simple de interés (Fase 5, cambio `add-favorites-and-lists`). Marca
liviana sobre un artista, un álbum o una canción, sin escala numérica. Es un toggle
idempotente: un usuario tiene a lo sumo un favorito por objetivo.

**Campos:**

- `user_id` y exactamente uno de `artist_id` / `release_group_id` / `recording_id`
  (`CHECK (num_nonnulls(...) = 1)`, mismo patrón polimórfico que `rating`/`comment`).
- `audience`: `private`, `followers` o `public`, con `DEFAULT 'followers'`. Independiente de
  la audiencia de escuchas, ratings y comentarios.
- `created_at`: fecha de creación.

**Restricciones:**

- `CHECK (num_nonnulls(artist_id, release_group_id, recording_id) = 1)`: un objetivo exacto
  por favorito.
- `UNIQUE (user_id, artist_id)`, `UNIQUE (user_id, release_group_id)`,
  `UNIQUE (user_id, recording_id)`: un usuario tiene a lo sumo un favorito por objetivo.
  Estos índices únicos son la base del toggle idempotente.

**Índices:** `idx_favorite_user_created` (favoritos propios, fecha descendente) y uno por
objetivo (`idx_favorite_artist`, `idx_favorite_release_group`, `idx_favorite_recording`).

## `want_to_listen_entry`

**Propósito:** señal prospectiva "quiero escuchar esto" (cambio `add-want-to-listen`).
Mismo patrón de objetivo polimórfico que `favorite`, pero **acotada a artista y álbum**: sin
`recording_id`, las canciones quedan fuera por decisión de producto. Se retira desde la app
(no por trigger) cuando el usuario registra una escucha del mismo objetivo — ver
`createListenEntry` en `src/services/diary/diary.ts`.

**Campos:**

- `user_id` y exactamente uno de `artist_id` / `release_group_id`
  (`CHECK (num_nonnulls(...) = 1)`, dos columnas en vez de tres).
- `created_at`: fecha de creación. Sin `audience`: es una lista de gestión personal, sin
  superficie pública ni de terceros (a diferencia de `favorite`).

**Restricciones:**

- `CHECK (num_nonnulls(artist_id, release_group_id) = 1)`: un objetivo exacto por entrada.
- `UNIQUE (user_id, artist_id)`, `UNIQUE (user_id, release_group_id)`: un usuario tiene a lo
  sumo una entrada por objetivo. Base del toggle idempotente.

**Índices:** `idx_want_to_listen_entry_user_created` (listado propio, fecha descendente) y
uno por objetivo (`idx_want_to_listen_entry_artist`, `idx_want_to_listen_entry_release_group`).

## `user_album_pin` (eliminada)

**Retirada en la migración `0038`** (cambio `simplify-profile-curation`). Guardaba el orden
manual de hasta 6 álbumes favoritos fijados (migración `0019`); la sección "Álbumes
favoritos" del perfil se eliminó porque repetía la fila de álbumes de Favoritos. Los
`favorite` de álbum y su audiencia no cambian, y el álbum definitorio de la Tarjeta de
Identidad es una referencia directa en `user_showcase` (migración `0030`), sin relación con
esta tabla. El orden manual perdido no se puede reconstruir.

## `user_list`

**Propósito:** cabecera de una lista curada (Fase 5, cambio `add-favorites-and-lists`).
Colección con título, descripción opcional y un tipo de entidad fijo. La primera versión es de
propiedad de un único usuario (no colaborativa) y de un solo tipo de entidad (no mixta).

**Campos:**

- `owner_id`: propietario de la lista.
- `entity_type`: `'artist'`, `'release-group'` o `'recording'` — fijo al crear, no
  modificable después. En kebab-case (migración `0011`), igual que el contrato
  de API (`SocialTargetTypeSchema`).
- `title`: obligatorio, hasta 100 caracteres.
- `description`: opcional, hasta 500 caracteres.
- `audience`: `private`, `followers` o `public`, con `DEFAULT 'followers'`.
- `created_at`, `updated_at`: `updated_at` lo mantiene el trigger
  `trg_user_list_updated_at`. Si la transacción tiene `app.preserve_updated_at = 'on'` el trigger
  conserva el valor anterior (migración `0037`, cambio `apply-default-audience`); sin el indicador
  pone `now()` como siempre. Solo lo activa "Aplicar a lo existente".

**Índices:** `idx_user_list_owner_created` (listas propias, fecha descendente) y
`idx_user_list_owner_audience` (listas públicas de un usuario en su perfil).

## `user_list_featured`

**Propósito:** marca una `user_list` como **colección destacada** del descubrimiento
`/explore` (migración `0018`, cambio `add-album-discovery`). Presencia de fila = destacada;
`rank` (SMALLINT, `NOT NULL`, `UNIQUE`, `CHECK > 0`) define el orden ascendente del riel
editorial. Las filas las escribe `scripts/seed-discovery.ts`, no una acción de usuario.

**Solo señal de distribución:** no cambia visibilidad, permisos, lectura ni comportamiento
de la lista en ninguna otra superficie. **Tabla aparte a propósito** (mismo motivo que
`user_list_pin`): `user_list.updated_at` lo bumpea un trigger en cualquier `UPDATE` y el
feed deriva de ahí los eventos de "lista actualizada" — escribir la marca en `user_list`
generaría un evento de feed falso al sembrar.

**Cuenta curadora:** las colecciones editoriales son listas públicas de `app_user`
`exploracion` (`display_name` "Exploración", `password_hash` NULL — no puede iniciar
sesión, se comporta como una cuenta solo-OAuth). El seed la crea.

## `user_list_item`

**Propósito:** elemento individual dentro de una `user_list`. El tipo de entidad del objetivo
debe coincidir con el `entity_type` de la lista padre (validado por trigger
`trg_user_list_item_target_type`).

**Campos:**

- `list_id`: referencia a la lista padre, `ON DELETE CASCADE`.
- Exactamente uno de `artist_id` / `release_group_id` / `recording_id`
  (`CHECK (num_nonnulls(...) = 1)`).
- `position`: entero para orden manual. Los ítems se reordenan reescribiendo `position`
  completo en una transacción (`UNIQUE (list_id, position)`).
- `created_at`: fecha de creación.

**Restricciones:**

- `UNIQUE (list_id, artist_id)`, `UNIQUE (list_id, release_group_id)`,
  `UNIQUE (list_id, recording_id)`: un mismo objetivo a lo sumo una vez por lista.
- `UNIQUE (list_id, position)`: orden determinista. El reordenamiento se hace en una
  transacción que reescribe las posiciones; la restricción es `DEFERRABLE INITIALLY DEFERRED`
  (migración `0010`) para permitir las reescrituras intermedias sin violar la unicidad hasta
  el commit.

**Trigger `trg_user_list_item_target_type`**: valida que el objetivo del ítem coincida con
`entity_type` de la lista padre. No es posible expresar esto con un `CHECK` porque requiere
consultar otra tabla (mismo criterio que `trg_membership_types`).

## `collection_entry`

**Propósito:** declaración de coleccionismo físico (Fase 5, cambio `add-physical-collection`).
Cada fila es una copia física de un álbum que el usuario posee. A diferencia de
`favorite` / `rating` / `comment`, el objetivo es **fijo (solo álbum)**: FK directa a
`release_group`, sin el patrón `CHECK (num_nonnulls(...) = 1)`. `format` y `attributes` son
100% dato del usuario — el catálogo no modela formato físico.

**Campos:**

- `user_id`: dueño de la entrada, `ON DELETE CASCADE`.
- `release_group_id`: álbum, `NOT NULL`, `ON DELETE CASCADE`.
- `format`: soporte físico. `CHECK (format IN ('vinyl', 'cd', 'cassette', 'other'))`.
  Formatos digitales quedan deliberadamente fuera.
- `attributes`: `TEXT[]` de un vocabulario cerrado y curado de cualidades de edición/copia
  (`limited-edition`, `numbered`, `first-press`, `reissue`, `remaster`, `anniversary-edition`,
  `deluxe-edition`, `colored-vinyl`, `picture-disc`, `180g`, `gatefold`, `box-set`,
  `regional-edition`, `bonus-tracks`, `extra-disc`, `signed`, `promo`). Default `'{}'`.
  `CHECK (attributes <@ ARRAY[...]::TEXT[])`. El servicio deduplica y ordena antes de persistir.
- `note`: nota libre opcional para el detalle que el vocabulario no captura.
  `CHECK (note IS NULL OR length(note) <= 140)`. No se interpreta ni se valida contra catálogo.
- `audience`: `private` / `followers` / `public`, default `followers` (mismo patrón que
  `favorite` / `listen_entry`).
- `created_at` / `updated_at`: `updated_at` lo mantiene el trigger
  `trg_collection_entry_updated_at` (regla del proyecto: nunca desde la app). Con
  `app.preserve_updated_at = 'on'` en la transacción conserva el valor anterior (migración `0037`,
  igual que `user_list`).

**Restricciones:** ninguna de unicidad. Se permiten **varias entradas por (usuario, álbum)**,
con el mismo o distinto `format`, para representar copias distinguibles (vinilo + CD, dos
ediciones del mismo CD). No es un toggle idempotente.

**Índices:** `idx_collection_entry_user_created` (colección propia, fecha descendente),
`idx_collection_entry_user_release_group` (copias del usuario para un álbum, acción en la
página de álbum), `idx_collection_entry_release_group` (recuperación por álbum) e
`idx_collection_entry_attributes` (`GIN` sobre `attributes`, filtro por atributo).
