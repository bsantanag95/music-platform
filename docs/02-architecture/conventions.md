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

**Decisión confirmada** — ver ADR 0009. `rating` y `comment` usan borrado físico (`DELETE`
real), no soft-delete. Ningún query ni migración nueva debe agregar una columna `deleted_at`
a estas tablas sin reabrir el ADR.

## Autenticación

**Decisión confirmada** — ver ADR 0008 y `02-architecture/auth.md` para el detalle completo.
Resumen normativo:

- Sesiones server-side con token opaco en cookie `httpOnly`/`secure`/`sameSite=lax`, nunca JWT.
- Contraseñas con Argon2id, nunca un hash débil ni texto plano.
- `app_user.password_hash` es nullable — deja espacio para OAuth futuro sin migración destructiva.
- El `user_id` de toda mutación de `rating`/`comment` sale de la sesión, nunca del body/params.

## Errores HTTP

- Aún no definido en detalle — se documentará en `04-api/errors.md` cuando se escriba la especificación de API en la Fase 1/2.

## Internacionalización (i18n)

**Decisión confirmada** — ver ADR 0007 y `02-architecture/i18n.md` para el detalle completo de
la arquitectura. Resumen normativo para uso diario:

- **Rutas de página**: slugs neutros en inglés, iguales para todos los locales (`/search`, no
  `/buscar`; `/artist/[id]`, no `/artista/[id]`). El locale vive exclusivamente como segmento de
  ruta (`src/app/[locale]/...`), nunca traducido en el slug mismo. Esto corrige la propuesta
  original de `03-best-practices.md`, que sugería slugs en español antes de que se confirmara
  soporte multi-idioma.
- **Rutas de API**: sin cambios — siguen en inglés (`/api/catalog/...`), como ya estaba definido.
- **Catálogos de mensajes**: `messages/{locale}/{namespace}.json`, namespaces por dominio
  (`common`, `catalog`, `errors`), nunca por página. Ver `i18n.md` §6 para la estructura completa.
- **`components/ui/`** nunca importa `useTranslations` ni conoce el locale activo — recibe texto
  ya traducido vía props requeridas (nunca defaults hardcodeados). Ver `i18n.md` para el
  razonamiento.
- **Navegación programática** (`useRouter`, `Link`) siempre se importa desde
  `src/i18n/navigation.ts`, nunca directo de `next/navigation` — de lo contrario se pierde el
  prefijo de locale al navegar.
- **Datos del catálogo musical** (nombre de artista, título de álbum/canción, biografía) nunca
  se traducen — se muestran tal cual llegan de MusicBrainz. i18n aplica solo al _chrome_ de la
  interfaz.

## Principio general

Toda convención nueva que surja durante el desarrollo se agrega a este documento en el momento en que se decide, no después — así ninguna herramienta de IA ni colaborador humano tiene que inferir el estilo del proyecto leyendo código existente.
