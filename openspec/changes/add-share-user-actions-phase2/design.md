## Context

Segunda fase de `add-share-user-actions`. Decisiones tomadas al abrirla (2026-11-05 y 2026-11-06): D15 (marca por
valoración), D5 (descarga privada del dueño), puntaje visible al compartir, entradas en panel y diario, y la marca sobrevive
a editar.

Estado de partida:

- `rating` no tiene audiencia. La ven el dueño y sus seguidores, salvo destacadas y la que acompaña a una reseña.
- `rating_highlight` es el precedente: tabla aparte, para no tocar `rating.updated_at`, y públicas por decisión del dueño, con
  `86/100` (`define-detailed-score`, D7).
- `listen_entry.audience` ya se cambia con `PATCH /api/me/diary/<id>`. Una entrada destacada se ve más allá de su audiencia,
  pero nunca sin acceso al perfil.
- `audiencesForProfile` devuelve `[]` a un anónimo en un perfil privado: ahí ningún gesto hace visible el enlace.
- Suspensión social: no se puede ampliar una audiencia ni compartir entradas del diario (`requireSocialActivityAllowed`).
- No hay zona horaria guardada por usuario: la del diario llega del navegador de quien mira.

## Goals / Non-Goals

**Goals:**

- Un destino público para lo de una persona con un disco.
- Hacer pública una sola cosa con un gesto explícito y reversible.
- Que el dueño pueda llevarse su imagen sin publicar nada.

**Non-Goals:**

- Audiencia real en `rating`, relación con artistas, valoraciones de artista.
- Formato Historia, toasts, menús ⋯ (Fase 3).
- Llamado "Arma la tuya" (bloque B): la página solo enlaza al álbum o la canción.

## Decisions

### 1. `rating_share`, como `rating_highlight`

`rating_share(user_id, rating_id, shared_at)`, PK compuesta, `ON DELETE CASCADE` en ambas. Sin tope. Una fila = pública.

- **Por qué tabla y no columna:** la columna dispararía `trg_rating_touch` y movería `updated_at`, que ordena el feed y Mis
  valoraciones.
- **Alternativa:** `audience` en `rating` (descartada en D15: obliga a revisar feed, huella, afinidad y exportación).
- Una valoración destacada cuenta como pública: el objetivo y la página aceptan cualquiera de las dos marcas.

Solo cambia lo que ve un anónimo en la página de relación y en la imagen. Feed, huella, afinidad y agregados siguen igual.

### 2. Dos tipos nuevos, una sola página

`rating` (ref: id de la valoración) y `listen` (ref: id de la entrada). Solo álbum y canción: una valoración o escucha de
artista no tiene objetivo, porque no hay página de relación de artista.

`canonicalPath` de `rating` es `/users/<u>/album/<segmento>`; el de `listen` agrega `?escucha=<id>`. `generateMetadata` de la
página puede leer `searchParams` (es una página, no un layout): con `?escucha=` válida anuncia esa escucha; sin ella, la
valoración si es pública, y si no, la escucha pública más reciente. Sin ninguna, metadatos genéricos.

### 3. Imagen

`ShareCard` suma `detailedScore`. `AuthorNote` pasa `{ stars, detailedScore }` a `scaleScore`, que ya decide número o
estrellas. La reseña no lo llena, así que sigue mostrando solo estrellas.

- **Valoración:** carátula, título, artista, nota grande y `@usuario`.
- **Escucha:** carátula, título, artista, mes y año, reacción, y la impresión como cita si tiene texto. Mes y año, no día: la
  imagen es la misma para todos y no hay zona horaria guardada del autor; el día podría salir corrido.

### 4. Modo dueño en los cargadores, no objetivos duplicados

`loadRatingTarget(id, locale, { owner })` y `loadListenTarget`. Sin `owner` aplican visibilidad anónima; con `owner` exigen
que la fila sea suya y saltean marca y audiencia. El armado del `ShareCard` es el mismo, así la imagen privada no diverge.

### 5. Imagen privada

`GET /api/share/image/rating/<id>?personal=1`:

- Exige sesión; si no es el dueño responde la imagen genérica.
- `Cache-Control: private, no-store`, y sin `v`: nunca entra al CDN.
- No se anuncia en metadatos: solo la pide la hoja.

Es la excepción a "se calcula siempre como anónimo", y se registra en un ADR nuevo junto con `rating_share`.

La imagen **pública** de `rating` y `listen` tampoco usa la caché inmutable, aunque la versión coincida: la versión depende del
contenido, no de que siga público, y un CDN seguiría sirviendo la imagen después de **Dejar de compartir**. Va con la caché corta.

### 6. `/api/me/share/[kind]/[ref]`

Una sola puerta para la hoja, con `kind` `rating` o `listen`:

- `GET` → `{ state, payload }`. `state`: `public`, `needs_gesture` o `private_profile`. El `payload` usa la imagen anónima
  versionada si es `public`, y la personal si no.
- `POST` → hace público: inserta `rating_share` o pone `audience = 'public'`, con `requireSocialActivityAllowed`. Responde
  igual que `GET`. `PROFILE_PRIVATE` (409) en un perfil privado. Idempotente.
- `DELETE` → solo `rating`: quita la marca. Una escucha se cierra desde su audiencia, como siempre.

La hoja pide el estado al abrirse: el panel no paga una consulta por página, y el servidor decide qué es público.

### 7. Hoja con estados

`ShareButton` acepta `payload` o `load: () => Promise<ShareState>`. Con `needs_gesture` la hoja muestra aviso, **Hacer pública
y compartir** y Descargar imagen, sin copiar ni atajos. Tras el `POST` pasa al estado normal sin cerrarse. Con
`private_profile`, aviso y descarga. El aviso de una escucha con texto dice que la impresión también se verá.

No se abre sobre otro diálogo: el panel y las filas del diario son contenido de página.

### 8. Página de relación

`src/services/profiles/relation.ts`: `getRelationView(username, target, viewerId)` lee con `getProfileByUsername` y
`audiencesForProfile`.

- **Valoración:** visible para dueño, seguidores aceptados, o con marca o destacada. Con número, como en el feed.
- **Escuchas:** por audiencia o destacadas; hasta 20, de la más reciente a la más antigua.
- **Reseña:** si existe y está visible, con enlace a `/review/<id>`.
- **Favorito y colección:** por su audiencia.
- Devuelve `null` si no hay nada visible → `404`. Perfil privado sin acceso: `404`.

Se acepta cualquier segmento con id válido sin redirigir: los metadatos anuncian el canónico.

## Risks / Trade-offs

- **[Una nota editada cambia lo publicado]** → es lo elegido: el enlace sigue vivo con la nota vigente, y **Dejar de compartir**
  está en la hoja (en el panel costaría una consulta por página). El aviso lo dice.
- **[Hacer pública una escucha expone su impresión]** → aviso explícito antes del gesto.
- **[Perfil que pasa a privado]** → la marca queda, pero un anónimo deja de ver todo: `audiencesForProfile` manda.
- **[Imagen privada generada a pedido]** → sin caché, con el mismo límite de 60 por minuto por IP.
- **[Páginas sin contenido]** → `404`, igual que el resto de lo no autorizado: no revela si hay contenido.

## Migration Plan

`0081` en scratch durante el cambio. En la BD real va después de `0079` y `0080`.

## Open Questions

Ninguna.
