## Context

Fase 5 dejó implementados presencia manual (`listen_entry`), diario, feed, ratings,
comentarios, y las señales curatoriales favoritos (`favorite`) y listas (`user_list` /
`user_list_item`). Falta cubrir el **coleccionismo físico**: qué discos tiene cada persona
en soporte físico y con qué características.

Restricciones y estado relevante:

- El catálogo **no modela formato físico**. `release` es "edición" (original/remaster) y hoy
  se ingiere una sola edición oficial por álbum. MusicBrainz sí tiene `format` por release,
  pero la plataforma no lo expone. Por lo tanto formato y características de cada copia son
  **100% dato del usuario**, no derivados del catálogo.
- Existe el patrón de "objetivo polimórfico único" (`artist_id`/`release_group_id`/
  `recording_id` + `CHECK num_nonnulls(...) = 1`) en `favorite`, `rating`, `comment`,
  `listen_entry`. **La colección no lo necesita**: su objetivo es fijo (solo álbum).
- El modelo de audiencias (`private`/`followers`/`public`) y la matriz de visibilidad
  (bloqueo + perfil privado + relación de seguimiento) ya están centralizados en
  `src/services/social/visibility.ts` (`audiencesForProfile`), usados por favoritos y listas.
- Precedente metodológico: `product_philosophy.md` §6.4 reutilizó listas para "recorrido de
  artista" porque encajaba sin distorsión (una lista ordenada de álbumes, cero columnas
  nuevas). La colección **no** encaja así: necesita `format`, `attributes` y `note` que solo
  aplican a este caso y ensuciarían `user_list_item` (compartido por artista/álbum/canción).

## Goals / Non-Goals

**Goals:**

- Entrada de colección por álbum (`release_group`), con FK directa (sin patrón polimórfico).
- Formato obligatorio de un conjunto cerrado de soportes físicos.
- Atributos de edición de un **vocabulario cerrado y curado** (descriptores, filtrables y
  presentables), más una **nota libre corta** para el detalle irreducible.
- **Múltiples entradas por álbum** (mismo o distinto formato): sin toggle idempotente.
- Audiencia propia por entrada, reutilizando la matriz de visibilidad existente.
- Superficies: acción en la página de álbum, `/me/collection` en formato lista con filtros,
  sección pública en el perfil.
- Contratos REST y `/docs` actualizados en el mismo cambio.

**Non-Goals:**

- **Modelar identidad de release** (sello, país, número de catálogo, barcode, bonus tracks
  estructurados, matching contra MusicBrainz). Es un proyecto de catálogo aparte y contradice
  la decisión de ingerir una sola edición oficial por álbum. La `note` libre cubre ese detalle
  como texto opaco.
- **Aparición en el feed de actividad.** La colección se presume vía perfil y página de álbum
  en v1. Agregar `collection_entry` como fuente del feed (unión, visibilidad, desempate,
  tests) es incremento posterior si el uso lo pide. No se modifica `activity-feed`.
- Imágenes de portada por entrada (upload de usuario, Cover Art Archive). V1 usa la portada
  del `release_group` que ya se resuelve. Future consideration.
- Vocabulario de atributos abierto/folksonomía. Se descarta por inconsistencia
  (`colored vinyl` vs `coloured vinyl`) y por debilitar la agregación para "presumir".
- Racha, contadores de completitud o cualquier mecánica de juego sobre la colección.
- Colección sobre artista o canción: el objetivo es fijo (álbum).

## Decisions

### D1. Entidad dedicada `collection_entry`, no reutilizar Listas

Tabla nueva con **FK directa a `release_group_id` NOT NULL**, sin las tres FKs nullable ni el
`CHECK num_nonnulls`. Se sigue el precedente de 6.4 en su *principio* ("no crear entidad
nueva cuando el mecanismo existente encaja sin distorsión"), que aquí apunta a una tabla
dedicada: `user_list_item` es genérico y no tiene lugar natural para `format`/`attributes`/
`note`. Semánticamente la colección es un *estado por álbum con audiencia* (como `favorite`,
botón en cada álbum), no una lista curada con orden manual.

```
collection_entry(
  id              uuid pk default gen_random_uuid(),
  user_id         uuid not null references app_user(id) on delete cascade,
  release_group_id uuid not null references release_group(id) on delete cascade,
  format          text not null,               -- CHECK IN ('vinyl','cd','cassette','other')
  attributes      text[] not null default '{}',-- CHECK attributes <@ ARRAY[<vocabulario>]::text[]
  note            text,                         -- CHECK note IS NULL OR length(note) <= 140
  audience        text not null default 'followers', -- CHECK IN ('private','followers','public')
  created_at      timestamptz not null default now(),
  updated_at      timestamptz not null default now()  -- trigger, nunca desde la app
)
```

Índices:

- `idx_collection_entry_user_created` on `(user_id, created_at desc)` — lista propia paginada.
- `idx_collection_entry_user_release_group` on `(user_id, release_group_id)` — copias del
  usuario para la página de álbum.
- `idx_collection_entry_release_group` on `(release_group_id)` — colección pública por álbum
  (uso futuro / limpieza por `on delete cascade`).
- `idx_collection_entry_attributes` GIN on `attributes` — filtro por atributo.

**Alternativas descartadas:**

- **Lista `user_list` pre-creada mono-tipo álbum** (patrón 6.4 literal): obliga a colear
  `format` en `user_list_item` (contamina artista/canción y toda otra lista) o a una
  side-table sobre `user_list_item.id` (tabla dedicada igual + acoplamiento a la maquinaria
  de listas). No se usa orden manual —el valor de `user_list` no aplica.
- **Patrón polimórfico `num_nonnulls`**: innecesario, el objetivo es fijo. Añadiría un CHECK
  y ramificación de enrutado sin beneficio.

### D2. Grano por álbum + copia: múltiples entradas, sin unicidad

No hay `UNIQUE(user_id, release_group_id, format)`. El caso "tengo el vinilo y el CD" y "dos
CDs con portada distinta" es el canónico del coleccionismo. Cada entrada es agregable y
quitable por separado, con su propio `created_at`, `attributes` y `note`.

- `POST /api/me/collection` **siempre crea** una entrada; devuelve `201` con la entrada.
- `DELETE /api/me/collection/[entryId]` borra por id; `404` `COLLECTION_ENTRY_NOT_FOUND` si
  no existe o no es del usuario (no se revela existencia ajena, mismo criterio que
  `listen_entry` y `favorite`).
- `PATCH /api/me/collection/[entryId]` edita `format`/`attributes`/`note`/`audience`.

**Alternativa descartada:** un registro por álbum con `format` único o `text[]` de formatos.
Un array no lleva metadata por formato y convierte "agregá solo el CD" en un
read-modify-write de toda la fila (concurrencia, pérdida de historia). El toggle simple se
sacrifica a propósito: en la práctica el picker de formato es una fricción mínima y más
expresiva.

### D3. Atributos: vocabulario cerrado como `text[]` con CHECK, no tabla hija

`attributes text[]` con `CHECK (attributes <@ ARRAY[...]::text[])` y GIN index. El vocabulario
inicial (a congelar en la migración y en `physical-collection.md`):

| Grupo | Valores |
|---|---|
| Edición | `limited-edition`, `numbered`, `first-press`, `reissue`, `remaster`, `anniversary-edition`, `deluxe-edition` |
| Soporte / prensado | `colored-vinyl`, `picture-disc`, `180g`, `gatefold`, `box-set` |
| Región | `regional-edition` |
| Contenido | `bonus-tracks`, `extra-disc` |
| Otro | `signed`, `promo` |

El servicio deduplica y ordena el array antes de persistir. Los atributos son **descriptores**
(el usuario levanta la mano sobre una cualidad), no *identity claims* de catálogo —por eso no
disparan el "¿por qué no hay campo de país?".

**Alternativas descartadas:**

- **Tabla hija `collection_entry_attribute`**: normalización innecesaria para un set cerrado
  de ~17 valores sin atributos propios; complica lecturas y el contrato. El proyecto ya usa
  arrays de Postgres donde encaja.
- **Campos nombrados de catálogo** (`label`, `country`, `catalog_number`): ilimitados, modelan
  identidad, arrastran a Non-Goal (modelar release).
- **Folksonomía libre**: sin consistencia para filtrar ni agregar en el perfil.

### D4. Audiencia y visibilidad: reutilizar `audiencesForProfile`

Cada entrada tiene `audience` (default `followers`, coherente con `favorite` y `listen_entry`;
el usuario puede cambiarla tras publicar). Las lecturas ajenas (`GET /api/users/[username]/
collection`) filtran con `audiencesForProfile` de `src/services/social/visibility.ts` —el
mismo helper que favoritos y listas. Sin permiso → lista vacía, sin revelar si hay colección.
`username` inexistente → `404` `USER_NOT_FOUND`.

**Alternativa descartada:** audiencia por colección entera (un solo switch). Menos flexible y
divergente del modelo "audiencia por actividad" ya establecido.

### D5. API bajo `/api/me/collection`, servicio en `src/services/collection/`

- `POST /api/me/collection` — crea. Body Zod: `{ releaseGroupId: uuid, format: enum,
  attributes?: enum[], note?: string(<=140), audience?: enum }`. `404` `ALBUM_NOT_FOUND` si el
  `release_group` no existe.
- `GET /api/me/collection` — lista propia, `created_at DESC` + desempate `id DESC`, offset
  paginado (mismo patrón que `/api/me/diary`), query opcional `format` y `attribute`.
- `PATCH /api/me/collection/[entryId]` — edición parcial.
- `DELETE /api/me/collection/[entryId]` — `204`.
- `GET /api/users/[username]/collection` — pública, paginada, filtrada por visibilidad,
  query opcional `format` y `attribute`.
- La página de álbum (Server Component) carga las entradas propias del usuario para ese
  `release_group` en el fetch inicial; la acción de agregar/quitar usa TanStack Query en el
  Client Component de la acción, vía `src/lib/api/client.ts` y validación Zod de la respuesta.

Todo con `with-error-handling` y `await params` (Next 15), igual que `src/app/api/me/diary/route.ts`.

**Alternativa descartada:** meter la colección bajo `/api/me/lists` como sub-tipo — mezcla dos
conceptos y complica el contrato de listas (D1).

### D6. Nuevo código de error `COLLECTION_ENTRY_NOT_FOUND`

`404`, "la entrada de colección no existe o no pertenece al usuario autenticado". Se agrega a
`docs/04-api/errors.md` y al catálogo de mensajes, siguiendo el patrón de `FAVORITE_NOT_FOUND`
/ `LISTEN_ENTRY_NOT_FOUND`. Se reutiliza `ALBUM_NOT_FOUND`, `AUTH_REQUIRED`, `USER_NOT_FOUND`
y `VALIDATION_ERROR` existentes.

### D7. `updated_at` por trigger

`collection_entry.updated_at` lo mantiene un trigger `trg_collection_entry_updated_at`
(regla del proyecto: nunca actualizar `updated_at` desde la app), mismo criterio que
`user_list`.

## Risks / Trade-offs

- **[Vocabulario de atributos incompleto en v1]** → El `CHECK` obliga a una migración nueva
  para ampliarlo. Mitigación: el set inicial se diseña con cobertura amplia; ampliarlo es una
  migración `ALTER ... DROP/ADD CONSTRAINT` de bajo riesgo, y la `note` libre absorbe la cola
  larga mientras tanto.
- **[Sin toggle idempotente → doble submit crea duplicados]** → Aceptado: dos copias iguales
  es un estado válido para un coleccionista. La UI desactiva el botón durante el envío y
  ofrece quitar la entrada recién creada.
- **[Filtro por `attribute` sin combinación booleana]** → v1 filtra por un solo atributo
  (contención simple sobre el GIN index). Filtros AND/OR de varios atributos quedan para
  después si el uso lo pide.
- **[La colección no aparece en el feed]** → Reduce visibilidad social de la señal en v1.
  Aceptado a cambio de un cambio acotado; el perfil y la página de álbum son suficientes para
  "presumir". El feed es incremento aditivo (nueva fuente en la unión) sin migración.
- **[`note` de texto libre puede acumular datos sensibles o largos]** → Límite duro de 140
  caracteres en Zod y en `CHECK`; se clasifica en `data-classification.md` como contenido de
  usuario visible según audiencia, igual que la descripción de una lista.

## Migration Plan

1. Migración `drizzle/0012_physical_collection.sql` (siguiente a `0011_...`), aplicada con
   `pnpm run db:migrate`. Crea `collection_entry`, sus índices, el `CHECK` de vocabulario y el
   trigger de `updated_at`. Nunca se edita una migración aplicada.
2. Espejo manual en `src/db/schema.ts` (`collectionEntry` + `CollectionEntryRow`) y
   actualización de `docs/03-data/sql-model.md` en el mismo commit.
3. Servicio `src/services/collection/` (`collection.ts`, `types.ts`, `vocabulary.ts`,
   `collection.test.ts`) reutilizando `audiencesForProfile` y `blocking`.
4. Endpoints, luego UI (acción en álbum, `/me/collection`, sección de perfil), luego i18n.
5. Docs: `errors.md` (+ catálogo de mensajes), `contracts.md`, `domain-model.md`,
   `data-classification.md`, `physical-collection.md` + `05-features/README.md`, `roadmap.md`,
   `product_philosophy.md` §6.6.
6. Rollback: no se contempla rollback de migraciones (política del proyecto); los fixes van
   hacia adelante.

## Open Questions

- **Nombre de la superficie de usuario**: "Colección" (es) / "Collection" (en). Se asume este
  salvo objeción; se fija en `i18n-messages` al implementar.
- **Orden de la colección propia**: v1 es `created_at DESC`. Ordenar por artista/título o por
  año de edición se puede sumar como opción de la UI sin cambio de esquema.
- **Contador en el perfil**: mostrar "N discos en la colección" junto a la sección — se decide
  al maquetar el perfil (§6.5), no bloquea el esquema.
