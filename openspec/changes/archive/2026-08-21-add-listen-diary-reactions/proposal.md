# add-listen-diary-reactions

## Why

La Fase 5 (roadmap) define la capa de presencia como el primer bloque de producto social: registrar
que algo sonó sin exigir opinión. Hoy la app no tiene ningún registro de escuchas, y el modelo de
`rating` (una valoración vigente por usuario/objetivo) no sirve como historial: no captura que un
álbum se escuchó varias veces ni cómo cambió la sensación a lo largo del tiempo. Se necesita la
entidad `listen_entry` como diario append-only, con un registro manual de baja fricción.

La decisión de producto reemplaza las estrellas de valoración dentro de `listen_entry` por una
reacción emocional (liked/loved/obsessed/neutral/disliked/ausencia), para no usar la misma gramática
visual de estrellas en dos lugares con significados distintos: `rating` expresa valoración numérica
vigente; `listen_entry` expresa presencia y sensación.

## What Changes

- **Nueva tabla `listen_entry`** (append-only): `user_id`, exactamente uno de
  `artist_id`/`release_group_id`/`recording_id`, `listen_context`
  (`first_listen`/`relisten`/`rediscovery`), `body` opcional (≤500 caracteres), `reaction`
  nullable (`liked`/`loved`/`obsessed`/`neutral`/`disliked`), `audience`
  (`private`/`followers`/`public`), `created_at`. **Sin columna de estrellas.**
- **Reacción emocional** independiente del `rating`: cambiar la reacción de una escucha nunca
  crea ni modifica la valoración vigente del objetivo.
- **API autenticada** para registrar una escucha (`POST`), ampliarla o modificarla (`PATCH`),
  borrarla (`DELETE`, solo propia, físico) y listar el diario propio con paginación.
- **Acción "Marcar como escuchado"** en páginas de artista, álbum y canción, con flujo rápido:
  la entrada se crea al instante y los campos opcionales se completan después.
- **Diario propio** (superficie autenticada) con orden cronológico descendente.
- **Componente de reacciones** localizado y accesible: texto siempre visible + icono opcional;
  distingue `neutral` (elegido) de ausencia de dato (`null`).
- **Documentación actualizada**: todos los documentos que mencionaban estrellas en `listen_entry`
  o en el flujo de presencia pasan a reflejar la reacción emocional.
- La audiencia se almacena desde el inicio para alimentar el futuro feed, aunque en este
  incremento solo se consulte el diario propio.

## Capabilities

### New Capabilities

- `listen-diary`: registro manual de escuchas, reacción emocional, diario propio, audiencia por
  entrada y gestión (crear, ampliar, borrar) de entradas propias.

### Modified Capabilities

<!-- Ninguna capacidad existente cambia de comportamiento a nivel de spec: el modelo de rating,
perfil y seguimiento permanecen intactos. -->

## Impact

- **Base de datos**: nueva migración `0008_listen_entry.sql` (tabla + CHECKs + índices) y espejo
  en `src/db/schema.ts` (nuevo tipo `ListenEntryRow`).
- **Servicios**: nuevo módulo `src/services/diary/` para crear, listar, ampliar y borrar entradas,
  con validación de taxonomía de reacción y de audiencia.
- **API**: endpoints `POST /api/me/diary`, `GET /api/me/diary`, `PATCH /api/me/diary/[id]`,
  `DELETE /api/me/diary/[id]` (bajo el segmento autenticado `/me`, coherente con la base social).
  Schemas Zod nuevos en `src/lib/api/schemas.ts` y `src/lib/api/` clientes.
- **Frontend**: acción contextual en páginas de catálogo (artista/álbum/canción), página de
  diario, componente de reacciones, mensajes i18n es/en.
- **Docs**: `05-features/listening-diary-and-ratings.md`, `05-features/phase-5-design.md`,
  `01-domain/domain-model.md`, `03-data/sql-model.md`, `04-api/contracts.md` y `errors.md`.
- **Tests**: servicio, rutas, schemas, componentes, accesibilidad y locales; smoke test del
  diario contra BD scratch.