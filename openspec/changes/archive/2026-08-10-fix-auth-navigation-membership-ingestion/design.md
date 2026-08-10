## Context

La autenticación local y las sesiones server-side ya existen, pero el Header solo muestra acciones
secundarias poco visibles para usuarios anónimos, no ofrece logout y las rutas de login/registro no
protegen el estado autenticado. El catálogo también tiene la tabla `membership` y consultas de
lectura, pero la ingesta actual de artistas solo sincroniza discografía y créditos: nunca solicita
relaciones `artist-rels` a MusicBrainz.

El cambio cruza Next.js, el cliente MusicBrainz, la ingesta de catálogo y el esquema PostgreSQL.
Debe respetar ADR 0005 para migraciones SQL manuales, ADR 0008 para sesiones, ADR 0010 para
identidades externas y la regla de que las llamadas externas de datos pasan por el cliente
MusicBrainz centralizado.

## Goals / Non-Goals

**Goals:**

- Hacer navegables y visibles login, registro y logout.
- Redirigir el usuario autenticado fuera de las páginas de autenticación.
- Ingerir membresías desde `artist-rels` una sola vez por artista sincronizado.
- Mantener la lectura de memberships exclusivamente en PostgreSQL.
- Garantizar idempotencia y unicidad de la relación persona/grupo.

**Non-Goals:**

- Implementar Google u otro OAuth/OIDC.
- Modelar varias filas históricas para la misma pareja persona/grupo.
- Ingerir relaciones que no sean `member of band`.
- Cambiar la sesión server-side o la semántica de ratings/comentarios.

## Decisions

### Navegación de autenticación

- El Header mostrará enlaces/acciones primarias localizadas para login y registro cuando no haya
  sesión.
- Con sesión activa mostrará el usuario y un botón de logout que llama al endpoint existente,
  limpia el estado y refresca la ruta.
- Las páginas `/auth/login` y `/auth/register` resolverán la sesión en Server Component y usarán
  `redirect` locale-aware hacia `/search` si ya existe una sesión.
- Los textos nuevos vivirán en el namespace `common` o `auth` según su dominio; los errores se
  resolverán desde `errors`.

### Modelo de sincronización

- Añadir `artist.memberships_synced_at` nullable en una migración nueva.
- `NULL` significa que se debe intentar sincronizar; una fecha significa que la sincronización
  terminó correctamente y el perfil puede leer solo desde la base.
- Un error de MusicBrainz no marca la sincronización como completa.

### MusicBrainz

- Añadir tipos `MBArtistRelation`/`MBArtistDetail` y un método separado
  `getArtistWithRelations(mbid)` en `src/services/musicbrainz/client.ts`.
- El método usará `/artist/{mbid}?inc=artist-rels`, pero siempre a través de `mbFetch`, respetando
  User-Agent y la cola de rate limit.
- Solo se aceptarán relaciones `type = "member of band"` cuyo target sea un artista.
- Se identificarán los lados por tipo confirmado (`Person` frente a `Group`, `Orchestra` o
  `Choir`), no solo por `direction`.
- `attributes` se consolidará en `role`; fechas completas se mapearán y fechas parciales se
  guardarán como `NULL` para no inventar precisión.

### Upsert de memberships

- Añadir `UNIQUE(person_id, group_id)` y usar upsert para evitar duplicados bajo concurrencia.
- Si MusicBrainz devuelve varias relaciones para la misma pareja, se consolidarán los roles en un
  texto y se conservará el intervalo más amplio representable por `joined_on`/`left_on`.
- Los artistas relacionados se crearán o actualizarán con tipo confirmado antes de insertar la
  membership, para satisfacer el trigger `trg_membership_types`.
- La función de ingesta será separada de `getArtistMemberships()`: la primera puede llamar a
  MusicBrainz; la segunda solo ejecuta SQL.

### Orden del flujo

1. Resolver/enriquecer el artista.
2. Ejecutar `ensureArtistMemberships()` si `memberships_synced_at` es `NULL`.
3. Leer memberships desde PostgreSQL.
4. Resolver/componer discografía propia y de grupos.
5. Responder la página o endpoint.

Esto evita que una lectura paralela observe memberships antes de finalizar la sincronización.

## Risks / Trade-offs

- [La primera visita añade una llamada MusicBrainz] → usar el cache flag y no repetirla en perfiles
  ya sincronizados.
- [Tipos ausentes o relaciones inesperadas] → filtrar estrictamente y no insertar filas que el
  trigger no pueda validar.
- [Fechas parciales no caben en DATE] → guardar `NULL` y no presentar una fecha falsa.
- [Varias relaciones por pareja] → consolidar roles e intervalo, documentando la simplificación.
- [Requests concurrentes] → índice único y upsert SQL como garantía definitiva.
- [OAuth aún no disponible] → no añadir callbacks ni secretos; solo se modifica navegación local.

## Migration Plan

1. Crear una migración SQL nueva para `memberships_synced_at` y el índice único de membership.
2. Ejecutar la migración en scratch antes de probar la ingesta.
3. Implementar tipos/cliente y tests mockeados de `artist-rels`.
4. Implementar ingesta y actualizar perfiles/endpoint.
5. Ejecutar smoke tests contra scratch con Pink Floyd/Roger Waters y verificar que una segunda
   visita no llama a MusicBrainz.
6. Si la migración falla antes de ser aplicada en producción, corregir el archivo nuevo. Una
   migración aplicada no se edita; cualquier corrección se realiza en otro archivo.

## Open Questions

- La fuente de MusicBrainz puede devolver `Orchestra` o `Choir`; se tratarán como grupos según la
  decisión documentada, sin crear tipos nuevos de artista.
- La validación manual de logout y redirects requiere un navegador con HTTPS o una configuración
  local que acepte cookies `Secure`.
