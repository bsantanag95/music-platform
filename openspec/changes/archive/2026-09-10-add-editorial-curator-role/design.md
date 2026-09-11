## Context

La autorización de plataforma se expresa con permisos derivados de roles
(`src/services/auth/permissions.ts`) y se comprueba en backend
(`src/services/auth/authorization.ts`). Hoy existen dos roles acumulables, `moderator` y `admin`, y
un único permiso editorial, `editorial.publish`. La publicación oficial vive en
`src/services/lists/editorial.ts` y en `src/app/api/admin/editorial/*`, y solo opera sobre listas de
la cuenta curadora `@exploracion` (`CURATOR_USERNAME`), que no puede iniciar sesión.

Esa restricción de propiedad y el hecho de que solo `admin` tenga el permiso hacen que **crear**
contenido editorial y **publicarlo** sean la misma capacidad. Para producción hace falta que varias
personas mantengan listas sin ser administradores y sin asumir la autoridad de publicar como la
plataforma. ADR 0012 dejó explícito que no se introduciría un rol editorial separado "hasta que
exista una necesidad operativa real": este cambio la formaliza.

## Goals / Non-Goals

**Goals:**
- Introducir el rol acumulable `editorial_curator` y separar la autoría editorial de la publicación.
- Permitir que curadores creen, editen y propongan listas editoriales bajo la identidad
  `@exploracion`, con autoría auditada.
- Mantener publicación y retirada exclusivas de `admin` (`editorial.publish`).
- Conservar la identidad pública `@exploracion` y la regla de que solo sus listas pueden ser oficiales.

**Non-Goals:**
- Listas generadas automáticamente por el sistema o algoritmos.
- Panel web para asignar/revocar roles (sigue siendo operación interna).
- Convertir listas personales de terceros en oficiales.
- Edición del catálogo de MusicBrainz.

## Decisions

### 1. Dos bundles de permiso, no cinco

Se agrega `editorial_curator` a `PlatformRole` y se reemplaza el permiso único por exactamente dos:

- `editorial.author` — crear, editar y proponer.
- `editorial.publish` — publicar y retirar.

`editorial_curator` recibe solo `editorial.author`; `admin` recibe ambos (además de moderación y
`platform.manage_roles`). `moderator` no cambia.

**Rationale:** ADR 0012 establece un principio de no-sobre-ingeniería. Ningún rol necesita
`create` sin `edit`/`submit`, ni `publish` sin `withdraw`; los permisos son literales de un union de
TypeScript (`Permission`), así que dividirlos más adelante es un cambio de código + tests, **sin
migración**. Dos bundles reflejan la única necesidad operativa real (curador no publica) y evitan
mantener permisos que ningún rol usa por separado.

**Nombre del rol:** se elige `editorial_curator`, no `curator`, para no chocar con el vocabulario de
la cuenta curadora que ya existe en el código (`CURATOR_USERNAME`, `curatorListCondition()`,
`curatorOwnerIds()`, "cuenta curadora"). Reservar `curator*` para la identidad-cuenta evita que
`role === "curator"` y `curatorListCondition()` signifiquen cosas distintas para quien lee la
autorización por primera vez. La distinción queda documentada en `docs/02-architecture/auth.md`.

**Alternativas descartadas:**
- *Cinco permisos (`create`/`edit`/`submit`/`publish`/`withdraw`)*: sobre-granular; crea una matriz
  de permisos sin un rol que la justifique y contradice el principio que el propio cambio invoca.
- *Mantener `editorial.publish` para todo y solo agregar `editorial_curator`*: acopla autoría y
  publicación, que es el problema a resolver; un curador podría publicar.
- *Mantener el rol como `curator`*: colisiona con el vocabulario de cuenta descrito arriba.
- *Reutilizar `moderator`*: mezcla moderación de contenido existente con creación de criterio
  editorial.
- *Usar solo `admin`*: convierte cada lista nueva en un cuello de botella administrativo.

### 2. Listas editoriales propiedad de `@exploracion`, autoría en columnas nuevas

El borrador se crea con `owner_id = @exploracion` (para conservar la identidad pública y el guard
`curatorListCondition()` existente) y se registra la persona autora. La audiencia se fija en
`public`: el default de `user_list` es `followers` y, sin forzarlo, un curador podría crear una
lista oficial invisible. Se agregan a `user_list`:

- `editorial_author_id` (`UUID`, FK `app_user`, nullable).
- `editorial_submitted_at` (`TIMESTAMPTZ`, nullable).
- `editorial_submitted_by` (`UUID`, FK `app_user`, nullable).

Los curadores operan por autorización sobre las listas de la cuenta curadora, no cambiando de
sesión. `editorial_author_id` registra a quien creó la lista y **no** cambia en ediciones
posteriores (la contribución de otros editores queda en `editorial_action`); la UI lo rotula como
"creada por", no como "autoría" exclusiva.

**Alternativas descartadas:**
- *Listas propiedad de cada curador y luego transferirlas*: fragmenta la autoría, complica la
  visibilidad pública y rompe el guard de publicación.
- *Entidad nueva `editorial_list`*: duplica casi todo `user_list` (ítems, audiencia, modos de
  detalle) sin necesidad; el principio del proyecto es no crear entidad nueva cuando la existente
  encaja sin distorsión.

### 3. Estado editorial derivado de columnas, sin enum nuevo

El estado se deriva de los campos ya existentes más los nuevos:

- **Borrador**: `owner = @exploracion`, `is_official = false`, `editorial_author_id IS NOT NULL`,
  `editorial_submitted_at IS NULL`.
- **Propuesta**: igual que borrador con `editorial_submitted_at IS NOT NULL`.
- **Publicada**: `is_official = true`.
- **Retirada**: `is_official = false`, `editorial_author_id IS NOT NULL`,
  `official_withdrawn_at IS NOT NULL`.

**Rationale:** es coherente con el estilo del proyecto (estados por presencia, como
`user_list_featured` y `official_withdrawn_at`) y evita una migración con `enum` y una columna de
estado que habría que mantener sincronizada con `is_official`.

**Alternativa descartada:** un `editorial_status` (`draft|submitted|published|withdrawn`) explícito
duplicaría `is_official`/`official_withdrawn_at` y crearía dos fuentes de verdad.

### 4. Auditoría editorial en tabla propia

Se agrega `editorial_action` (`id`, `list_id`, `actor_id`, `action`, `created_at`) con
`CHECK (action IN ('create','edit','submit','publish','withdraw'))`, siguiendo el patrón de
`user_role_action` y `moderation_action`. No se reutiliza `moderation_action` porque su `CHECK` es
de moderación y conceptualmente son dominios distintos.

### 5. Endpoints separados por acción

Se reorganiza `src/app/api/admin/editorial/*`:

- `POST /api/admin/editorial/lists` → crear borrador (`editorial.author`).
- `GET  /api/admin/editorial/lists` → listar editoriales con estado (`editorial.author`).
- `PATCH /api/admin/editorial/lists/[listId]` → editar borrador (`editorial.author`).
- `POST /api/admin/editorial/lists/[listId]/submit` → proponer (`editorial.author`).
- `POST /api/admin/editorial/lists/[listId]/publish` → publicar (`editorial.publish`).
- `POST /api/admin/editorial/lists/[listId]/withdraw` → retirar (`editorial.publish`).

El `PATCH` deja de publicar (hoy lo hace) y pasa a editar. Es un **cambio de contrato interno**;
`docs/04-api/contracts.md` se actualiza en el mismo cambio.

### 6. Una sola superficie `/[locale]/admin`, permission-aware

`/[locale]/admin` pasa a exigir `editorial.author` (que `admin` también tiene) y renderiza los
controles de publicar/retirar solo con `editorial.publish`. El enlace de navegación se muestra con
`editorial.author`. `EditorialConsole` incorpora los estados borrador/propuesta además de
publicada/retirada. **No** se construye una página paralela para curadores: es la misma superficie,
con controles condicionados por permiso, igual que `/[locale]/moderation`.

### 7. Borrado de borradores editoriales en v1

`deleteList` en `src/services/lists/lists.ts` scopea por `ownerId = actor`; como el owner de las
listas editoriales es `@exploracion` (que no inicia sesión), **ningún actor** puede borrar un
borrador editorial: sin este cambio, cada borrador abandonado o duplicado queda para siempre en
`user_list` y en la consola. Por eso entra en v1, no se difiere.

Se agrega un borrado de servicio que solo aplica a listas editoriales con `is_official = false` y
`official_withdrawn_at IS NULL`, es decir **borradores nunca publicados**; excluye publicadas y
retiradas (una retirada tiene `official_withdrawn_at` poblado y conserva su historial). El gate es
`editorial.author` (el mismo que crea y edita; no se inventa `editorial.delete`) y la cascada de
`user_list_item` ya existe (`onDelete: "cascade"`).

**No se registra una acción `delete` en `editorial_action`:** el FK `list_id` es `ON DELETE CASCADE`,
así que la fila de auditoría se borraría junto con la lista y no aportaría traza. Un borrador nunca
publicado no tiene nada público que auditar, y la lista eliminada no tiene historial que preservar.
El `CHECK` de `editorial_action` se mantiene en los cinco estados del flujo.

## Risks / Trade-offs

- **`editorial.publish` deja de implicar autoría** → Mitigación: `admin` recibe también
  `editorial.author`; los tests de permisos cubren el mapeo completo y el typecheck/lint/build
  atrapan consumidores viejos.
- **Bundle de autoría demasiado amplio (`create`+`edit`+`submit`)** → Trade-off deliberado por el
  principio de ADR 0012: dividirlo es un cambio de código + tests sin migración, y se hará cuando
  aparezca un rol que necesite un subconjunto.
- **Curadores operando listas ajenas (`@exploracion`)** → Mitigación: los servicios comprueban
  permiso + pertenencia editorial (owner `@exploracion` y `editorial_author_id NOT NULL`); una lista
  personal responde `404`.
- **Edición de ítems no reutiliza los servicios personales** → Mitigación: crear variantes de
  `addItemToList`/`removeItemFromList`/`reorderListItems` que scopean por la condición editorial en
  lugar de `ownerId = actor`; se cubren con tests dedicados.
- **Edición concurrente del mismo borrador** → Trade-off aceptado: sin bloqueo optimista en esta
  versión; `updated_at` y la auditoría permiten reconstruir quién cambió qué.
- **Derivar estado de columnas nullable** → Mitigación: centralizar la derivación en un helper y
  cubrirlo con tests; documentarlo en `sql-model.md`.
- **Confusión de superficies (moderación vs curaduría)** → Mitigación: mantener
  `/[locale]/moderation` y `/[locale]/admin` separadas, como ya define la capacidad
  `permission-aware-navigation`.
- **Borrado editorial demasiado amplio** → Mitigación: el predicado exige `is_official = false` y
  `official_withdrawn_at IS NULL`, de modo que publicadas y retiradas quedan fuera; se cubre con
  tests que intentan borrar una publicada/retirada y esperan rechazo.

## Migration Plan

1. Migración SQL nueva `NNNN_editorial_curation.sql` (verificar que el número sea el siguiente libre
   al implementar — hay worktrees que podrían haber agregado migraciones): agrega las tres columnas a
   `user_list` y crea `editorial_action`; espejo en `src/db/schema.ts`.
2. Las listas oficiales preexistentes (creadas por siembra) quedan con `editorial_author_id = NULL`
   y se tratan como contenido legado; no se rompe su publicación.
3. Permisos y servicios: se agrega el rol, se define `editorial.author` y se actualizan los gates.
4. Rollback: al ser columnas/tabla aditivas y un cambio de permisos en código, revertir la app deja
   la base intacta; no hay borrado de datos.

## Open Questions

- ¿Un curador puede borrar un borrador no publicado? **Resuelto**: sí, entra en v1 con el predicado
  de la Decisión 7 (nunca publicados; no editables una vez oficiales o retirados).
- Nombre del rol: **Resuelto** como `editorial_curator`, para no colisionar con el vocabulario de la
  cuenta curadora (`curatorListCondition`, `CURATOR_USERNAME`).

Resuelto en esta iteración: los curadores ven **todos** los borradores editoriales (espacio
compartido de un equipo editorial pequeño); no se agrega visibilidad por autor en v1.
