## Why

La autenticación local funciona técnicamente, pero el recorrido de usuario no ofrece acciones
claras para iniciar sesión, registrarse o cerrar sesión, y permite que un usuario autenticado vuelva
a las páginas de auth. Además, la tabla `membership` permanece vacía porque el catálogo solo lee
relaciones locales y nunca ingiere las relaciones `artist-rels` de MusicBrainz.

## Goals

- Hacer visibles y consistentes las acciones de login, registro y logout.
- Redirigir a usuarios autenticados fuera de las páginas de login/registro.
- Ingerir memberships persona↔grupo desde MusicBrainz de forma idempotente.
- Mantener el path de lectura cacheado sin llamadas externas innecesarias.
- Preservar la integridad SQL y evitar duplicados de memberships.

## Non-Goals

- Implementar Google u otros proveedores OAuth/OIDC.
- Cambiar el modelo general de sesiones, ratings o comentarios ya implementado.
- Ingerir relaciones musicales distintas de `member of band`.
- Añadir múltiples filas históricas para la misma pareja persona/grupo.

## What Changes

- Mejorar la UI de autenticación con acciones primarias visibles.
- Añadir logout visible conectado al endpoint existente y refresco del estado global.
- Redirigir usuarios autenticados desde `/auth/login` y `/auth/register`.
- Extender el cliente MusicBrainz con lookup de artista y `inc=artist-rels`.
- Añadir sincronización cacheada de memberships durante la ingesta del artista.
- Añadir `memberships_synced_at` mediante una migración SQL nueva.
- Añadir unicidad SQL para `(person_id, group_id)` y upsert idempotente.
- Actualizar contratos, documentación, tests y smoke tests.

## Capabilities

### New Capabilities

- `auth-navigation`: acciones visibles, logout y protección de las páginas de autenticación.
- `membership-ingestion`: sincronización idempotente de relaciones persona/grupo desde MusicBrainz.

### Modified Capabilities

- `catalog-artist`: el perfil conserva la lectura local de memberships y recibe relaciones ingeridas
  bajo demanda antes de componer la discografía.

## Impact

- Frontend: `Header`, páginas de auth, mensajes localizados y tests de navegación.
- Backend: servicio MusicBrainz, ingesta de artistas, servicio de memberships y endpoint de artista.
- Base de datos: nueva migración para estado de sincronización y unicidad de memberships.
- API externa: nueva consulta `artist/{mbid}?inc=artist-rels`, siempre a través de `client.ts`.
- Documentación: reglas de dominio, modelo SQL, contratos, walkthrough y riesgos de ingesta.
- Validación: tests unitarios, integración con Postgres scratch y smoke Pink Floyd/Roger Waters.
