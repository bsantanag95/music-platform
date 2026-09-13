## Why

Hoy no existe forma de organizar la propia escucha de la discografía de un artista más allá
de favoritos sueltos o una lista manual genérica. Para discografías grandes (Deep Purple,
Bowie, Miles Davis) eso deja al usuario sin ningún lugar donde declarar, a su propio criterio,
qué álbumes le interesan de ese artista y hacer seguimiento de cuáles ya escuchó — sin que la
plataforma le imponga una definición externa de "discografía completa" ni lo presione con
mensajes de tareas pendientes. La decisión de producto ya está resuelta y documentada en
`docs/00-product/product_philosophy.md` §6.4 ("Recorrido de artista", 2026-08-20, extendida
2026-09-13): selección 100% definida por el usuario, default de baja fricción (álbumes de
estudio pre-marcados), sin comparación social ni agregado comunitario. Este proyecto lleva esa
decisión a un change implementable.

## Goals

- Permitir a un usuario autenticado armar, por artista, una selección personal de álbumes que
  constituye su propia definición de "recorrido completo" para ese artista.
- Dar un default de baja fricción (álbumes de estudio pre-marcados) editable libremente en
  cualquier dirección, sin curaduría editorial.
- Reflejar el progreso del usuario contra su propia selección de forma informativa y discreta,
  únicamente dentro de la página de gestión del recorrido.
- Sostener tres estados —**en curso**, **completo**, **archivado**— sin un cuarto estado de
  "pendiente" en ningún punto de la UI.
- Mostrar el recorrido en el perfil únicamente como faceta integrada sobre los artistas ya
  visibles en la sección "Exploración" (artistas seguidos) — nunca como sección, pared o
  conteo agregado de "completados".

## Non-Goals

- Curaduría editorial de "discos esenciales fuera de estudio" (se descarta explícitamente en
  §6.4).
- Cualquier agregado o ranking comunitario de recorridos entre usuarios, en ninguna fase futura
  (decisión cerrada en §6.4.3, no diferida).
- Fusionar o sincronizar automáticamente con Want to Listen — quedan señales independientes
  (§6.4.2).
- Recorridos sobre canciones (recording) o sobre más de un artista a la vez.
- Notificar o resaltar automáticamente cuando un artista edita un álbum nuevo de estudio; la
  incorporación de lanzamientos nuevos a una selección existente es manual (fuera de alcance de
  este change; documentar como pregunta abierta).

## What Changes

- Nueva capacidad **Recorrido de artista**: un usuario autenticado activa, por artista, un
  recorrido que agrupa todos los álbumes del artista por tipo de MusicBrainz
  (`primary-type`/`secondary-type`: Estudio, En Vivo, EP, Compilación, etc.), con los álbumes
  de tipo Estudio pre-marcados y el resto desmarcado.
- El usuario **edita la selección libremente** en cualquier dirección (agregar o quitar
  cualquier álbum de cualquier tipo) en cualquier momento.
- **Tres estados** por recorrido: `in_progress` (en curso), `complete` (100% de la selección
  propia escuchada según el diario), `archived` (el usuario deja de perseguirlo activamente sin
  perder la selección ni el progreso; acción manual y reversible). Ningún estado "pendiente".
- **Modelo de datos**: se reutiliza `user_list`/`user_list_item` (mismo mecanismo que `lists`),
  agregando un subtipo `kind = 'artist_journey'` con columnas propias (artista objetivo,
  estado). No es una entidad nueva independiente; un recorrido nunca aparece en las superficies
  genéricas de listas (`/me/lists`, Descubrir, etc.) ni cuenta para sus conteos.
- **Progreso**: calculado contra el diario de escucha (`listen-diary`) del propio usuario sobre
  los ítems seleccionados, mostrado solo dentro de la página de gestión del recorrido, sin
  fracciones ni alertas en ningún otro lugar de la UI.
- **Acción en la página de artista**: activar/gestionar el recorrido propio, con estados de
  carga, éxito, error y sesión requerida.
- **Facet en el perfil**: cada artista de la sección "Exploración" (artistas seguidos) que
  además tenga un recorrido propio no archivado muestra un indicador discreto de estado (en
  curso / completo). Un recorrido sobre un artista que el usuario no sigue no aparece en el
  perfil — solo es gestionable desde la página del artista. Sin conteo agregado en ningún punto
  del perfil.
- Sin superficie pública ni de terceros para los recorridos de otro usuario más allá de esa
  faceta (misma postura que Want to Listen: gestión 100% propia).

## Capabilities

### New Capabilities
- `artist-journey`: selección personal por artista de álbumes que definen el "recorrido
  completo" del usuario para ese artista, con default por tipo MusicBrainz, edición libre,
  tres estados (en curso / completo / archivado), progreso propio no comparativo, y sin
  agregado ni ranking comunitario en ninguna fase.

### Modified Capabilities
- `artist-following`: la sección "Exploración" del perfil (`docs/05-features/user-profile.md`,
  spec `artist-following` §"Sección Exploración del perfil") gana un indicador de estado de
  recorrido, opcional, por cada artista seguido que también tenga un recorrido propio no
  archivado. No cambia la mecánica de seguir/dejar de seguir ni el resto de la sección.

## Impact

- **Esquema de datos**: extiende `user_list` (no tabla nueva) con `kind` (`text`, default
  `'standard'`, `CHECK IN ('standard', 'artist_journey')`), `journeyArtistId` (`uuid`, FK a
  `artist`, `ON DELETE CASCADE`, nullable) y `journeyStatus` (`text`, nullable, `CHECK IN
  ('in_progress', 'complete', 'archived')` cuando `kind = 'artist_journey'`), más un índice
  único parcial `(owner_id, journey_artist_id) WHERE kind = 'artist_journey'` — un recorrido
  por usuario y artista. Migración SQL + espejo en `src/db/schema.ts`, siguiendo el mismo
  patrón que las columnas editoriales ya agregadas a `user_list`.
- **API**: nuevos endpoints bajo `src/app/api/me/artist-journeys/` (crear/activar por artista,
  editar selección de ítems, cambiar estado archivado/en curso, leer detalle con progreso) y
  esquemas Zod nuevos en `src/lib/api/schemas.ts`. Lectura del progreso cruza contra
  `listen_entry` del propio usuario, sin tabla materializada (mismo patrón que "En rotación").
- **UI**: nuevo componente de acción "Recorrido" en la página de artista; nueva vista de
  gestión (agrupada por tipo, con progreso discreto); indicador de estado agregado a las
  tarjetas de artista de la sección "Exploración" del perfil.
- **Servicios**: nuevo módulo de servicio (`src/services/artist-journeys/`), reutilizando
  utilidades de lectura de release-groups por tipo ya existentes en el catálogo.
- **Sin impacto** en `lists` (las superficies y requisitos genéricos de listas no cambian: un
  recorrido se excluye explícitamente de sus lecturas por `kind`), `favorites` ni
  `want-to-listen` (señales independientes, sin sincronización).
- **Documentación**: cierra la implementación de `docs/00-product/product_philosophy.md` §6.4;
  agrega entrada nueva en `docs/05-features/` al completarse.
