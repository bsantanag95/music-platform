## 1. Servicio de feed

- [x] 1.1 En `src/services/feed/feed.ts`, agregar los tipos `FeedRating` y `FeedComment` al
      union `FeedEntry` (ver forma exacta en `design.md`).
- [x] 1.2 Agregar las queries de `rating` y `comment` a la unión bajo demanda: mismo join a
      `artist`/`releaseGroup`/`recording`/`appUser`, filtro por `inArray(userId, followedIds)`
      y `BLOCKED_SQL`, sin filtro por `audience` (no existe la columna). Nota de
      implementación: `followedIds` ya solo contiene relaciones `accepted`, y
      `audiencesForProfile` siempre incluye `"public"` para relación `following` — por lo
      tanto pertenecer a `followedIds` + no bloqueo ya equivale a "visible como public
      implícita", sin necesidad de una llamada runtime adicional a `audiencesForProfile`.
- [x] 1.3 Ordenar `rating` por `updatedAt` (fecha de la valoración vigente) y `comment` por
      `createdAt`, con el mismo desempate por id que las demás fuentes.
- [x] 1.4 Mapear las filas de `rating`/`comment` a `FeedRating`/`FeedComment` reusando el
      helper `author(...)` existente.
- [x] 1.5 Incluir las dos fuentes nuevas en el `merged = [...].sort(...).slice(...)` y en el
      `Promise.all` de queries.

## 2. Contrato de API y cliente

- [x] 2.1 En `src/lib/api/schemas.ts`, agregar `FeedRatingSchema` y `FeedCommentSchema`
      (mismo patrón que `FeedFavoriteSchema`) y sumarlas al `discriminatedUnion` de
      `FeedEntrySchema`.
- [x] 2.2 Confirmar que `GET /api/me/feed` (`src/app/api/me/feed/route.ts`) no necesita
      cambios más allá del tipo de retorno (la ruta ya delega en `listFeed`).

## 3. UI del feed

- [x] 3.1 En `src/components/feed/FeedList.tsx`, agregar el render de `entry.kind ===
      "rating"` (estrellas + enlace al objetivo) y `entry.kind === "comment"` (extracto del
      `body` + enlace al objetivo) dentro de `FeedBody`.
- [x] 3.2 Agregar las claves necesarias (`ratingLabel`, `commentLabel`, etc.) a
      `messages/es/feed.json` y `messages/en/feed.json`.

## 4. Specs y documentación

- [x] 4.1 Validar el delta spec con `openspec validate --change add-ratings-comments-feed
      --strict` antes de implementar.
- [x] 4.2 Actualizar `docs/05-features/activity-feed.md`: mover ratings/comentarios de
      "Pendiente para v2+" a la sección de alcance implementado, documentando la regla de
      audiencia `public` implícita.
- [x] 4.3 Actualizar `docs/00-product/roadmap.md` (Fase 5): dejar registrado que el feed
      ahora cubre las cinco fuentes; el scrobbling automático sigue pendiente para cerrar la
      fase.

## 5. Pruebas

- [x] 5.1 En `src/services/feed/feed.test.ts`, agregar casos: rating vigente aparece una
      sola vez tras un cambio de valoración; varios comentarios del mismo usuario/objetivo
      generan varias entradas; orden cronológico mezclado entre las cinco fuentes. La
      visibilidad por perfil privado/bloqueo no se testea por separado para rating/comment:
      reutilizan literalmente `inArray(userId, followedIds)` (ya cubierto por el caso "vacío
      sin seguidos", que aplica a las cinco fuentes por igual) y la misma constante
      `BLOCKED_SQL` que ya usan escuchas/favoritos/listas — no hay lógica nueva que verificar
      a nivel de mock de query.
- [x] 5.2 En `src/app/api/me/feed/route.test.ts`, agregar un caso que confirme que la
      respuesta incluye entradas `kind: "rating"` y `kind: "comment"` con la forma esperada.
- [x] 5.3 Correr `npm run typecheck`, `npm run lint`, `npm test` y `npm run build` antes de
      dar la tarea por terminada.
