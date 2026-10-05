# AGENTS.md

Toda la documentación (producto, dominio, arquitectura, datos) vive en `/docs` —
empezar por `/docs/README.md` antes de tocar código. Código y comentarios en español.

## Comandos

- **Setup:** `cp .env.example .env` (completar `DATABASE_URL` y
  `MUSICBRAINZ_USER_AGENT`), `pnpm install`, `pnpm run db:migrate`, `pnpm run dev`.
- `pnpm run typecheck` — `tsc --noEmit` sobre el proyecto completo, no solo el
  archivo tocado: valida contra `.next/types/` y es lo único que detecta firmas
  viejas de rutas dinámicas de Next 15.
- `pnpm run lint`, `pnpm run build`.
- CI corre, en este orden: `pnpm install --frozen-lockfile && typecheck && lint && test && build`
  (`.github/workflows/ci.yml`). No corre migraciones.
- La verificación de integración manual son los smoke tests en `scripts/`
  (requieren Postgres real vía `DATABASE_URL`; mockean
  `global.fetch`, no salen a internet real):
  `smoke-test-google-oauth.ts` además mockea `next/headers` (cookie jar en
  memoria) para ejercitar los route handlers reales de OAuth fuera de Next, y
  setea credenciales de Google falsas en `process.env` — no necesita una app
  OAuth real; cubre alta nueva, identidad existente, email colisionado,
  `email_verified=false` y retorno a `/<locale>/search` (ver `auth.md` sección 6).

```bash
  npx tsx --env-file=.env scripts/smoke-test-*.ts
```

`src/db/index.ts` lee `DATABASE_URL` directo de `process.env` — sin
`--env-file=.env` el script falla aunque `.env` exista.
Correr `smoke-test-ingestion.ts` primero: `smoke-test-routes.ts` y otros
necesitan datos ya poblados (ej. un artista "Pink Floyd" existente).
`smoke-test-ingestion.ts` exige una BD de scratch **virgen** (aborta si Pink
Floyd ya tiene la discografía sincronizada): no es idempotente y forzar el
reset marcaría discos reales como fuera de la discografía. `smoke-test-routes.ts`
stubea `next/server.after` y elige su release-group por mbid, así que no depende
de cuál de las filas con el mismo título haya en la BD.

> **⚠️ Los smoke tests ESCRIBEN fixtures en la BD y contaminan el catálogo.**
> Mockean `global.fetch`, así que ingieren datos sintéticos (mbid falsos, álbumes
> de prueba) y, en el caso de `smoke-test-ingestion.ts`, marcan el artista con
> `discography_synced_at` — dejándolo "congelado" con datos falsos y evitando que
> la app re-ingiera la discografía real desde MusicBrainz (incidente real con
> Pink Floyd en 2026-08).
> **Por defecto los smoke tests ABORTAN** (`scripts/assert-smoke-allowed.ts`,
> fail-closed): hay que habilitarlos explícitamente con `ALLOW_SMOKE_ON_REAL_DB=1`,
> idealmente contra una **BD de scratch** (otro `DATABASE_URL`). Si se usó la BD
> real, **resetear** los artistas tocados antes de cerrar:
>
> - `UPDATE artist SET discography_synced_at = NULL WHERE name = '<artista>';`
> - borrar los `release_group` sintéticos creados (mbid `*-0000-4000-8000-*` o
>   ajenos a la discografía real).
> - `smoke-test-unknown-enrichment.ts` / `smoke-test-artist-by-id.ts` crean un
>   stub "Farruko" (`9b90d5a6-8b3f-4e2d-9f11-7e0c0d3a1a01`) y
>   `smoke-test-discography-cache.ts` un artista de prueba — borrarlos si se
>   corrió en la BD real.
> - `smoke-test-social.ts` crea tres usuarios `smoke-social-*` (público, privado
>   y seguidor) y los borra al terminar; si se interrumpió, limpiar con
>   `DELETE FROM app_user WHERE username LIKE 'smoke-social-%';`.
> - `smoke-test-password-reset.ts` crea dos usuarios `smoke-reset-*` (con
>   contraseña local y solo-Google) y los borra al terminar; el `ON DELETE
>   CASCADE` limpia sus tokens y sesiones. Si se interrumpió, limpiar con
>   `DELETE FROM app_user WHERE username LIKE 'smoke-reset-%';`. Mockea el
>   transporte de email capturando el token del adaptador `console`; no envía
>   correo real.
> - `smoke-test-keep-signed-in.ts` crea un usuario `smoke_keep_*` y lo borra al terminar (el `ON DELETE
>   CASCADE` limpia sus sesiones). Si se interrumpió, limpiar con
>   `DELETE FROM app_user WHERE username LIKE 'smoke_keep_%';`. Necesita la migración `0058` aplicada.
>   Verifica la duración y la renovación por uso de las sesiones mantenidas, que las no mantenidas no se
>   renuevan y caducan, la rotación que conserva la elección y que una sesión anterior a la columna
>   queda como mantenida. `smoke-test-google-oauth.ts` además cubre `remember=0` y la reautenticación.
> - `smoke-test-account-settings.ts` crea usuarios `smoke_acct_*` y los borra al terminar (el `ON
>   DELETE CASCADE` limpia alias, tokens y sesiones). Si se interrumpió, limpiar con
>   `DELETE FROM user_role_action WHERE actor_id IN (SELECT id FROM app_user WHERE username LIKE
>   'smoke_acct_%'); DELETE FROM app_user WHERE username LIKE 'smoke_acct_%';` (la primera sentencia
>   suelta las filas de auditoría del caso de eliminación bloqueada, que referencian al actor con
>   `RESTRICT`). Ejecuta contra Postgres real el SQL que las pruebas unitarias mockean (cambio de
>   usuario, cambio de email, contraseña, Google, sesiones, identidad musical y, en la Fase 3, cuenta
>   desactivada en todas las superficies, reactivación, exportación y eliminación en cascada) y los datos
>   personales opcionales (país, ciudad y pronombres: `CHECK` de la base, los tres estados de pronombres
>   y su privacidad según el acceso al perfil). Necesita al menos un álbum en el catálogo.
> - `smoke-test-email-verification.ts` crea usuarios `smoke_verify_*` y los
>   borra al terminar (el `ON DELETE CASCADE` limpia tokens y sesiones). Si se
>   interrumpió, limpiar con
>   `DELETE FROM app_user WHERE username LIKE 'smoke_verify_%';`. Captura el
>   token de verificación del adaptador `console`; no envía correo real.
> - `smoke-test-album-editions.ts` y `smoke-test-personnel-credits.ts` (fixtures
>   compartidos en `scripts/smoke-album-fixtures.ts`) crean un álbum, ediciones,
>   grabaciones, obras, un sello y artistas con MBID sintéticos `5e0ce000-0000-4000-8000-*`
>   y los borran al terminar (también si fallan). Si se interrumpieron, limpiar con
>   `DELETE FROM release_group WHERE mbid::text LIKE '5e0ce000%'; DELETE FROM work WHERE
>   mbid::text LIKE '5e0ce000%'; DELETE FROM recording WHERE mbid::text LIKE '5e0ce000%';
>   DELETE FROM label WHERE mbid::text LIKE '5e0ce000%'; DELETE FROM artist WHERE
>   mbid::text LIKE '5e0ce000%';` (en ese orden: el `ON DELETE CASCADE` limpia releases,
>   pistas, ediciones, créditos, vínculos grabación ↔ obra, créditos de autoría y
>   pertenencias). Verifican la ingesta paginada de ediciones, variantes y pistas
>   adicionales, el índice único de representativa, la re-canonicalización, los créditos
>   de personal y la autoría de obras (compositores y letristas).
> - `smoke-test-artist-discography.ts` crea dos bandas, un artista invitado y cientos de
>   release-groups con el mismo prefijo sintético `5e0ce000-0000-4000-8000-*` y los borra al
>   terminar (también si falla); si se interrumpió, la limpieza de arriba lo cubre. Verifica la
>   discografía paginada sin bootlegs, los tipos crudos, la marca de fuera de la discografía (sin
>   borrar) y su reversión, la primera visita parcial de un artista con más de 300 discos, la
>   sincronización interrumpida sin marcas y la simulación sin escritura.
> - `smoke-test-artist-profile.ts` crea una banda y un integrante con el mismo prefijo
>   sintético `5e0ce000-0000-4000-8000-*` (el `ON DELETE CASCADE` limpia enlaces, textos por
>   idioma y pertenencias) y los borra al terminar (también si falla); si se interrumpió, la
>   limpieza de arriba lo cubre. Mockea MusicBrainz y Wikimedia (no sale a internet ni necesita
>   `WIKIMEDIA_USER_AGENT` real). Verifica la ficha con la misma request que las pertenencias,
>   los enlaces curados, la foto con crédito, los textos por idioma con respaldo, el lugar con
>   país, los `CHECK` de la migración `0054`, que un fallo de Wikimedia conserva los datos y el
>   retiro de fotos.
> - `smoke-test-artist-lineup.ts` crea una banda, tres integrantes o músicos de apoyo, otra banda
>   y un solista con el mismo prefijo sintético `5e0ce000-0000-4000-8000-*` (el `ON DELETE
>   CASCADE` limpia pertenencias, períodos y apoyo) y los borra al terminar (también si falla); si
>   se interrumpió, la limpieza de arriba lo cubre. Mockea MusicBrainz. Verifica los períodos con
>   las marcas aparte en una sola request, el apoyo (también a un solista), la clasificación y la
>   lectura, la sincronización de integrantes sin tocar al resto de la banda, la actualización que
>   suma y quita integrantes y los `CHECK` de la migración `0055`.
> - `smoke-test-genres.ts` **carga la taxonomía de géneros real** (`data/genres/taxonomy.json`) más
>   6 géneros sintéticos (MBID `5e0ce000-0000-4000-8000-*`, slugs `smoke-*`): cargar solo los
>   sintéticos ocultaría los reales. Crea una banda y dos álbumes con el mismo prefijo y, al terminar
>   (también si falla), borra artista, álbumes y géneros sintéticos; la taxonomía real queda cargada
>   tal como está en el archivo. Si se interrumpió, a la limpieza de arriba sumar
>   `DELETE FROM genre WHERE mbid::text LIKE '5e0ce000%';` (después de borrar artistas y álbumes:
>   las semillas referencian el género con `RESTRICT`). Mockea MusicBrainz y Wikidata. Verifica la
>   carga idempotente, el retiro de un género (oculto, conserva semillas), las semillas de artista y
>   de álbum, el QID del álbum desde el browse, la herencia acotada a 3 y Explorar por familia y por
>   género con subgéneros. Desde `show-genres` también crea un usuario `smoke_gen_*` (lo borra al terminar;
>   si se interrumpió: `DELETE FROM app_user WHERE username LIKE 'smoke_gen_%';`) y verifica los
>   géneros de las cabeceras, la página de género, la búsqueda y que la identidad musical se valida
>   contra la taxonomía. Desde `add-genre-votes` crea además cuatro votantes `smoke_gen_<sello>_<n>` (también los
>   borra al terminar; el `ON DELETE CASCADE` limpia sus valoraciones, votos y restricciones; el mismo `LIKE
>   'smoke_gen_%'` los cubre) y verifica los votos de género: elegibilidad, propuesta que reemplaza la herencia, puntaje
>   con principal y secundarios, cifras desde 5 votantes, cuenta desactivada, supervivencia del voto, semilla
>   neutralizada, tope de 8 y suspensión social. Desde `redesign-genre-page` crea además un álbum sintético
>   (`5e0ce000-0000-4000-8000-*7203`, lo cubre el mismo `LIKE` de arriba), listas `… (smoke)` y, de usuarios
>   `smoke_gen_<sello>pg_*`, una reseña, valoraciones y un pendiente (todo cae por `ON DELETE CASCADE` al borrar a los
>   usuarios y los álbumes; el mismo `LIKE 'smoke_gen_%'` los cubre) y el texto de Wikimedia (`genre_localized_text`) de
>   los géneros sintéticos, que cae con ellos. Mockea Wikidata y Wikipedia. El género `smoke-sin-wikidata` se borra dentro
>   del propio script. Verifica cifras con umbral, árbol, filtros y órdenes, listas y reseñas (privacidad, bloqueo,
>   moderación), huella, "Me mueve" (tope, idempotencia, edición concurrente), la cifra de personas a las que les mueve
>   (umbral de 5) y la sincronización del texto "Sobre el género". Necesita la migración `0059` aplicada.
>   Desde `add-genre-artist-discovery` crea además seis artistas `Smoke Descubre …` (MBID `5e0ce000-…-73xx`), sus álbumes
>   (`…-74xx` y `…-7311`) y usuarios `smoke_gen_<sello>ad_*` (seguidores, valoraciones, favoritos, pendientes y escuchas
>   caen por `ON DELETE CASCADE`; el mismo `LIKE 'smoke_gen_%'` los cubre). La sección borra sus artistas y álbumes al
>   terminar para no alterar las siguientes. Mockea el browse de discografía de MusicBrainz de un artista sin explorar.
>   Verifica tamaño y debut solo con la discografía explorada (sin explorar o con 0 discos no es corta), filtros y órdenes,
>   «artista conocido» por cada señal (también por un disco donde colabora), aislamiento entre personas, disco destacado,
>   el riel «Para descubrir» (umbral de 4 y exclusión) y el completado de una discografía sin explorar. Desde la
>   migración `0060` (herencia de géneros materializada, ADR 0028) también compara, sobre todo el catálogo, la vista
>   `release_group_effective_genre` con su definición anterior (diferencia vacía en ambos sentidos) y ejercita los
>   triggers de `credit`, `artist_genre_seed` y `genre.kind`; crea álbumes `…-7501`/`…-7502` y los borra al terminar.
>   Necesita la migración `0060` aplicada.

## Base de datos / migraciones

- Migraciones SQL a mano, numeradas en `/drizzle/`, aplicadas en orden por
  `pnpm run db:migrate` y registradas en `_migrations`. **Nunca editar un `.sql`
  ya aplicado** — un cambio de esquema va en un archivo nuevo.
- **No usar `drizzle-kit generate`** (ver ADR 0005); `drizzle.config.ts` solo
  sirve para `drizzle-kit studio` / introspección puntual.
- Cambiar el esquema = nuevo archivo `NNNN_descripcion.sql` + espejo manual en
  `src/db/schema.ts` (que exporta los tipos `*Row` que usa el resto del
  código) + actualizar `docs/03-data/sql-model.md`.
- Tablas en singular y `snake_case`; PK siempre `UUID` (ADR 0003); `mbid` de
  MusicBrainz como columna única para upsert idempotente; `updated_at` lo
  mantiene un trigger — nunca actualizarlo a mano desde la app.
- Reglas de negocio críticas (coherencia estrellas↔detallada, unicidad de
  rating por usuario/objetivo) viven como `CHECK`/índices únicos parciales en
  SQL, no solo en la capa de aplicación — no relajarlas "para simplificar".

## Arquitectura (resumen)

- Patrón central (`src/services/catalog/`, "cacheo bajo demanda"): consultar
  la base propia primero; solo si falta, pedir a MusicBrainz y cachear el
  resultado. Aplica también a artistas "stub" (`type='unknown'`, créditos de
  feat. no visitados aún).
- `src/services/musicbrainz/client.ts` es el **único** punto de salida a
  MusicBrainz: cola de rate limit (≥1.1s entre requests) y exige
  `MUSICBRAINZ_USER_AGENT` o lanza error. No construir URLs de MusicBrainz en
  otro lugar.
- `src/services/wikimedia/client.ts` es el **único** punto de salida a Wikidata,
  Wikipedia y Commons (perfil de artista, ADR 0021): exige `WIKIMEDIA_USER_AGENT` o
  lanza error, y serializa las requests. Solo se llega a Wikidata desde la relación
  `wikidata` que declara MusicBrainz, nunca buscando por nombre. La foto del artista
  sale solo de Commons con licencia libre verificada, nunca de la miniatura de un
  resumen de Wikipedia.
- `src/services/cover-art.ts` solo genera miniaturas 250px — nunca resolución
  completa (decisión de licencia documentada en `docs/03-data/data-licensing.md`,
  no solo optimización). No construir URLs de carátula a mano en otro lugar.
  `src/services/catalog/cover-mirror.ts` mantiene el espejo propio en el
  storage (ADR 0018), con scripts operativos `scripts/{backfill,revalidate,
  takedown}-cover-mirror.ts` / `scripts/takedown-cover.ts`.
- Todo route handler se envuelve con `src/lib/with-error-handling.ts` →
  respuesta uniforme `{ error, code }` ante excepciones no controladas
  (`docs/04-api/errors.md`).
- En Next 15, `params` de rutas dinámicas es `Promise<{ id: string }>` —
  `await params` obligatorio. Ningún smoke test detecta esto si mockea el
  input a mano; solo `tsc --noEmit`/`next build` lo atrapan (ver
  `docs/02-architecture/code-walkthrough.md`).

## Ramas, worktrees y commits (trabajo en paralelo)

Cuando haya varios agentes trabajando en paralelo:

- Cada agente trabaja en su propio **Git worktree** y en su propia rama creada desde `main`.
- Prefijos de rama: `feature/<slug>`, `fix/<slug>`, `chore/<slug>`, `docs/<slug>`.
- Nunca trabajar simultáneamente en el mismo working tree con otro agente.
- Nunca hacer checkout de otra rama dentro del worktree asignado a otro agente.
- Nunca commitear directamente a `main`.
- Cada agente es responsable únicamente de los cambios y commits que él mismo haya generado.
- Si aparecen cambios sin commitear que no fueron generados por el agente actual, no modificarlos, no commitearlos y no intentar "rescatarlos". Avisar al usuario.
- Solo crear commits o hacer push cuando el usuario lo solicite explícitamente.
- Los mensajes de commit deben estar en inglés y seguir Conventional Commits (`feat:`, `fix:`, `chore:`, `docs:`, `refactor:`, etc.).
- No añadir manualmente trailers de coautoría que atribuyan el trabajo a otro agente, modelo o persona que no haya participado realmente en el commit.
- La identidad Git (`user.name` / `user.email`) debe permanecer configurada con la identidad del usuario.

## Workflow de cambios

- Cambios no triviales se gestionan con OpenSpec: `openspec/` + comandos
  `.opencode/commands/opsx-*` (propose → explore → update → apply → archive).
  Esto planifica el cambio — no sustituye actualizar `/docs`.
- **Toda modificación de código que afecte una regla de negocio
  (`business-rules.md`), el modelo de dominio (`domain-model.md`), un
  contrato de API (`04-api/contracts.md`/`errors.md`) o una decisión de
  arquitectura, debe actualizar ese documento en el mismo cambio, no
  después** — con o sin OpenSpec de por medio.
- Convenciones de nombres/formatos en `docs/02-architecture/conventions.md`;
  decisiones de arquitectura en `docs/02-architecture/adr/` — un ADR nuevo se
  agrega, nunca se reescribe uno existente.
- Si el código y `/docs` contradicen, el código real + el ADR más reciente
  mandan, y la inconsistencia se corrige en la documentación (ver ADR 0006).
- No introducir dependencias nuevas sin justificación explícita en el cambio.

## Antes de dar un cambio por terminado

- [ ] `pnpm run typecheck && pnpm run lint && pnpm run build` pasan.
- [ ] Si se tocó `catalog/` o `musicbrainz/`, se corrieron los smoke tests
      relevantes contra una **BD de scratch** (`DATABASE_URL` distinto +
      `ALLOW_SMOKE_ON_REAL_DB=1`); si se usó la BD real, se **resetearon los
      artistas tocados y se borraron los fixtures** antes de cerrar (ver la
      sección de smoke tests).
- [ ] Si se tocó el esquema, hay un `.sql` nuevo (no editado) + `schema.ts`
      sincronizado.
- [ ] Si se tocó un contrato de `/api/catalog/*`, `docs/04-api/contracts.md` y/o
      `errors.md` quedaron actualizados en el mismo cambio.
- [ ] Si el cambio afecta una regla de negocio, el modelo de dominio, un
      contrato de API o una decisión de arquitectura, el documento
      correspondiente en `/docs` quedó actualizado en el mismo cambio.
