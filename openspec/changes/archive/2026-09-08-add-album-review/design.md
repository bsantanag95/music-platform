## Context

### Estado actual del área social

```
rating   (user, target)  — 1 vigente por par, estrellas 0.5–5 + detailed_score, borrado físico
comment  (user, target)  — N por par, body ≤ 5000, borrado físico
favorite / listen_entry  — misma forma de target

TARGET en TODAS: artist_id? · release_group_id? · recording_id?  +  CHECK num_nonnulls = 1
```

- `src/services/social.ts` centraliza `resolveSocialTarget`, `targetValues(target)`,
  `validateRating(stars, detailedScore)` y el upsert idempotente de `rating`
  (`onConflictDoUpdate` sobre el índice único parcial por columna de target).
- Rutas: `/api/catalog/[target]/[id]/comments` (GET/POST) y
  `/api/catalog/comments/[commentId]` (PATCH/DELETE). `[target]` se valida con
  `SocialTargetTypeSchema` (`artist | release-group | recording`).
- Feed (`src/services/feed/feed.ts`): compone en vivo por fuentes (`listen`, `favorite`,
  `list`, `rating`, `comment`); cada fuente proyecta autor + target; se filtra por
  audiencia, visibilidad de perfil y bloqueos; `kind` acota a un tipo. Un `rating` aparece
  una vez por par (refleja el vigente); cada `comment` es su propia entrada.
- No hay spec viva de `rating`/`comment` — `ratings-and-comments` quedó archivada. La
  presentación del feed sí tiene requisito vivo (`activity-feed` → "Jerarquía de
  presentación del feed").

### Restricciones del proyecto

- Migraciones SQL crudas a mano (ADR 0005); `schema.ts` espejo manual.
- Borrado físico para contenido social, sin `deleted_at` (ADR 0009).
- Validación runtime con Zod en todo request; errores vía `ApiError.code`.
- `docs/` y specs se mantienen sincronizados.

## Goals / Non-Goals

**Goals:**

- Un objeto `review` de primera clase, consistente en forma con `rating`/`comment`.
- Acoplamiento obligatorio review→rating sin duplicar la valoración.
- Dejar el esquema listo para reseñas de artista/canción sin migración futura.
- Lectura pública de reseñas y editor propio en la página de álbum.

**Non-Goals:**

- Integración con `activity-feed` (se hace en la Fase 2 de `redefine-content-hierarchy`);
  reseñas de artista/canción visibles; reacciones/comentarios sobre reseñas; reseñas
  destacadas en el perfil; tocar `comment`.

## Decisions

### D1 — Forma de target: 3 FK nullable + CHECK, no polimorfismo

**Decisión.** `review` lleva `artist_id`, `release_group_id`, `recording_id` (todas
nullable, FK con `ON DELETE CASCADE`) y `CHECK (num_nonnulls(...) = 1)`. Idéntico a
`rating`, `comment`, `favorite`, `listen_entry`, `user_list_item`, `user_pinned_item`.

**Por qué.** Es la convención establecida del codebase (6 tablas). Da FKs reales, cascade
real, índices por target reales y reutiliza `resolveSocialTarget` / `targetValues` /
`commentTargetWhere` tal cual. Un `target_type`/`target_id` polimórfico rompería la
integridad referencial y sería el único caso así en todo el modelo.

**Alternativa considerada.** `release_group_id NOT NULL` a secas (solo álbumes). Rechazada:
D4 dice que el producto **no asume** que solo los álbumes se reseñan; con esta forma,
habilitar artista/canción es levantar una validación, no migrar la tabla.

**Alternativa considerada.** `target_type` + `target_id` con whitelist. Rechazada: ver
arriba — inconsistente con el resto y sin FK.

### D2 — Una reseña vigente por (usuario, target), editable

**Decisión.** Índices únicos parciales `uq_review_user_artist`,
`uq_review_user_release_group`, `uq_review_user_recording` (mismo patrón que `rating`).
`POST .../reviews` hace `onConflictDoUpdate` (crear o reemplazar). `PATCH` edita la propia.
`updated_at` con trigger `fn_touch_updated_at`.

**Por qué.** D4/Q5: la reseña es "editable, con fecha de publicación", no una conversación.
Una persona tiene *una* postura crítica sobre una obra, no un hilo. Contrasta con
`comment`, que es N por par.

### D3 — La reseña siempre lleva rating; el `rating` es la única fuente de verdad

**Decisión.** `review` **no** almacena `stars`/`detailed_score`. El flujo:

- `POST/PATCH .../reviews` acepta `{ title?, body, stars?, detailedScore? }` (`title`
  opcional, ver D7).
- Si llegan `stars`, el servicio valida con `validateRating` y hace **upsert de `rating`**
  para ese (usuario, target) — la misma función que ya usa `POST .../ratings`.
- Si no llegan `stars` y **no existe** un `rating` propio para el target → `ApiError`
  `REVIEW_REQUIRES_RATING` (400, localizado).
- El listado de reseñas hace `JOIN` con `rating` y devuelve el rating vigente del autor
  junto a cada reseña.

**Por qué.** `rating` ya tiene su unicidad, sus CHECKs de coherencia estrellas↔score, su
lifecycle y alimenta la huella de gusto y el feed. Duplicar `stars` en `review` invita a
que deriven. La reseña es la *anotación* del rating, no otra copia.

**Trade-off.** El rating mostrado en una reseña vieja refleja el valor **actual**, no el
de cuando se escribió. Aceptable (es como funciona Letterboxd) y evita un snapshot que
envejece mal.

### D4 — Restricción de Fase 1 en validación, no en esquema

**Decisión.** `resolveSocialTarget` sigue aceptando los 3 tipos, pero el servicio de
escritura de reseñas rechaza `artist` y `recording` con `ApiError`
`REVIEW_TARGET_NOT_SUPPORTED` (400, localizado: "las reseñas de artista y canción llegan
más adelante"). El **listado** (`GET`) puede responder normalmente para cualquier target
(devolverá vacío). Una constante `REVIEWABLE_TARGET_TYPES = ["release-group"]` concentra la
regla.

**Por qué.** Separa la decisión de *producto* ("¿cuándo mostramos reseñas de canción?") de
la de *esquema* (ya resuelta). Levantar la restricción luego es editar una constante + i18n
+ UI, sin `ALTER TABLE`.

### D5 — El feed queda fuera de este cambio

**Decisión.** `review` **no** se integra en `activity-feed` en Fase 1. La reseña se ve en
la página de álbum (lectura pública para cualquiera) y, cuando llegue la reorganización de
perfil, como reseña destacada del autor.

**Por qué.** Integrarla bien exige tocar dos requisitos densos de `activity-feed` —
"Alcance del feed v1" (qué contiene) y "Jerarquía de presentación del feed" (cómo se
renderiza una entrada con texto)— y reproducir ~15 escenarios para un tratamiento que la
Fase 2 de `redefine-content-hierarchy` (tiers por intención, D9) va a rehacer de todos
modos: la reseña es la entrada de **Tier 1** por excelencia. Adelantar una versión
provisional "como comentario" es trabajo que se descarta. La Fase 2 la suma con su peso
real.

**Consecuencia aceptada en Fase 1.** Un seguido que publica una reseña no genera una
entrada en el feed de sus seguidores todavía. El descubrimiento de reseñas en Fase 1 es
por la página de álbum.

### D6 — Borrar la reseña no borra el rating

**Decisión.** `DELETE .../reviews/[id]` elimina solo la fila `review`. El `rating` del
usuario para ese álbum queda intacto. Borrar el rating es la acción separada
`DELETE .../ratings`; **se permite aunque exista una reseña**, y la reseña queda entonces
sin estrellas (el listado la muestra con `rating: null`). No se bloquea ni se borra en
cascada la reseña.

**Por qué.** Son dos objetos con lifecycle propio (D3). El caso normal —"me arrepentí de
lo que escribí pero sigo dándole 4 estrellas", o al revés— debe ser barato. Una reseña sin
estrellas es un estado legítimo y poco frecuente; forzar acoplamiento en el borrado
generaría fricción para evitar un caso borde.

### D7 — Título opcional y secundario

**Decisión.** `review.title` es **opcional** (`TEXT` nullable,
`CHECK (title IS NULL OR char_length(title) BETWEEN 1 AND 120)`; el servicio normaliza `""`
a `NULL`). En la presentación, el título **no** es un encabezado: va en la línea de
metadato de la reseña, junto al autor y las estrellas —
`Reseña de @usuario ★★★★½ · «Título»` (patrón Letterboxd) — y solo aparece cuando existe.

**Por qué.** Un título obligatorio pone al usuario a evaluar sus habilidades de titular
antes de escribir (¿creativo? ¿resumen? ¿lo bastante atractivo?), fricción que no aporta
al objetivo del producto: registrar una postura crítica sobre la obra. Opcional y
secundario, los buenos escritores lo aprovechan como valor agregado y el resto publica una
buena reseña sin sentirse medido por el título.

**Alternativa considerada.** Sin título (como Letterboxd puro). Rechazada: hay quien sí
quiere titular y el coste de soportarlo es una columna nullable.

## Risks / Trade-offs

- **[Reseña sin rating tras borrar el rating]** (D6) → Estado permitido y esperado. El
  `GET` de reseñas hace `LEFT JOIN` y devuelve `rating: null`; la UI muestra la reseña sin
  estrellas.

- **[`review` y `comment` se confunden en la UI]** → La página de álbum debe rotular y
  ubicar distinto la sección "Reseñas" (autor + estrellas + título opcional en la línea de
  metadato, cuerpo largo) y "Comentarios" (nota corta, sin título ni rating). Es trabajo
  de copy/layout, no de modelo.

- **[Doble escritura rating+review no atómica]** → `POST .../reviews` con `stars` hace dos
  operaciones (`upsert rating`, `upsert review`). Envolver en una transacción; si falla la
  segunda, revertir la primera. El upsert de `rating` es idempotente, así que un reintento
  es seguro.

- **[Límite de `body`]** → 10 000 caracteres (vs 5 000 de `comment`): una reseña larga es
  legítima.

- **[Reseña invisible para los seguidos en Fase 1]** → Consecuencia aceptada de D5. La
  reseña se descubre por la página de álbum; el feed la incorpora en Fase 2.

## Migration Plan

1. **`drizzle/0017_review.sql`**: `CREATE TABLE review` (3 FK nullable `ON DELETE
   CASCADE`, `user_id` `ON DELETE CASCADE`, `title` (nullable), `body`, `created_at`,
   `updated_at`), CHECKs (`num_nonnulls = 1`, `title IS NULL OR char_length(title) BETWEEN
   1 AND 120`, `char_length(body) BETWEEN 1 AND 10000`), índices únicos parciales por
   target, índices de lectura por target, trigger `trg_review_touch`. Espejo en
   `src/db/schema.ts` + tipo `ReviewRow`.
2. **Servicio**: `listReviews`, `createOrReplaceReview`, `updateReview`, `deleteReview`.
   Reutilizan helpers de `social.ts`. Transacción para la doble escritura.
3. **Zod + API**: schemas nuevos; 2 rutas nuevas espejo de comentarios.
4. **UI**: `Reviews.tsx` + editor; integración en `SocialSection` y página de álbum; i18n.
5. **Docs**: contratos, sql-model.

**Rollback.** Tabla nueva y aditiva; revertir es no montar las rutas/UI y (opcionalmente)
`DROP TABLE review`. Nada de `rating`/`comment` cambia, así que no hay migración inversa
de datos.

## Resolved Questions

- **OQ1 — Borrar el rating de un álbum reseñado** → Se permite; la reseña queda con
  `rating: null`. Ni bloqueo ni cascada. Ver D6.
- **OQ4 — Título** → Opcional y secundario (línea de metadato, patrón Letterboxd), no
  encabezado. Ver D7.

## Open Questions

- **OQ2** — `GET .../reviews`: ¿ordena por `created_at desc` (como `comment`) o expone
  `sort` (recientes / mejor valoradas / más largas)? Fase 1: solo `created_at desc`.
- **OQ3** — ¿La reseña propia se puede marcar con audiencia (`private`/`followers`/
  `public`) como las escuchas y favoritos, o es siempre pública como `rating`/`comment`?
  Fase 1: siempre pública (como `comment`), sujeta a visibilidad de perfil.
