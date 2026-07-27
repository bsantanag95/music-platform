# Convenciones — music-platform

## Nombres

- **Base de datos**: nombres de tablas y columnas en `snake_case`, en singular (`artist`, no `artists`; `release_group`, no `release_groups`).
- **TypeScript/frontend**: `camelCase` para variables y funciones, `PascalCase` para componentes y tipos.
- **Rutas de API**: `kebab-case` (`/api/release-group/:id`).
- **Archivos de documentación**: `kebab-case.md`.

## Identificadores

- Todas las entidades usan `UUID` como clave primaria, no IDs autoincrementales (ver ADR correspondiente).
- Las entidades sincronizadas desde MusicBrainz guardan además su `mbid` (UUID de MusicBrainz) como columna separada y única, para poder hacer upsert idempotente sin duplicar registros.

## Timestamps

- Toda tabla con datos generados por usuarios incluye `created_at` (`TIMESTAMPTZ`, default `now()`).
- Las tablas mutables (ej. `rating`) incluyen además `updated_at`, mantenido por trigger, nunca actualizado manualmente desde la aplicación.

## Borrado

- Aún no definido si se usará soft delete (columna `deleted_at`) o borrado físico — pendiente de decidir antes de la Fase 4, cuando el borrado de valoraciones/comentarios sea una funcionalidad real.

## Errores HTTP

- Aún no definido en detalle — se documentará en `04-api/errors.md` cuando se escriba la especificación de API en la Fase 1/2.

## Principio general

Toda convención nueva que surja durante el desarrollo se agrega a este documento en el momento en que se decide, no después — así ninguna herramienta de IA ni colaborador humano tiene que inferir el estilo del proyecto leyendo código existente.
