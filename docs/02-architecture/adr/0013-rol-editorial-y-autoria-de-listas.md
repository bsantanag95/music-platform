# ADR 0013 — Rol de curador editorial y autoría de listas

## Estado

Aceptado

## Contexto

ADR 0012 introdujo los roles `moderator` y `admin` y dejó explícito que "no se introduce un rol
editorial separado hasta que exista una necesidad operativa real". La publicación de listas
oficiales depende de un único permiso (`editorial.publish`) y opera solo sobre listas de la cuenta
curadora `@exploracion`, que no puede iniciar sesión. Eso acopla **crear** el contenido editorial con
**publicarlo**: cualquier persona que mantenga listas debe ser administradora y asumir la autoridad
de publicar como la plataforma. Con la app en producción y más listas por mantener, esa necesidad
operativa ya existe.

## Decisión

- Se agrega el rol acumulable `editorial_curator`, separado de `moderator` y `admin`.
- Los permisos editoriales son **dos bundles**, no uno por acción:
  - `editorial.author` — crear, editar y proponer listas editoriales.
  - `editorial.publish` — publicar y retirar listas editoriales.
- `editorial_curator` recibe solo `editorial.author`; `admin` recibe ambos y conserva
  `platform.manage_roles`. `moderator` no cambia.
- Las listas editoriales siguen siendo propiedad de `@exploracion`; `user_list.editorial_author_id`
  registra a la persona que las creó y `editorial_submitted_at`/`editorial_submitted_by` la
  propuesta. La identidad pública no cambia.
- El estado editorial se deriva de las columnas (`draft`/`submitted`/`published`/`withdrawn`), sin
  un `enum` de estado paralelo a `is_official`/`official_withdrawn_at`.
- `editorial_action` audita creación, edición, propuesta, publicación y retirada. Los borradores
  nunca publicados pueden borrarse (gate `editorial.author`); publicados y retirados no.
- La autoría de la persona no se expone en superficies públicas.

## Alternativas descartadas

- **Mantener `editorial.publish` para todo y solo agregar el rol**: no resuelve el acoplamiento
  autoría/publicación.
- **Cinco permisos (`create`/`edit`/`submit`/`publish`/`withdraw`)**: sobre-granular. Ningún rol usa
  un subconjunto; dividir un bundle más adelante es un cambio de código + tests, sin migración.
- **Listas propiedad de cada curador con transferencia posterior**: fragmenta la autoría, complica la
  visibilidad y rompe el guard de publicación sobre `@exploracion`.
- **Entidad `editorial_list` separada**: duplica casi todo `user_list` sin necesidad.
- **Nombrar el rol `curator`**: colisiona con el vocabulario de la cuenta curadora
  (`CURATOR_USERNAME`, `curatorListCondition()`, `curatorOwnerIds()`). Se reserva `curator*` para la
  identidad-cuenta.

## Consecuencias

- `editorial.publish` deja de representar "gestionar todo lo editorial" y se acota a publicar/retirar;
  los consumidores que lo usaban para crear/editar migran a `editorial.author`.
- La asignación de roles sigue siendo una operación interna, sin panel web.
- La separación de permisos (y de superficies moderación ↔ curaduría) mantiene a la moderación fuera
  de las decisiones editoriales.
- El catálogo de MusicBrainz continúa siendo de solo lectura para curadores y administradores.
