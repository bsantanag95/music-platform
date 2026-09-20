## Context

`physical-collection` (`collection_entry`, `src/services/collection/`) modela solo posesión:
formato **obligatorio** por copia, cero o más atributos de un vocabulario cerrado
(`src/services/collection/vocabulary.ts`), nota opcional, audiencia (`private`/`followers`/
`public`), y permite varias entradas por álbum (grano de copia física real, sin deduplicar).
Vive en tres superficies: acción en la página de álbum (`CollectionAlbumAction.tsx`), la
estantería propia `/me/collection`, y el perfil ajeno en modo lectura.

El pedido es agregar una señal prospectiva ("lo quiero, no lo tengo") que:
- permita declarar **uno o varios** formatos/atributos deseados por álbum (a diferencia de la
  copia real, un deseo no es una única combinación);
- conviva sin bloqueo con la colección ya poseída (no son excluyentes);
- se ofrezca en la página de álbum bajo el mismo punto de entrada que "la tengo" (no dos
  botones), y también como alta rápida desde el menú "···" de `AlbumCard`.

Existe un precedente cercano en el propio código: `want-to-listen` es también una señal
prospectiva ("quiero escuchar esto"), y su spec ya decidió que **no tiene ninguna vista pública
ni de terceros** — es privada del dueño, sin audiencia. Este design sigue ese mismo precedente
para la wishlist en vez de reabrir la matriz de visibilidad de `physical-collection`.

## Goals / Non-Goals

**Goals:**
- Modelo de datos `wanted_entry` que permita cero o más variantes deseadas (formato + atributos)
  por álbum, con formato **opcional** (a diferencia de `collection_entry`): "quiero este álbum,
  en cualquier formato" es una wishlist válida.
- Alta de una o varias variantes en una sola operación desde la página de álbum.
- Alta rápida de una entrada sin formato desde el menú "···" de `AlbumCard`.
- Bifurcación única en `CollectionAlbumAction` ("La tengo" / "La quiero") en vez de un segundo
  botón en la página de álbum.
- Pestaña "Quiero" dentro de `/me/collection`, sin fragmentar en una ruta nueva.
- Convivencia sin bloqueo ni deduplicación cruzada con `collection_entry`.

**Non-Goals (este change):**
- Audiencia / visibilidad social de la wishlist (perfil ajeno, matriz de bloqueo/seguimiento).
  V1 es privada del dueño, igual que `want-to-listen`. Un v2 social es un incremento aditivo
  posterior si el uso lo pide (columna `audience`, análoga a `collection_entry`).
- Los tres modos de visualización (Estantería/Lista/Índice), filtro por formato/atributo,
  agrupación y cambio de audiencia en lote que tiene la pestaña "Tengo". La pestaña "Quiero"
  v1 es una lista simple con búsqueda y orden por recencia/alfabético — ver Decisión 5.
- Mover una entrada de la wishlist a la colección con un click ("ya la conseguí"). Anotado como
  posible incremento futuro; v1 requiere agregarla manualmente desde "La tengo" y, si se quiere,
  quitar la entrada de la wishlist a mano.
- Contador social ("cuántas personas quieren este disco") y notificaciones de disponibilidad:
  fuera de alcance, igual criterio que el contador equivalente ya diferido en
  `physical-collection`.
- Buscador de catálogo embebido en `/me/collection`: el alta sigue siendo solo desde la página
  de álbum (y el menú "···" de `AlbumCard`), mismo criterio que `physical-collection` y
  `list-detail-scope`.

## Decisions

### D1 — Tabla nueva `wanted_entry`, no una columna en `collection_entry`
Alternativa descartada: agregar un flag `wanted: boolean` a `collection_entry` reutilizando la
misma fila. Se descarta porque el grano es distinto — una entrada de colección es una copia
real con formato obligatorio; una entrada de wishlist es una variante deseada con formato
opcional y sin audiencia — forzarlas a la misma tabla exigiría hacer `format` nullable también
para "la tengo" (rompe el requirement existente "Formato de la entrada") o duplicar columnas
condicionalmente. Tabla propia, mismo patrón de `collection_entry` (FK directa a
`release_group`, sin `num_nonnulls`, varias entradas por álbum permitidas):

```sql
wanted_entry (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references app_user(id) on delete cascade,
  release_group_id uuid not null references release_group(id) on delete cascade,
  format text,                          -- NULL = "cualquier formato"
  attributes text[] not null default '{}',
  note text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  check (format is null or format in ('vinyl','cd','cassette','other')),
  check (note is null or length(note) <= 140)
)
```
Índices análogos a `collection_entry`: `(user_id, created_at)`, `(user_id, release_group_id)`,
`(release_group_id)`. Reutiliza el mismo vocabulario cerrado (`EDITION_ATTRIBUTES`,
`COLLECTION_FORMATS`) desde `src/services/collection/vocabulary.ts` — un solo CHECK de
atributos a mantener sincronizado, no uno nuevo por tabla.

### D2 — Formato opcional en la wishlist, obligatorio en la colección
`collection_entry.format` sigue `NOT NULL` (copia real, sin cambios). `wanted_entry.format` es
nullable: representa "cualquier formato me sirve". Esto es lo que permite que el alta rápida
desde `AlbumCard` (un click, sin abrir formulario) cree una entrada válida sin pedir datos, y
que el formulario completo de la página de álbum ofrezca "cualquier formato" como una opción
más junto a variantes específicas.

### D3 — "Una o varias variantes" = una fila por variante, alta en lote
En vez de guardar un array de formatos deseados en una sola fila (complica "vinilo con
atributo X" vs. "CD con atributo Y" como conjuntos independientes), cada variante deseada
(formato + sus propios atributos) es su propia fila de `wanted_entry` — mismo criterio que
"varias entradas por álbum" de `collection_entry`. El alta desde la página de álbum acepta un
lote de 1 a 10 variantes en una sola llamada (transacción), para que elegir "vinilo deluxe" +
"CD remaster" a la vez sea una sola confirmación, no N clics repetidos.

`POST /api/me/collection/wanted`
```json
{ "releaseGroupId": "uuid", "entries": [{ "format": "vinyl", "attributes": ["deluxe-edition"], "note": null }, { "format": null, "attributes": [], "note": null }] }
```
Alta rápida (menú "···"): mismo endpoint con `entries: [{}]` (una variante vacía, formato
`null`, sin atributos) — el `RowMenu` no abre ningún formulario.

### D4 — Sin audiencia; sin lectura en perfil ajeno (v1)
Sigue el precedente de `want-to-listen`, no el de `collection_entry`: la wishlist es privada,
sin columna `audience` y sin endpoint de lectura por `username`. Evita reabrir la matriz de
visibilidad (bloqueos, perfil privado, seguimiento) para una primera versión, y evita también
decidir prematuramente si "quiero este disco" es algo que un usuario quiere presumir en su
perfil — eso puede sumarse después sin migración destructiva (columna nueva con default).

### D5 — Pestaña "Quiero" simple, no la estantería completa
`/me/collection` gana un segmento `?tab=wanted` (mismo patrón que los filtros existentes: solo
aparece en la URL cuando difiere del default `tab=own`), reutilizando el encabezado y el
`Button`/layout de la página, pero **no** los tres modos de visualización, el filtro por
formato/atributo, la agrupación ni el cambio de audiencia en lote — no aplican (sin audiencia,
formato opcional dificulta agrupar/filtrar con el mismo componente). V1: lista simple ordenada
por recencia (default) o alfabético, con búsqueda por texto (`q`, título/artista, igual que la
colección), cada fila con álbum, variante deseada (formato o "cualquier formato" + atributos) y
acción de quitar. Si el uso pide paridad completa con "Tengo" (vistas, filtros, agrupación), es
un incremento posterior aislado, no bloquea este change.

### D6 — Sin bloqueo cruzado entre "la tengo" y "la quiero"
Ninguna validación de servidor impide crear un `wanted_entry` para un álbum que ya tiene
`collection_entry` propias, ni viceversa — señales independientes, mismo principio que ya rige
entre colección/favoritos/diario/listas (`physical-collection`, requirement "Independencia de la
señal de colección"). La UI puede mostrar, sin bloquear, un aviso no intrusivo ("ya la tenés en:
Vinilo") en el formulario de "La quiero" cuando corresponda — detalle de implementación en
tasks, no un requirement nuevo.

### D7 — `CollectionAlbumAction`: bifurcación en vez de segundo botón
El botón único pasa a abrir un selector `role="radiogroup"` de dos opciones ("La tengo" / "La
quiero") antes de mostrar el formulario — mismo mecanismo de conmutador ya usado en el proyecto
para modos de visualización (`want-to-listen`, `physical-collection`). Debajo de cada opción se
listan las entradas propias correspondientes (colección o wishlist) con su acción de quitar, tal
como ya ocurre hoy para "la tengo". El componente pasa a orquestar dos formularios en vez de
uno; el formulario de "la tengo" no cambia de comportamiento.

## Risks / Trade-offs

- **[Riesgo] Confusión de UX entre "cualquier formato" y omitir el campo.** Mitigación: el
  formulario de "La quiero" muestra "Cualquier formato" como opción explícita seleccionable
  (radio), no como un campo vacío ambiguo.
- **[Riesgo] Alta en lote parcialmente inválida (una variante con atributo fuera de
  vocabulario).** Mitigación: transacción atómica — si una variante del lote falla validación,
  no se crea ninguna (mismo criterio que otras operaciones multi-fila del proyecto, p. ej. el
  cambio de audiencia en lote de `collection_entry`, que sí es parcial pero por ids ajenos, no
  por datos inválidos; acá al ser datos inválidos de una sola request, todo o nada es más simple
  y predecible para el usuario).
- **[Riesgo] Tabla nueva casi idéntica a `collection_entry` sugiere duplicación.** Se acepta
  conscientemente (ver D1): el grano y las reglas (formato obligatorio vs. opcional, con/sin
  audiencia) difieren lo suficiente para no forzar una tabla polimórfica; el vocabulario
  compartido (`vocabulary.ts`) es lo único que debía compartirse y ya se comparte.
- **[Riesgo] V1 sin paridad de vistas en "Quiero" puede sentirse inconsistente frente a
  "Tengo".** Aceptado como Non-Goal explícito (D5); es más barato ampliar después que construir
  de más ahora sin uso real que lo confirme.

## Migration Plan

1. Migración Drizzle nueva (`drizzle/00XX_wanted_entry.sql`, análoga a
   `0012_physical_collection.sql`): tabla, CHECKs, índices, trigger de `updated_at`.
2. Servicio `src/services/collection/wanted.ts` (o submódulo `wishlist/`) + esquema Zod en
   `src/lib/api/schemas.ts`.
3. Endpoints `POST/GET /api/me/collection/wanted`, `DELETE /api/me/collection/wanted/[entryId]`.
4. `CollectionAlbumAction.tsx`: bifurcación + segundo formulario (reutiliza
   `CollectionEntryForm` con `format` opcional vía prop).
5. `AlbumCard.tsx`: dos `RowMenuItem` nuevos.
6. `/me/collection`: pestaña "Quiero" (`?tab=wanted`).
7. Mensajes `messages/es/collection.json` y `messages/en/collection.json`.
8. Actualizar `docs/05-features/physical-collection.md` (ya no queda "fuera de alcance") y
   `docs/04-api/contracts.md` / `errors.md` (`WANTED_ENTRY_NOT_FOUND`).

Sin rollback especial: tabla nueva sin FKs entrantes desde otras tablas, se puede revertir con
un `DROP TABLE` si hiciera falta antes de tener datos en producción.

## Open Questions

- ¿La nota libre (140 caracteres) suma valor real a una variante deseada, o es ruido copiado de
  `collection_entry` por simetría? Se incluye en el modelo (D1) porque no cuesta nada extra y
  reutiliza `CollectionEntryForm` tal cual, pero puede quitarse de la UI en tasks si en la
  revisión de diseño visual no aporta.
- ¿El aviso no bloqueante "ya la tenés en: Vinilo" (D6) es necesario en v1, o se puede diferir a
  una iteración de pulido una vez que la wishlist esté en uso? No bloquea el alcance de este
  change; queda a criterio de la implementación en tasks.
