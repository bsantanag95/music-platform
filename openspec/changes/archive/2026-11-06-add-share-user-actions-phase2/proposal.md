## Why

La Fase 1 dejó compartible lo que ya era público. Lo que más gente querría mostrar —"le puse 86 a este disco", "lo escuché
anoche"— todavía no se puede: una valoración no tiene página ni forma de hacerse pública, y una escucha nace privada. Esta
es la segunda fase de `add-share-user-actions` (`docs/05-features/sharing.md` §9) y la que resuelve los principios 2 y 3 de
Compartir: un destino real para quien llega por el enlace, y que nada se vuelva público sin un gesto explícito.

## What Changes

- **Páginas de relación** `/users/<u>/album/<id>` y `/users/<u>/song/<id>`: reúnen lo de una persona con un disco o una
  canción (valoración, escuchas, reseña, favorito, colección) según lo que cada visitante puede ver. Sin nada visible
  responden `404`.
- **Marca de valoración compartida** (tabla nueva `rating_share`, migración `0081`): hace pública una sola valoración, sin
  tope y reversible, con su puntaje detallado si lo tiene. Sobrevive a editar la valoración; borrarla la quita. No cambia
  feed, huella ni afinidad, ni toca `rating.updated_at`.
- **Imágenes de valoración y de escucha**, con metadatos en la página de relación. Una escucha se abre con `?escucha=<id>`,
  que la destaca y da su propia vista previa.
- **Hoja con estados:** lo público se comparte como siempre. Lo que no lo es muestra un aviso y **Hacer pública y
  compartir**, que abre solo esa valoración o escucha. Si el perfil es privado, ese botón no aparece: un anónimo no podría
  abrir el enlace.
- **Imagen privada del dueño:** sin el gesto, el dueño puede descargar su imagen igual, generada con su sesión y sin caché
  pública. Es la primera excepción a "lo compartido se calcula como anónimo".
- **Entradas:** botón Compartir en el panel "Tu relación" de álbum y canción (valoración), con **Dejar de compartir**, y en
  cada fila de `/me/diary` (escucha de un álbum o una canción).
- **API nueva** `GET/POST/DELETE /api/me/share/[kind]/[ref]`. Una cuenta suspendida no puede hacer público nada.
- Medición: tipos `rating` y `listen` en `share_event`; se borran con la cuenta. `rating_share` entra en la exportación de
  datos.

Fuera de esta fase: página de relación de artista y progreso público (`add-discography-lamina`), formato Historia,
ofrecimiento en momentos clave y menús ⋯ (Fase 3).

## Capabilities

### New Capabilities

- `relation-page`: página de lo que una persona tiene con un álbum o una canción, y su visibilidad.
- `rating-sharing`: marca de valoración compartida, sus efectos y su reversión.
- `personal-share-image`: imagen que el dueño descarga sin hacer público el contenido, y el estado que la hoja recibe.

### Modified Capabilities

- `share-images`: imágenes de valoración y escucha.
- `share-sheet`: estados de la hoja y nuevas entradas.
- `share-events`: tipos `rating` y `listen`, y borrado con la cuenta.
- `rating-display`: el puntaje se muestra también en lo compartido y en la página de relación.

## Impact

- **Base de datos:** migración `0081` (tabla `rating_share` y `CHECK` de `share_event`).
- **Código:** `src/services/share/` (objetivos, modo dueño), `src/services/profiles/relation.ts` nuevo, rutas
  `src/app/[locale]/users/[username]/{album,song}/[id]/`, `src/app/api/me/share/`, ruta de imágenes, `ShareSheet`,
  `AlbumRelationPanel`, `SongRelationPanel`, filas del diario, `data-export.ts`, `account-lifecycle.ts`.
- **Dependencias:** ninguna.
- **Docs:** ADR nuevo (imagen privada y marca de valoración), `sharing.md`, `business-rules.md`, `04-api/contracts.md`,
  `04-api/errors.md`, `03-data/sql-model.md`.
