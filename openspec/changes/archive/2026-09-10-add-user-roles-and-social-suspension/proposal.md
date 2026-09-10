## Why

La plataforma todavía trata a todas las cuentas autenticadas como equivalentes y no puede
delegar moderación ni publicar contenido oficial de forma segura. Hace falta introducir roles
acumulables y una suspensión social temporal que limite la actividad pública sin quitar al usuario
el acceso a su cuenta y a sus datos personales.

## What Changes

- Incorporar roles acumulables `user`, `moderator` y `admin`.
- Permitir que moderadores revisen reportes, moderen comentarios/reseñas y apliquen sanciones
  temporales limitadas sobre la actividad social.
- Permitir que administradores gestionen roles mediante operaciones internas inicialmente.
- Permitir que administradores publiquen listas y contenido editorial oficial.
- Añadir una suspensión social temporal que bloquee nuevas acciones públicas/sociales, pero permita
  iniciar sesión, leer contenido y conservar el acceso personal.
- Aplicar la restricción en backend a comentarios, reseñas, valoraciones que afecten superficies
  públicas, diario/feed, seguimientos, listas visibles, guardados sociales y cambios de audiencia.
- Registrar las acciones de moderación y las suspensiones con responsable, motivo y vigencia.
- **No** añadir administración de credenciales, identidades OAuth, email, username o borrado de
  cuentas para moderadores.
- **No** permitir edición manual del catálogo de MusicBrainz como parte de este cambio.

### Goals

- Proteger las superficies sociales sin convertir una suspensión en un bloqueo total de cuenta.
- Separar claramente permisos de moderación, administración y navegación personal.
- Preparar la publicación oficial de listas sin mezclarla con las listas personales.

### Non-Goals

- Panel web para asignar roles; inicialmente se usarán operaciones internas.
- Sistema avanzado de apelaciones, escalado automático o detección automática de abuso.
- Suspensión de lectura, acceso al perfil propio o acceso al diario y colección privados.
- Gestión completa de cuentas o edición humana del catálogo musical.

## Capabilities

### New Capabilities

- `platform-roles`: roles acumulables, permisos y operaciones internas de asignación.
- `content-moderation`: reportes, moderación de comentarios/reseñas, auditoría y acciones limitadas.
- `social-suspension`: suspensión temporal de actividad pública/social con acceso personal conservado.
- `official-editorial-content`: publicación administrativa de listas y contenido oficial distinguible.

### Modified Capabilities

No se modifica una especificación existente directamente. Las nuevas capacidades definen las
reglas transversales que deben aplicar las mutaciones de reseñas, listas, diario, feed y
seguimientos existentes.

## Impact

- Base de datos: nuevas migraciones SQL para roles, restricciones temporales, reportes y auditoría;
  actualización sincronizada de `src/db/schema.ts` y `docs/03-data/sql-model.md`.
- Autenticación/autorización: nuevos permisos y resolución de restricciones en
  `src/services/auth/`, aplicados por los route handlers y servicios de mutación.
- API: nuevos contratos para reportes, acciones de moderación y errores de permiso/suspensión;
  las rutas sociales existentes conservarán sus formas salvo los nuevos rechazos autorizados.
- Frontend: superficies separadas para moderación/administración; `OwnerHubPanel` seguirá siendo
  navegación personal y no se convertirá en panel administrativo.
- Documentación: actualización de modelo de dominio, reglas de negocio, autenticación, contratos
  API y un ADR de autorización/moderación.
- Pruebas: matrices de permisos por rol, expiración de suspensiones, lectura durante suspensión y
  bloqueo de cada mutación social afectada.
