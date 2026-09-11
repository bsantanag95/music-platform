## Why

Hoy el único rol capaz de tocar el contenido editorial es `admin` (permiso único
`editorial.publish`), y las listas oficiales solo pueden ser listas de la cuenta curadora
`@exploracion`, mantenidas por siembra. Cuando la app esté en producción y necesite cada vez más
listas para la experiencia de usuario, no queremos que cada lista nueva exija un administrador ni
mezclar moderación con curaduría. Hace falta desacoplar **quién crea el contenido** de **quién tiene
autoridad para publicarlo oficialmente**.

## What Changes

- Nuevo rol acumulable `editorial_curator`: crea y mantiene listas editoriales, pero no publica.
- Se reemplaza el permiso único `editorial.publish` por **dos bundles**:
  - `editorial.author` — crear, editar y proponer.
  - `editorial.publish` — publicar y retirar.
- Flujo editorial explícito: **borrador → propuesta → publicación → retirada**, con autoría y
  auditoría por actor.
- Los curadores crean, editan y proponen listas editoriales **bajo la identidad `@exploracion`**,
  dejando registrada la autoría de la persona; la cuenta pública no cambia. La audiencia de una
  lista editorial se fuerza a `public`.
- `admin` conserva `editorial.publish` y `platform.manage_roles`, y además tiene `editorial.author`.
- La publicación oficial sigue restringida a listas de `@exploracion`; las listas personales de
  otros usuarios siguen sin ser publicables.

**BREAKING** (interno): `editorial.publish` deja de representar "gestionar todo lo editorial" y se
acota a publicar/retirar. La autoría se muda al permiso nuevo `editorial.author`; cualquier
consumidor que comprobara `editorial.publish` para crear o editar debe migrar a `editorial.author`.

## Capabilities

### New Capabilities
- `editorial-curation`: rol `editorial_curator` y flujo de autoría editorial (borrador → propuesta →
  publicación → retirada) sobre listas de la identidad `@exploracion`, con autoría y auditoría,
  incluyendo el borrado de borradores nunca publicados.

### Modified Capabilities
- `platform-roles`: se agrega el rol acumulable `editorial_curator` y el permiso `editorial.author`;
  quedan dos bundles editoriales (`editorial.author`, `editorial.publish`).
- `official-editorial-content`: la publicación y la retirada se reservan a `editorial.publish`
  (admin), y el contenido puede ser autorado por curadores conservando su identidad pública.

## Impact

- **Autorización:** `src/services/auth/permissions.ts`, `src/services/auth/roles.ts`
  (`PlatformRole` pasa a incluir `editorial_curator`).
- **Servicios:** `src/services/lists/editorial.ts` y un servicio de autoría editorial
  (crear/editar/proponer/borrar borradores nunca publicados), con variantes de ítems que scopean por
  la condición editorial; la publicación/retirada existente cambia de permiso.
- **API:** `src/app/api/admin/editorial/*` — nuevos endpoints de autoría y gate de publicación por
  `editorial.publish`.
- **UI:** una sola superficie `/[locale]/admin` (y `EditorialConsole.tsx`) que renderiza estados
  borrador/propuesta/publicada/retirada y controles de publicación según permiso; no se crea una
  página paralela para curadores.
- **Datos:** `src/db/schema.ts` + nueva migración `NNNN_editorial_curation.sql` (autoría y
  propuesta sobre `user_list`, tabla de auditoría `editorial_action`).
- **Documentación:** `docs/01-domain/domain-model.md`, `docs/01-domain/business-rules.md`,
  `docs/02-architecture/auth.md`, `docs/03-data/sql-model.md`,
  `docs/00-product/product_philosophy.md` y un ADR nuevo que sustituye la consecuencia de
  ADR 0012 ("no se introduce un rol editorial separado").
- **Pruebas:** permisos/authorization, servicio editorial, rutas admin y consola.

## Non-Goals

- Listas generadas automáticamente por el sistema o algoritmos (siguen siendo curaduría humana).
- Un panel web para asignar/revocar roles (la asignación sigue siendo operación interna).
- Permitir que listas personales de cualquier usuario se conviertan en oficiales.
- Edición del catálogo de MusicBrainz por parte de curadores o administradores.
